import { flushSync } from 'svelte';
import { afterAll, describe, expect, it, vi } from 'vitest';

const START = Date.parse('2026-10-21T09:00:00.000Z');

// The module starts its shared interval when it is first imported, so the
// clock is faked before any import runs.
vi.hoisted(() => {
	vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] });
	vi.setSystemTime(new Date('2026-10-21T09:00:00.000Z'));
});

const { reactiveNow } = await import('./reactive-now.svelte');

afterAll(() => {
	vi.useRealTimers();
});

describe('reactiveNow', () => {
	it('starts at the time the app loaded', () => {
		expect(reactiveNow.value).toBe(START);
	});

	it('ticks every 30 seconds and re-runs whatever reads it', () => {
		const seen: number[] = [];
		const stop = $effect.root(() => {
			$effect(() => {
				seen.push(reactiveNow.value);
			});
		});
		flushSync();

		vi.advanceTimersByTime(29_999);
		flushSync();
		expect(seen).toEqual([START]);

		vi.advanceTimersByTime(1);
		flushSync();
		expect(seen).toEqual([START, START + 30_000]);
		expect(reactiveNow.value).toBe(START + 30_000);

		vi.advanceTimersByTime(30_000);
		flushSync();
		expect(seen).toEqual([START, START + 30_000, START + 60_000]);
		stop();
	});
});
