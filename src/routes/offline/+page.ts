// Server-rendered on request (never prerendered), so the service worker caches
// it in the user's language; the server hook renders it without a session.
export const prerender = false;
// Plain HTML and CSS, never hydrated: the worker shows it at whatever URL
// failed to load, where the client router would resolve a different route.
export const csr = false;
