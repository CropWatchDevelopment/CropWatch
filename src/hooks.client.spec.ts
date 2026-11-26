import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { handleError } from './hooks.client';

type ErrorInput = Parameters<typeof handleError>[0];

const EXPIRED = 'expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';

/** A browser-like global scope: storages, cookies and `window.location`. */
function fakeBrowser(cookie = 'jwt=abc; theme=dark;  PARAGLIDE_LOCALE=en') {
	const cookieWrites: string[] = [];
	const browser = {
		localStorage: { clear: vi.fn() },
		sessionStorage: { clear: vi.fn() },
		document: {
			get cookie() {
				return cookie;
			},
			set cookie(value: string) {
				cookieWrites.push(value);
			}
		},
		window: { location: { href: 'http://localhost/locations' } },
		cookieWrites
	};
	vi.stubGlobal('localStorage', browser.localStorage);
	vi.stubGlobal('sessionStorage', browser.sessionStorage);
	vi.stubGlobal('document', browser.document);
	vi.stubGlobal('window', browser.window);
	return browser;
}

/** An error SvelteKit raised itself (a 404, …), with its status and safe message. */
function frameworkError(status: number): ErrorInput {
	return {
		kind: 'framework',
		error: { status, message: 'Something broke' },
		event: {}
	} as ErrorInput;
}

/** Something our code (or code it calls) threw. */
function unknownError(error: unknown = new Error('boom')): ErrorInput {
	return { kind: 'unknown', error, event: {} } as ErrorInput;
}

let consoleError: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
	consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
	consoleError.mockRestore();
	vi.unstubAllGlobals();
});

describe('client handleError', () => {
	it.each([400, 403, 404, 503])(
		'logs a framework %i and leaves its status and message to the error page',
		(status) => {
			const browser = fakeBrowser();
			const input = frameworkError(status);

			expect(handleError(input)).toBeUndefined();

			expect(consoleError).toHaveBeenCalledWith(
				'[CropWatch] Unexpected client error:',
				input.error
			);
			expect(browser.localStorage.clear).not.toHaveBeenCalled();
			expect(browser.window.location.href).toBe('http://localhost/locations');
		}
	);

	it('leaves an error(...) result alone', () => {
		const browser = fakeBrowser();
		const input = { kind: 'app', error: { status: 403, message: 'No' }, event: {} } as ErrorInput;

		expect(handleError(input)).toBeUndefined();

		expect(consoleError).not.toHaveBeenCalled();
		expect(browser.localStorage.clear).not.toHaveBeenCalled();
		expect(browser.window.location.href).toBe('http://localhost/locations');
	});

	it.each([
		['an unexpected error', () => unknownError(new Error('crash'))],
		['a framework 500', () => frameworkError(500)]
	])('recovers from %s by clearing all client state and signing in again', (_label, makeInput) => {
		const browser = fakeBrowser();
		const input = makeInput();

		expect(handleError(input)).toBeUndefined();

		expect(consoleError).toHaveBeenCalledWith('[CropWatch] Unexpected client error:', input.error);
		expect(browser.localStorage.clear).toHaveBeenCalledTimes(1);
		expect(browser.sessionStorage.clear).toHaveBeenCalledTimes(1);
		expect(browser.cookieWrites).toEqual([
			`jwt=; ${EXPIRED}`,
			`theme=; ${EXPIRED}`,
			`PARAGLIDE_LOCALE=; ${EXPIRED}`
		]);
		expect(browser.window.location.href).toBe('/auth/login?reason=error-recovery');
	});

	it('skips cookie writes when there are no cookies', () => {
		const browser = fakeBrowser('');

		handleError(unknownError());

		expect(browser.cookieWrites).toEqual([]);
		expect(browser.window.location.href).toBe('/auth/login?reason=error-recovery');
	});

	it('still redirects when storage and cookies are unavailable', () => {
		const browser = fakeBrowser();
		browser.localStorage.clear.mockImplementation(() => {
			throw new DOMException('denied', 'SecurityError');
		});
		browser.sessionStorage.clear.mockImplementation(() => {
			throw new DOMException('denied', 'SecurityError');
		});
		vi.stubGlobal('document', {
			get cookie(): string {
				throw new DOMException('denied', 'SecurityError');
			}
		});

		expect(() => handleError(unknownError())).not.toThrow();

		expect(browser.sessionStorage.clear).toHaveBeenCalledTimes(1);
		expect(browser.window.location.href).toBe('/auth/login?reason=error-recovery');
	});
});
