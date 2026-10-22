import { onAppForeground } from './onAppForeground';

/**
 * Proactively detect JWT session expiry on the client.
 *
 * The server hook (`src/hooks.server.ts`) is the authoritative session guard,
 * but it only runs on a server request/navigation. A user idling on a page — or
 * one that only triggers client-side API requests (`getServices()`) — never causes a
 * navigation, so the hook never fires and the session can expire while the page
 * keeps showing stale data.
 *
 * This watcher fills that gap. It schedules a single `setTimeout` for the exact
 * instant the token expires (its `exp` claim) and, because background tabs throttle
 * timers, also re-checks the moment the tab regains focus via `onAppForeground`.
 * When expiry is reached it invokes `onExpired` (which redirects to login).
 *
 * With `onRenew`, the watcher first asks for a renewed session `renewLeadMs`
 * before expiry (and at once when the user comes back to an app whose session
 * lapsed in the background). It asks once per session: when the renewal brings
 * a later expiry the watcher follows it, otherwise `onExpired` still runs on
 * time.
 *
 * Re-arm whenever the session changes (re-login / navigation) by calling `rearm()`.
 * Safe to construct during SSR (becomes a no-op).
 */

// `setTimeout` stores its delay in a 32-bit int; delays above ~24.8 days wrap and
// fire immediately. Clamp to this ceiling and re-arm instead.
const MAX_DELAY_MS = 2_000_000_000;

export interface SessionExpiryWatcher {
	/** Cancel any pending timer and schedule a fresh one from the current expiry. */
	rearm: () => void;
	/** Clear the timer and detach the foreground listener. */
	destroy: () => void;
}

export function createSessionExpiryWatcher(options: {
	/** Returns the session expiry as a UNIX timestamp in seconds, or null if no session. */
	getExpSeconds: () => number | null | undefined;
	/** Called once when the session has expired. */
	onExpired: () => void;
	/** Fire this many ms before the real expiry to absorb minor clock skew. Default 1000. */
	leadTimeMs?: number;
	/** Asks for a renewed session; a later expiry shows up through `getExpSeconds`. */
	onRenew?: () => Promise<unknown>;
	/** How long before expiry to ask for a renewal. Default 5 minutes. */
	renewLeadMs?: number;
}): SessionExpiryWatcher {
	if (typeof window === 'undefined') {
		return { rearm: () => {}, destroy: () => {} };
	}

	const { getExpSeconds, onExpired, leadTimeMs = 1000, onRenew, renewLeadMs = 300_000 } = options;

	let handle: ReturnType<typeof setTimeout> | null = null;
	let redirecting = false;
	// The expiry a renewal was last asked for: one attempt per session.
	let renewedFor: number | null = null;
	let destroyed = false;

	const renewDue = (exp: number) => onRenew !== undefined && renewedFor !== exp;

	const clear = () => {
		if (handle) {
			clearTimeout(handle);
			handle = null;
		}
	};

	const fire = () => {
		if (redirecting) return;
		redirecting = true;
		onExpired();
	};

	const renew = (exp: number) => {
		if (renewedFor === exp) return; // e.g. two re-arms queued before either ran
		renewedFor = exp;
		void onRenew!()
			.catch(() => undefined)
			.then(() => {
				if (!destroyed) rearm();
			});
	};

	const schedule = (delayMs: number, run: () => void) => {
		if (delayMs > MAX_DELAY_MS) {
			handle = setTimeout(rearm, MAX_DELAY_MS);
			return;
		}
		handle = setTimeout(run, delayMs);
	};

	const rearm = () => {
		clear();

		const exp = getExpSeconds();
		if (exp == null) return; // no session (e.g. /auth routes) — nothing to watch

		if (renewDue(exp)) {
			const renewDelayMs = exp * 1000 - renewLeadMs - Date.now();
			if (renewDelayMs <= 0) {
				// Deferred like `fire`: never re-run loads during a synchronous $effect body.
				queueMicrotask(() => renew(exp));
				return;
			}
			redirecting = false;
			schedule(renewDelayMs, () => renew(exp));
			return;
		}

		const delayMs = exp * 1000 - leadTimeMs - Date.now();

		if (delayMs <= 0) {
			// Already expired — defer so we never navigate during a synchronous $effect body.
			queueMicrotask(fire);
			return;
		}

		// A future-dated session is valid again (e.g. after re-login): allow a fresh fire.
		redirecting = false;
		schedule(delayMs, fire);
	};

	const checkNow = () => {
		const exp = getExpSeconds();
		if (exp == null) return;
		if (renewDue(exp)) {
			if (exp * 1000 - renewLeadMs - Date.now() <= 0) {
				clear();
				renew(exp);
			}
			return;
		}
		if (exp * 1000 - leadTimeMs - Date.now() <= 0) {
			fire();
		}
	};

	const detach = onAppForeground(checkNow);

	const destroy = () => {
		destroyed = true;
		clear();
		detach();
	};

	return { rearm, destroy };
}
