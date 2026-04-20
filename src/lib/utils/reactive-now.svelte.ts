/**
 * Reactive wall-clock tick.
 *
 * Svelte 5 derivations only re-run when their tracked reactive reads change.
 * `Date.now()` is not reactive on its own, so derivations that compare a
 * timestamp against "now" (e.g. "is this device offline?") become stale when
 * wall-clock time crosses a threshold without any other state change.
 *
 * `reactiveNow.value` is a `$state`-backed millisecond timestamp that advances
 * on a shared interval. Reading it inside a `$derived` or `$effect` registers
 * it as a reactive dependency, so the derivation invalidates each tick.
 */

const TICK_MS = 30_000;

let nowMs = $state(Date.now());

if (typeof window !== 'undefined') {
	setInterval(() => {
		nowMs = Date.now();
	}, TICK_MS);
}

/**
 * Reactive "now" in milliseconds. Read `reactiveNow.value` inside a `$derived`
 * or `$effect` to make the derivation re-run on each tick.
 */
export const reactiveNow = {
	get value(): number {
		return nowMs;
	}
};
