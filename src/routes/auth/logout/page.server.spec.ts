import { isRedirect } from '@sveltejs/kit';
import { describe, expect, it, vi } from 'vitest';
import { testEvent, testLocals, TEST_JWT } from '$lib/testing/server';
import { actions, load } from './+page.server';

type LoadEvent = Parameters<typeof load>[0];
type ActionEvent = Parameters<(typeof actions)['default']>[0];

async function redirectOf(run: () => unknown) {
	const thrown = await Promise.resolve()
		.then(run)
		.then(
			() => null,
			(error: unknown) => error
		);
	if (!isRedirect(thrown)) throw new Error('expected a redirect');
	return thrown;
}

function cookieJar() {
	return {
		getAll: vi.fn(() => [
			{ name: 'jwt', value: TEST_JWT },
			{ name: 'supabase_recovery_token', value: 'r' },
			{ name: 'PARAGLIDE_LOCALE', value: 'ja' }
		]),
		delete: vi.fn()
	};
}

describe('logout load (GET)', () => {
	it('changes nothing: a signed-in visitor gets the "Log out" button', async () => {
		const cookies = cookieJar();
		const locals = testLocals();

		await expect(
			load(testEvent<LoadEvent>({ url: 'http://localhost/auth/logout', locals, cookies }))
		).resolves.toEqual({});
		expect(cookies.delete).not.toHaveBeenCalled();
		expect(locals.services.supabaseAuth.signOut).not.toHaveBeenCalled();
	});

	it('sends a visitor who is not signed in to login, keeping the redirect target', async () => {
		const redirect = await redirectOf(() =>
			load(
				testEvent<LoadEvent>({
					url: 'http://localhost/auth/logout?redirect=%2Frules',
					locals: testLocals({ jwtString: null })
				})
			)
		);

		expect(redirect.status).toBe(303);
		expect(redirect.location).toBe('/auth/login?redirect=%2Frules');
	});
});

describe('logout action (POST)', () => {
	it('ends the Supabase session, clears every cookie but the language, and goes to login', async () => {
		const cookies = cookieJar();
		const locals = testLocals();
		locals.services.supabaseAuth.signOut.mockResolvedValue(undefined);

		const redirect = await redirectOf(() =>
			actions.default(
				testEvent<ActionEvent>({
					url: 'http://localhost/auth/logout?redirect=%2Frules',
					locals,
					cookies
				})
			)
		);

		expect(locals.services.supabaseAuth.signOut).toHaveBeenCalledWith(TEST_JWT);
		expect(cookies.delete).toHaveBeenCalledWith('jwt', { path: '/' });
		expect(cookies.delete).toHaveBeenCalledWith('supabase_recovery_token', { path: '/' });
		expect(cookies.delete).not.toHaveBeenCalledWith('PARAGLIDE_LOCALE', expect.anything());
		expect(redirect.status).toBe(303);
		expect(redirect.location).toBe('/auth/login?redirect=%2Frules&reason=signed-out');
	});

	it('still clears the cookies without a session to end', async () => {
		const cookies = cookieJar();
		const locals = testLocals({ jwtString: null });

		const redirect = await redirectOf(() =>
			actions.default(
				testEvent<ActionEvent>({ url: 'http://localhost/auth/logout', locals, cookies })
			)
		);

		expect(locals.services.supabaseAuth.signOut).not.toHaveBeenCalled();
		expect(cookies.delete).toHaveBeenCalledWith('jwt', { path: '/' });
		expect(redirect.location).toBe('/auth/login?reason=signed-out');
	});
});
