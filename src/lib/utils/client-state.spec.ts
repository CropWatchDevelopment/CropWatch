import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearAllClientState } from './client-state';

const EXPIRED = 'expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';

/** The browser globals the helper touches: both storages and the cookies. */
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
		cookieWrites
	};
	vi.stubGlobal('localStorage', browser.localStorage);
	vi.stubGlobal('sessionStorage', browser.sessionStorage);
	vi.stubGlobal('document', browser.document);
	return browser;
}

const denied = () => {
	throw new DOMException('denied', 'SecurityError');
};

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('clearAllClientState', () => {
	it('empties both storages and expires every cookie the page can see', () => {
		const browser = fakeBrowser();

		clearAllClientState();

		expect(browser.localStorage.clear).toHaveBeenCalledTimes(1);
		expect(browser.sessionStorage.clear).toHaveBeenCalledTimes(1);
		expect(browser.cookieWrites).toEqual([
			`jwt=; ${EXPIRED}`,
			`theme=; ${EXPIRED}`,
			`PARAGLIDE_LOCALE=; ${EXPIRED}`
		]);
	});

	it('writes no cookie when there are none', () => {
		const browser = fakeBrowser('');

		clearAllClientState();

		expect(browser.cookieWrites).toEqual([]);
		expect(browser.localStorage.clear).toHaveBeenCalledTimes(1);
	});

	it('still clears the rest when one store is unavailable', () => {
		const browser = fakeBrowser();
		browser.localStorage.clear.mockImplementation(denied);

		expect(() => clearAllClientState()).not.toThrow();

		expect(browser.sessionStorage.clear).toHaveBeenCalledTimes(1);
		expect(browser.cookieWrites).toHaveLength(3);
	});

	it('never throws, even with no storage and no cookie access', () => {
		const browser = fakeBrowser();
		browser.localStorage.clear.mockImplementation(denied);
		browser.sessionStorage.clear.mockImplementation(denied);
		vi.stubGlobal('document', {
			get cookie(): string {
				return denied();
			}
		});

		expect(() => clearAllClientState()).not.toThrow();

		expect(browser.sessionStorage.clear).toHaveBeenCalledTimes(1);
	});
});
