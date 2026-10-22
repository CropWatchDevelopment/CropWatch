import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { onAppForeground } from './onAppForeground';

/** A minimal browser: a document with a visibility state, and a window. */
function fakeBrowser(visibilityState: DocumentVisibilityState = 'visible') {
	const document = Object.assign(new EventTarget(), { visibilityState });
	const window = new EventTarget();
	vi.stubGlobal('document', document);
	vi.stubGlobal('window', window);
	return {
		document,
		focus: () => window.dispatchEvent(new Event('focus')),
		becomeVisible: () => document.dispatchEvent(new Event('visibilitychange'))
	};
}

beforeEach(() => {
	vi.useFakeTimers({ toFake: ['Date'] });
	vi.setSystemTime(new Date('2026-10-21T09:00:00Z'));
});

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

describe('onAppForeground', () => {
	it('runs the callback when the window regains focus', () => {
		const browser = fakeBrowser();
		const callback = vi.fn();
		onAppForeground(callback);

		browser.focus();

		expect(callback).toHaveBeenCalledTimes(1);
	});

	it('runs the callback when the tab becomes visible again', () => {
		const browser = fakeBrowser();
		const callback = vi.fn();
		onAppForeground(callback);

		browser.becomeVisible();

		expect(callback).toHaveBeenCalledTimes(1);
	});

	it('ignores events while the page is hidden', () => {
		const browser = fakeBrowser('hidden');
		const callback = vi.fn();
		onAppForeground(callback);

		browser.becomeVisible();
		browser.focus();

		expect(callback).not.toHaveBeenCalled();
	});

	it('runs once for the burst of events of a single return', () => {
		const browser = fakeBrowser();
		const callback = vi.fn();
		onAppForeground(callback);

		browser.becomeVisible();
		browser.focus();
		vi.setSystemTime(Date.now() + 999);
		browser.focus();
		expect(callback).toHaveBeenCalledTimes(1);

		vi.setSystemTime(Date.now() + 1);
		browser.focus();
		expect(callback).toHaveBeenCalledTimes(2);
	});

	it('stops listening once cleaned up', () => {
		const browser = fakeBrowser();
		const callback = vi.fn();
		const stop = onAppForeground(callback);

		stop();
		browser.focus();
		browser.becomeVisible();

		expect(callback).not.toHaveBeenCalled();
	});

	it('is a no-op during SSR', () => {
		const callback = vi.fn();

		const stop = onAppForeground(callback);

		expect(typeof document).toBe('undefined');
		expect(() => stop()).not.toThrow();
		expect(callback).not.toHaveBeenCalled();
	});
});
