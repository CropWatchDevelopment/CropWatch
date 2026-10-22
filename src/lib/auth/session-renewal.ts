/**
 * When a session gets renewed with its refresh token. The two sides overlap on
 * purpose: the browser asks for a renewal (it re-runs the root layout load) well
 * inside the window in which the server refreshes, so a few minutes of clock
 * skew between them never lets the access token run out first.
 */

/** `hooks.server.ts` refreshes the session when its access token has less than this left. */
export const SERVER_REFRESH_WINDOW_SECONDS = 10 * 60;

/** The browser asks the server for a renewed session this long before the token runs out. */
export const CLIENT_RENEW_LEAD_MS = 5 * 60 * 1000;

/** The root layout load's dependency key; invalidating it re-runs the load (and its refresh). */
export const SESSION_DEPENDENCY = 'app:session';
