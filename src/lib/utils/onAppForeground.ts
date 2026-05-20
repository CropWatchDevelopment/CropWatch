/**
 * Invoke `callback` when the app returns to the foreground — i.e. the browser
 * tab becomes visible again, or the window regains focus after the user
 * switched to another tab or application.
 *
 * Both `visibilitychange` and `focus` are observed because switching *apps*
 * (rather than browser tabs) does not reliably fire `visibilitychange` on every
 * platform. A short cooldown collapses the burst that happens when both events
 * fire together on return, so `callback` runs at most once per return.
 *
 * Returns a cleanup function. Safe to call during SSR (it becomes a no-op).
 */
export function onAppForeground(callback: () => void): () => void {
	if (typeof document === 'undefined') return () => {};

	const COOLDOWN_MS = 1000;
	let lastFired = 0;

	const trigger = () => {
		if (document.visibilityState !== 'visible') return;
		const now = Date.now();
		if (now - lastFired < COOLDOWN_MS) return;
		lastFired = now;
		callback();
	};

	document.addEventListener('visibilitychange', trigger);
	window.addEventListener('focus', trigger);

	return () => {
		document.removeEventListener('visibilitychange', trigger);
		window.removeEventListener('focus', trigger);
	};
}
