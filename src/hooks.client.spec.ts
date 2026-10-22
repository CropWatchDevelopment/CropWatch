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

function input(status: number | undefined, error: unknown = new Error('boom')): ErrorInput {
	return { error, status, message: 'Something broke', event: {} } as unknown as ErrorInput;
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
	it.each([400, 403, 404, 503])('logs a %i and passes its message to the error page', (status) => {
		const browser = fakeBrowser();
		const error = new Error('not found');

		expect(handleError(input(status, error))).toEqual({ message: 'Something broke' });

		expect(consoleError).toHaveBeenCalledWith('[CropWatch] Unexpected client error:', error);
		expect(browser.localStorage.clear).not.toHaveBeenCalled();
		expect(browser.window.location.href).toBe('http://localhost/locations');
	});

	it.each([500, undefined])(
		'recovers from a %s by clearing all client state and signing in again',
		(status) => {
			const browser = fakeBrowser();
			const error = new Error('crash');

			expect(handleError(input(status, error))).toBeUndefined();

			expect(consoleError).toHaveBeenCalledWith('[CropWatch] Unexpected client error:', error);
			expect(browser.localStorage.clear).toHaveBeenCalledTimes(1);
			expect(browser.sessionStorage.clear).toHaveBeenCalledTimes(1);
			expect(browser.cookieWrites).toEqual([
				`jwt=; ${EXPIRED}`,
				`theme=; ${EXPIRED}`,
				`PARAGLIDE_LOCALE=; ${EXPIRED}`
			]);
			expect(browser.window.location.href).toBe('/auth/login?reason=error-recovery');
		}
	);

	it('skips cookie writes when there are no cookies', () => {
		const browser = fakeBrowser('');

		handleError(input(500));

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

		expect(() => handleError(input(500))).not.toThrow();

		expect(browser.sessionStorage.clear).toHaveBeenCalledTimes(1);
		expect(browser.window.location.href).toBe('/auth/login?reason=error-recovery');
	});
});
