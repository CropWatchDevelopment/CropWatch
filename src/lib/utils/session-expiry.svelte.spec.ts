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

	describe('with renewal', () => {
		const RENEW_LEAD_MS = 300_000;
		/** Lets the renewal's promise chain (and the re-arm after it) run. */
		const settle = async () => {
			for (let i = 0; i < 5; i++) await Promise.resolve();
		};

		it('asks for a renewal before expiry and follows the later expiry it brings', async () => {
			let exp = nowSeconds() + 3_600;
			const onExpired = vi.fn();
			const onRenew = vi.fn(async () => {
				exp += 3_600;
			});
			const watcher = createSessionExpiryWatcher({
				getExpSeconds: () => exp,
				onExpired,
				onRenew,
				renewLeadMs: RENEW_LEAD_MS
			});
			watcher.rearm();

			vi.advanceTimersByTime(3_600_000 - RENEW_LEAD_MS - 1);
			expect(onRenew).not.toHaveBeenCalled();
			vi.advanceTimersByTime(1);
			expect(onRenew).toHaveBeenCalledTimes(1);
			await settle();

			// Past the old expiry: still signed in, next renewal an hour later.
			vi.advanceTimersByTime(RENEW_LEAD_MS + 10_000);
			expect(onExpired).not.toHaveBeenCalled();
			vi.advanceTimersByTime(3_600_000 - 10_000);
			expect(onRenew).toHaveBeenCalledTimes(2);

			watcher.destroy();
		});

		it.each([
			['brings no later expiry', async () => undefined],
			['fails', async () => Promise.reject(new Error('offline'))]
		])('still expires on time when the renewal %s', async (_, renewal) => {
			const exp = nowSeconds() + 3_600;
			const onExpired = vi.fn();
			const onRenew = vi.fn(renewal);
			const watcher = createSessionExpiryWatcher({
				getExpSeconds: () => exp,
				onExpired,
				onRenew,
				renewLeadMs: RENEW_LEAD_MS,
				leadTimeMs: 0
			});
			watcher.rearm();

			vi.advanceTimersByTime(3_600_000 - RENEW_LEAD_MS);
			await settle();
			expect(onRenew).toHaveBeenCalledTimes(1);
			expect(onExpired).not.toHaveBeenCalled();

			vi.advanceTimersByTime(RENEW_LEAD_MS);
			expect(onExpired).toHaveBeenCalledTimes(1);
			expect(onRenew).toHaveBeenCalledTimes(1);

			watcher.destroy();
		});

		it('renews at once inside the renewal window, once however often it is re-armed', async () => {
			const onRenew = vi.fn(async () => undefined);
			const watcher = createSessionExpiryWatcher({
				getExpSeconds: () => nowSeconds() + 60,
				onExpired: vi.fn(),
				onRenew,
				renewLeadMs: RENEW_LEAD_MS
			});

			watcher.rearm();
			watcher.rearm();
			expect(onRenew).not.toHaveBeenCalled(); // deferred off the synchronous body
			await settle();

			expect(onRenew).toHaveBeenCalledTimes(1);
			watcher.destroy();
		});

		it('stops after destroy(), even with a renewal in flight', async () => {
			let finishRenewal = () => {};
			const onExpired = vi.fn();
			const watcher = createSessionExpiryWatcher({
				getExpSeconds: () => nowSeconds() + 60,
				onExpired,
				onRenew: () => new Promise<void>((resolve) => (finishRenewal = resolve)),
				renewLeadMs: RENEW_LEAD_MS,
				leadTimeMs: 0
			});
			watcher.rearm();
			await settle();

			watcher.destroy();
			finishRenewal();
			await settle();
			vi.advanceTimersByTime(120_000);

			expect(onExpired).not.toHaveBeenCalled();
		});
	});
});
