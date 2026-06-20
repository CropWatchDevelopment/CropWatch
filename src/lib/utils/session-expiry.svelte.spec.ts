import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createSessionExpiryWatcher } from './session-expiry';

// `queueMicrotask` is intentionally left real so the already-expired path can be
// flushed with `await Promise.resolve()`; `setTimeout`/`Date` are faked so the
// scheduling math is deterministic.
const MAX_DELAY_MS = 2_000_000_000;

describe('createSessionExpiryWatcher', () => {
	beforeEach(() => {
		vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
		vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	const nowSeconds = () => Math.floor(Date.now() / 1000);

	it('fires onExpired at the expiry instant, not before', () => {
		const onExpired = vi.fn();
		const watcher = createSessionExpiryWatcher({
			getExpSeconds: () => nowSeconds() + 100,
			onExpired,
			leadTimeMs: 0
		});
		watcher.rearm();

		vi.advanceTimersByTime(99_000);
		expect(onExpired).not.toHaveBeenCalled();

		vi.advanceTimersByTime(1_000);
		expect(onExpired).toHaveBeenCalledTimes(1);

		watcher.destroy();
	});

	it('fires slightly early by the lead-time buffer', () => {
		const onExpired = vi.fn();
		const watcher = createSessionExpiryWatcher({
			getExpSeconds: () => nowSeconds() + 100,
			onExpired,
			leadTimeMs: 5_000
		});
		watcher.rearm();

		vi.advanceTimersByTime(95_000);
		expect(onExpired).toHaveBeenCalledTimes(1);

		watcher.destroy();
	});

	it('fires immediately (next microtask) when already expired', async () => {
		const onExpired = vi.fn();
		const watcher = createSessionExpiryWatcher({
			getExpSeconds: () => nowSeconds() - 10,
			onExpired,
			leadTimeMs: 0
		});
		watcher.rearm();

		expect(onExpired).not.toHaveBeenCalled(); // deferred off the synchronous body
		await Promise.resolve();
		expect(onExpired).toHaveBeenCalledTimes(1);

		watcher.destroy();
	});

	it('does not fire after destroy()', () => {
		const onExpired = vi.fn();
		const watcher = createSessionExpiryWatcher({
			getExpSeconds: () => nowSeconds() + 50,
			onExpired,
			leadTimeMs: 0
		});
		watcher.rearm();
		watcher.destroy();

		vi.advanceTimersByTime(60_000);
		expect(onExpired).not.toHaveBeenCalled();
	});

	it('re-arms to the new expiry when the session changes (re-login)', () => {
		const onExpired = vi.fn();
		let exp = nowSeconds() + 30;
		const watcher = createSessionExpiryWatcher({
			getExpSeconds: () => exp,
			onExpired,
			leadTimeMs: 0
		});
		watcher.rearm();

		// Re-login extends the session before the original timer fires.
		exp = nowSeconds() + 300;
		watcher.rearm();

		vi.advanceTimersByTime(31_000); // past the original expiry
		expect(onExpired).not.toHaveBeenCalled();

		vi.advanceTimersByTime(270_000); // reach the new expiry
		expect(onExpired).toHaveBeenCalledTimes(1);

		watcher.destroy();
	});

	it('does nothing when there is no session', () => {
		const onExpired = vi.fn();
		const watcher = createSessionExpiryWatcher({
			getExpSeconds: () => null,
			onExpired
		});
		watcher.rearm();

		vi.advanceTimersByTime(10_000_000);
		expect(onExpired).not.toHaveBeenCalled();

		watcher.destroy();
	});

	it('clamps a far-future expiry to avoid the 32-bit setTimeout immediate-fire bug', () => {
		const onExpired = vi.fn();
		const exp = nowSeconds() + 60 * 60 * 24 * 30; // 30 days out
		const watcher = createSessionExpiryWatcher({
			getExpSeconds: () => exp,
			onExpired,
			leadTimeMs: 0
		});
		watcher.rearm();

		// At the clamp boundary it must re-arm, not fire.
		vi.advanceTimersByTime(MAX_DELAY_MS);
		expect(onExpired).not.toHaveBeenCalled();

		// It still fires once the real expiry is finally reached.
		const remainingMs = exp * 1000 - Date.now();
		vi.advanceTimersByTime(remainingMs);
		expect(onExpired).toHaveBeenCalledTimes(1);

		watcher.destroy();
	});
});
