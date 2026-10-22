import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSessionExpiryWatcher } from './session-expiry';

// The timer paths are covered in session-expiry.svelte.spec.ts (browser); this
// file covers SSR and the re-check when the user returns to the app.

/** A minimal browser for `onAppForeground`: a visible document and a window. */
function fakeBrowser() {
	const document = Object.assign(new EventTarget(), { visibilityState: 'visible' });
	const window = new EventTarget();
	vi.stubGlobal('document', document);
	vi.stubGlobal('window', window);
	return { returnToApp: () => window.dispatchEvent(new Event('focus')) };
}

const nowSeconds = () => Math.floor(Date.now() / 1000);
/** Lets the foreground cooldown (1 s) pass so the next return counts. */
const later = (ms = 5_000) => vi.setSystemTime(Date.now() + ms);

beforeEach(() => {
	vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
	vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
});

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

describe('createSessionExpiryWatcher during SSR', () => {
	it('is a no-op', () => {
		const getExpSeconds = vi.fn(() => nowSeconds() - 10);
		const onExpired = vi.fn();

		const watcher = createSessionExpiryWatcher({ getExpSeconds, onExpired });
		watcher.rearm();
		vi.advanceTimersByTime(60_000);
		watcher.destroy();

		expect(typeof window).toBe('undefined');
		expect(getExpSeconds).not.toHaveBeenCalled();
		expect(onExpired).not.toHaveBeenCalled();
	});
});

describe('createSessionExpiryWatcher when the user returns to the app', () => {
	it('expires the session at once if it lapsed in the background', () => {
		const browser = fakeBrowser();
		const exp = nowSeconds() + 60;
		const onExpired = vi.fn();
		createSessionExpiryWatcher({ getExpSeconds: () => exp, onExpired, leadTimeMs: 0 });

		// Background tabs throttle timers: the clock moves on, the timer never ran.
		vi.setSystemTime((exp + 5) * 1000);
		browser.returnToApp();

		expect(onExpired).toHaveBeenCalledTimes(1);
	});

	it('counts the lead time when re-checking', () => {
		const browser = fakeBrowser();
		const exp = nowSeconds() + 60;
		const onExpired = vi.fn();
		createSessionExpiryWatcher({ getExpSeconds: () => exp, onExpired });

		vi.setSystemTime(exp * 1000 - 2_500);
		browser.returnToApp();
		expect(onExpired).not.toHaveBeenCalled();

		// 1.5 s later (past the foreground cooldown): inside the 1 s lead time.
		vi.setSystemTime(exp * 1000 - 1_000);
		browser.returnToApp();
		expect(onExpired).toHaveBeenCalledTimes(1);
	});

	it('does nothing while the session is valid or when there is none', () => {
		const browser = fakeBrowser();
		let exp: number | null = nowSeconds() + 3_600;
		const onExpired = vi.fn();
		createSessionExpiryWatcher({ getExpSeconds: () => exp, onExpired });

		browser.returnToApp();
		later();
		exp = null;
		browser.returnToApp();

		expect(onExpired).not.toHaveBeenCalled();
	});

	it('expires once, however many times expiry is noticed', () => {
		const browser = fakeBrowser();
		const exp = nowSeconds() + 10;
		const onExpired = vi.fn();
		const watcher = createSessionExpiryWatcher({
			getExpSeconds: () => exp,
			onExpired,
			leadTimeMs: 0
		});
		watcher.rearm();

		vi.advanceTimersByTime(10_000);
		expect(onExpired).toHaveBeenCalledTimes(1);

		later();
		browser.returnToApp();
		expect(onExpired).toHaveBeenCalledTimes(1);
	});

	it('can expire again after a re-login', () => {
		const browser = fakeBrowser();
		let exp = nowSeconds() + 10;
		const onExpired = vi.fn();
		const watcher = createSessionExpiryWatcher({
			getExpSeconds: () => exp,
			onExpired,
			leadTimeMs: 0
		});
		watcher.rearm();
		vi.advanceTimersByTime(10_000);
		expect(onExpired).toHaveBeenCalledTimes(1);

		exp = nowSeconds() + 30;
		watcher.rearm();
		vi.setSystemTime((exp + 1) * 1000);
		browser.returnToApp();

		expect(onExpired).toHaveBeenCalledTimes(2);
	});

	it('stops checking once destroyed', () => {
		const browser = fakeBrowser();
		const exp = nowSeconds() + 60;
		const onExpired = vi.fn();
		const watcher = createSessionExpiryWatcher({
			getExpSeconds: () => exp,
			onExpired,
			leadTimeMs: 0
		});

		watcher.destroy();
		vi.setSystemTime((exp + 5) * 1000);
		browser.returnToApp();

		expect(onExpired).not.toHaveBeenCalled();
	});
});
