import { isRedirect } from '@sveltejs/kit';
import { describe, expect, it, vi } from 'vitest';
import { testEvent, testLocals, type TestLocals } from '$lib/testing/server';
import { GET } from './+server';

type Event = Parameters<typeof GET>[0];

async function run(url: string, locals: TestLocals, cookies = { set: vi.fn() }) {
	const thrown = await Promise.resolve(GET(testEvent<Event>({ url, locals, cookies }))).catch(
		(error: unknown) => error
	);
	if (!isRedirect(thrown)) throw new Error('expected a redirect');
	return { location: thrown.location, cookies };
}

function verified(session: { access_token: string } | null, error: unknown = null) {
	const locals = testLocals({ jwtString: null });
	locals.services.supabaseAuth.verifyOtp.mockResolvedValue({ data: { session }, error } as never);
	return locals;
}

describe('auth confirm endpoint', () => {
	it('verifies a recovery link, keeps its token for the password page, and continues', async () => {
		const locals = verified({ access_token: 'recovery-token' });

		const { location, cookies } = await run(
			'https://app.test/auth/confirm?token_hash=h&type=recovery&next=%2Fauth%2Fupdate-password',
			locals
		);

		expect(location).toBe('/auth/update-password');
		expect(locals.services.supabaseAuth.verifyOtp).toHaveBeenCalledWith({
			type: 'recovery',
			token_hash: 'h'
		});
		expect(cookies.set).toHaveBeenCalledWith('supabase_recovery_token', 'recovery-token', {
			path: '/',
			httpOnly: true,
			secure: true,
			sameSite: 'lax',
			maxAge: 600
		});
	});

	it('continues to login after a confirmed signup, without a recovery cookie', async () => {
		const { location, cookies } = await run(
			'http://localhost/auth/confirm?token_hash=h&type=signup',
			verified({ access_token: 'session' })
		);

		expect(location).toBe('/auth/login');
		expect(cookies.set).not.toHaveBeenCalled();
	});

	it('continues to a same-site absolute `next` as a path', async () => {
		const { location } = await run(
			'https://app.test/auth/confirm?token_hash=h&type=signup&next=https%3A%2F%2Fapp.test%2Fsettings%3Ftab%3D1',
			verified({ access_token: 'session' })
		);

		expect(location).toBe('/settings?tab=1');
	});

	it('never redirects a verified link to another site (open redirect)', async () => {
		for (const next of [
			'https://evil.example/phish',
			'//evil.example/phish',
			'/\\evil.example/phish',
			'javascript:alert(1)'
		]) {
			const { location } = await run(
				`https://app.test/auth/confirm?token_hash=h&type=signup&next=${encodeURIComponent(next)}`,
				verified({ access_token: 'session' })
			);

			expect(location).toBe('/auth/login');
		}
	});

	it('sends invalid, failed or incomplete links to login', async () => {
		const failed = await run(
			'http://localhost/auth/confirm?token_hash=h&type=signup',
			verified(null, { message: 'expired' })
		);
		const noSession = await run(
			'http://localhost/auth/confirm?token_hash=h&type=signup',
			verified(null)
		);
		const missing = testLocals({ jwtString: null });
		const incomplete = await run('http://localhost/auth/confirm?type=signup', missing);

		for (const { location } of [failed, noSession, incomplete]) {
			expect(location).toBe('/auth/login?reason=auth-required');
		}
		expect(missing.services.supabaseAuth.verifyOtp).not.toHaveBeenCalled();
	});
});
