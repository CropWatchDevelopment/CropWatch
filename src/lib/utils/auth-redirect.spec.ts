import { describe, expect, it } from 'vitest';
import {
	LOGIN_REASONS,
	buildLoginPath,
	buildLogoutPath,
	readLoginReason,
	readRedirectPath,
	readRedirectPathFromUrl,
	sanitizeRedirectPath,
	withRedirectParam,
	type LoginReason
} from './auth-redirect';

describe('sanitizeRedirectPath', () => {
	it('keeps internal paths with search and hash fragments', () => {
		expect(sanitizeRedirectPath('/settings?tab=profile#security')).toBe(
			'/settings?tab=profile#security'
		);
	});

	it('rejects external redirects and auth loops', () => {
		expect(sanitizeRedirectPath('https://example.com/steal', '/')).toBe('/');
		expect(sanitizeRedirectPath('/auth/login?redirect=/settings', '/')).toBe('/');
		expect(sanitizeRedirectPath('/auth/logout', '/')).toBe('/');
	});

	it('never sends the user back to the terms page they are accepting', () => {
		expect(sanitizeRedirectPath('/auth/accept-terms?redirect=/', '/home')).toBe('/home');
	});

	it('falls back to the root path by default', () => {
		expect(sanitizeRedirectPath(null)).toBe('/');
		expect(sanitizeRedirectPath(undefined)).toBe('/');
		expect(sanitizeRedirectPath('https://example.com')).toBe('/');
	});

	it('falls back for missing, blank and protocol-relative values', () => {
		expect(sanitizeRedirectPath(null, '/fallback')).toBe('/fallback');
		expect(sanitizeRedirectPath(undefined, '/fallback')).toBe('/fallback');
		expect(sanitizeRedirectPath('', '/fallback')).toBe('/fallback');
		expect(sanitizeRedirectPath('   ', '/fallback')).toBe('/fallback');
		expect(sanitizeRedirectPath('//example.com/steal', '/fallback')).toBe('/fallback');
	});

	it('rejects other schemes and backslash tricks that leave the app', () => {
		expect(sanitizeRedirectPath('javascript:alert(1)', '/fallback')).toBe('/fallback');
		expect(sanitizeRedirectPath('/\\example.com', '/fallback')).toBe('/fallback');
	});

	it('falls back when the value cannot be parsed as a URL', () => {
		expect(sanitizeRedirectPath('http://[', '/fallback')).toBe('/fallback');
	});

	it('trims the value and resolves a relative path against the app root', () => {
		expect(sanitizeRedirectPath('  /locations/8  ')).toBe('/locations/8');
		expect(sanitizeRedirectPath('settings')).toBe('/settings');
	});
});

describe('readRedirectPath', () => {
	it('reads the sanitized redirect param', () => {
		expect(readRedirectPath(new URLSearchParams('redirect=%2Freports%3Fpage%3D2'))).toBe(
			'/reports?page=2'
		);
	});

	it('falls back without a safe redirect param', () => {
		expect(readRedirectPath(new URLSearchParams())).toBe('/');
		expect(readRedirectPath(new URLSearchParams(), '/rules')).toBe('/rules');
		expect(readRedirectPath(new URLSearchParams('redirect=https://example.com'), '/rules')).toBe(
			'/rules'
		);
	});

	it('reads the redirect param from a full URL', () => {
		expect(
			readRedirectPathFromUrl(new URL('https://app.example/auth/login?redirect=%2Fsettings'))
		).toBe('/settings');
		expect(readRedirectPathFromUrl(new URL('https://app.example/auth/login'), '/rules')).toBe(
			'/rules'
		);
		expect(readRedirectPathFromUrl(new URL('https://app.example/auth/login'))).toBe('/');
	});
});

describe('buildLoginPath', () => {
	it('includes the sanitized redirect and a recognized login reason', () => {
		expect(
			buildLoginPath({
				redirectTo: '/settings?tab=profile',
				reason: 'auth-required'
			})
		).toBe('/auth/login?redirect=%2Fsettings%3Ftab%3Dprofile&reason=auth-required');
	});

	it('drops invalid redirect values', () => {
		expect(
			buildLoginPath({
				redirectTo: 'https://example.com/phish',
				reason: 'signed-out'
			})
		).toBe('/auth/login?reason=signed-out');
	});

	it('is the bare login path without a redirect or reason', () => {
		expect(buildLoginPath()).toBe('/auth/login');
		expect(buildLoginPath({ redirectTo: null, reason: null })).toBe('/auth/login');
	});

	it('builds on a custom path and leaves out an unknown reason', () => {
		expect(
			buildLoginPath({
				path: '/auth/sign-in',
				redirectTo: '/rules',
				reason: 'hacked' as LoginReason
			})
		).toBe('/auth/sign-in?redirect=%2Frules');
		expect(buildLoginPath({ reason: 'password-reset' })).toBe('/auth/login?reason=password-reset');
	});
});

describe('buildLogoutPath', () => {
	it('is the bare logout path without a redirect', () => {
		expect(buildLogoutPath()).toBe('/auth/logout');
		expect(buildLogoutPath({ redirectTo: '//example.com' })).toBe('/auth/logout');
	});

	it('carries a safe redirect, on a custom path when given', () => {
		expect(buildLogoutPath({ redirectTo: '/auth/create-account' })).toBe(
			'/auth/logout?redirect=%2Fauth%2Fcreate-account'
		);
		expect(buildLogoutPath({ path: '/auth/sign-out', redirectTo: '/settings' })).toBe(
			'/auth/sign-out?redirect=%2Fsettings'
		);
	});
});

describe('withRedirectParam', () => {
	it('adds the redirect query parameter only when it is safe', () => {
		expect(withRedirectParam('/auth/create-account', '/settings')).toBe(
			'/auth/create-account?redirect=%2Fsettings'
		);
		expect(withRedirectParam('/auth/create-account', 'https://example.com')).toBe(
			'/auth/create-account'
		);
	});

	it('leaves the path alone without a redirect', () => {
		expect(withRedirectParam('/auth/create-account', null)).toBe('/auth/create-account');
		expect(withRedirectParam('/auth/create-account', undefined)).toBe('/auth/create-account');
	});
});

describe('readLoginReason', () => {
	it('returns only supported reason values', () => {
		expect(readLoginReason(new URLSearchParams('reason=expired'))).toBe('expired');
		expect(readLoginReason(new URLSearchParams('reason=unknown'))).toBeNull();
	});

	it('accepts every listed reason and nothing without a reason', () => {
		expect(LOGIN_REASONS).toEqual([
			'auth-required',
			'expired',
			'signed-out',
			'password-reset',
			'error-recovery'
		]);
		for (const reason of LOGIN_REASONS) {
			expect(readLoginReason(new URLSearchParams({ reason }))).toBe(reason);
		}
		expect(readLoginReason(new URLSearchParams())).toBeNull();
	});
});
