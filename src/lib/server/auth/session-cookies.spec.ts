import type { Cookies } from '@sveltejs/kit';
import { describe, expect, it, vi } from 'vitest';
import {
	REFRESH_COOKIE,
	REFRESH_COOKIE_MAX_AGE_SECONDS,
	SESSION_COOKIE,
	setSessionCookies
} from './session-cookies';

const cookieJar = () =>
	({ set: vi.fn() }) as unknown as Cookies & { set: ReturnType<typeof vi.fn> };
const inSeconds = (seconds: number) => new Date(Date.now() + seconds * 1000);

describe('setSessionCookies', () => {
	it('stores both tokens httpOnly: the access token for its lifetime, the refresh token for 30 days', () => {
		const cookies = cookieJar();

		const stored = setSessionCookies(
			cookies,
			{ accessToken: 'access', refreshToken: 'refresh', expiresAt: inSeconds(3600) },
			true
		);

		expect(stored).toBe(true);
		const options = { path: '/', httpOnly: true, secure: true, sameSite: 'lax' };
		expect(cookies.set).toHaveBeenCalledWith(SESSION_COOKIE, 'access', {
			...options,
			maxAge: expect.closeTo(3600, 0)
		});
		expect(cookies.set).toHaveBeenCalledWith(REFRESH_COOKIE, 'refresh', {
			...options,
			maxAge: REFRESH_COOKIE_MAX_AGE_SECONDS
		});
	});

	it('stores only the access token when the API sent no refresh token', () => {
		const cookies = cookieJar();

		setSessionCookies(cookies, { accessToken: 'access', expiresAt: inSeconds(60) }, false);

		expect(cookies.set).toHaveBeenCalledTimes(1);
		expect(cookies.set).toHaveBeenCalledWith(
			SESSION_COOKIE,
			'access',
			expect.objectContaining({ secure: false })
		);
	});

	it.each([
		['already expired', inSeconds(-5)],
		['an invalid date', new Date('nope')]
	])('stores nothing when the session is %s', (_, expiresAt) => {
		const cookies = cookieJar();

		expect(
			setSessionCookies(cookies, { accessToken: 'a', refreshToken: 'r', expiresAt }, true)
		).toBe(false);
		expect(cookies.set).not.toHaveBeenCalled();
	});
});
