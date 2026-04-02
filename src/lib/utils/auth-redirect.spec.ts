import { describe, expect, it } from 'vitest';
import {
	buildLoginPath,
	readLoginReason,
	sanitizeRedirectPath,
	withRedirectParam
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
});

describe('readLoginReason', () => {
	it('returns only supported reason values', () => {
		expect(readLoginReason(new URLSearchParams('reason=expired'))).toBe('expired');
		expect(readLoginReason(new URLSearchParams('reason=unknown'))).toBeNull();
	});
});
