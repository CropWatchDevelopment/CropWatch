import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

// Reactivity is covered in reactive-now.svelte.spec.ts (browser); this file
// checks that the shared interval only exists in a browser. Timers are not
// faked while importing (the module loader needs real ones): the module's own
// `setInterval` call is observed through a call-through spy instead.

const TICK_MS = 30_000;

// Transform the module once up front, outside any test's timeout (the first
// transform can be slow while the dev server is busy); re-imports are cached.
beforeAll(async () => {
	await import('./reactive-now.svelte');
}, 60_000);

afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

async function importFresh() {
	const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');
	vi.resetModules();
	const before = Date.now();
	const { reactiveNow } = await import('./reactive-now.svelte');
	const after = Date.now();
	const tickIndex = setIntervalSpy.mock.calls.findIndex(([, delay]) => delay === TICK_MS);
	return {
		reactiveNow,
		before,
		after,
		ticks: setIntervalSpy.mock.calls.filter(([, delay]) => delay === TICK_MS).length,
		tick: tickIndex >= 0 ? (setIntervalSpy.mock.calls[tickIndex][0] as () => void) : null,
		handle: tickIndex >= 0 ? setIntervalSpy.mock.results[tickIndex].value : null
	};
}

describe('reactiveNow outside the browser', () => {
	it('holds the import time and starts no timer during SSR', async () => {
		const { reactiveNow, before, after, ticks } = await importFresh();

		expect(ticks).toBe(0);
		expect(reactiveNow.value).toBeGreaterThanOrEqual(before);
		expect(reactiveNow.value).toBeLessThanOrEqual(after);
	});

	it('starts a single 30-second tick when a window exists', async () => {
		vi.stubGlobal('window', {});

		const { reactiveNow, ticks, tick, handle } = await importFresh();
		clearInterval(handle);

		expect(ticks).toBe(1);
		vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-10-21T09:00:30.000Z'));
		tick?.();
		expect(reactiveNow.value).toBe(Date.parse('2026-10-21T09:00:30.000Z'));
	});
});
