import { isRedirect } from '@sveltejs/kit';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { m } from '$lib/paraglide/messages.js';
import { jsonResponse } from '$lib/testing/http';
import { formRequest, testEvent, testLocals, type TestLocals } from '$lib/testing/server';
import { actions, load } from './+page.server';

type LoadEvent = Parameters<typeof load>[0];
type ActionEvent = Parameters<(typeof actions)['default']>[0];

function cookieJar(token?: string) {
	return { get: vi.fn(() => token), delete: vi.fn() };
}

async function redirectLocation(run: () => unknown) {
	const thrown = await Promise.resolve()
		.then(run)
		.then(
			() => null,
			(error: unknown) => error
		);
	if (!isRedirect(thrown)) throw new Error('expected a redirect');
	return thrown.location;
}

function act(
	locals: TestLocals,
	cookies: ReturnType<typeof cookieJar>,
	fields: Record<string, string>
) {
	return actions.default(testEvent<ActionEvent>({ locals, cookies, request: formRequest(fields) }));
}

const STRONG = 'Secret1!';

afterEach(() => {
	vi.restoreAllMocks();
});

describe('update-password load', () => {
	it('needs the recovery token from the email link', async () => {
		await expect(load(testEvent<LoadEvent>({ cookies: cookieJar('recovery') }))).resolves.toEqual(
			{}
		);
		expect(await redirectLocation(() => load(testEvent<LoadEvent>({ cookies: cookieJar() })))).toBe(
			'/auth/login?reason=auth-required'
		);
	});
});

describe('update-password action', () => {
	it('sets the new password with the recovery token, clears it and goes to login', async () => {
		const locals = testLocals({ jwtString: null });
		locals.services.supabaseAuth.updatePasswordWithRecoveryToken.mockResolvedValue(
			jsonResponse({ id: 'user-1' })
		);
		const cookies = cookieJar('recovery');

		expect(
			await redirectLocation(() =>
				act(locals, cookies, { password: STRONG, confirmPassword: STRONG })
			)
		).toBe('/auth/login?reason=password-reset');
		expect(locals.services.supabaseAuth.updatePasswordWithRecoveryToken).toHaveBeenCalledWith(
			'recovery',
			STRONG
		);
		expect(cookies.delete).toHaveBeenCalledWith('supabase_recovery_token', { path: '/' });
	});

	it('enforces the same password policy as the form, with localized messages', async () => {
		const locals = testLocals({ jwtString: null });

		// Long enough for the old 6-character check, but missing upper case, a symbol…
		for (const weak of ['123', 'secret1', 'Secret12', '']) {
			await expect(
				act(locals, cookieJar('recovery'), { password: weak, confirmPassword: weak })
			).resolves.toMatchObject({ status: 400, data: { message: m.auth_password_too_weak() } });
		}
		await expect(
			act(locals, cookieJar('recovery'), { password: STRONG, confirmPassword: `${STRONG}x` })
		).resolves.toMatchObject({
			status: 400,
			data: { message: m.auth_passwords_do_not_match_plain() }
		});
		expect(locals.services.supabaseAuth.updatePasswordWithRecoveryToken).not.toHaveBeenCalled();
	});

	it('reports an expired link', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		const locals = testLocals({ jwtString: null });
		locals.services.supabaseAuth.updatePasswordWithRecoveryToken.mockResolvedValue(
			new Response('not json', { status: 401 })
		);

		await expect(
			act(locals, cookieJar('recovery'), { password: STRONG, confirmPassword: STRONG })
		).resolves.toMatchObject({
			status: 500,
			data: { message: m.auth_update_password_failed() }
		});
	});

	it('sends a visitor without a recovery token to login', async () => {
		expect(
			await redirectLocation(() =>
				act(testLocals({ jwtString: null }), cookieJar(), { password: 'secret1' })
			)
		).toBe('/auth/login?reason=auth-required');
	});
});
