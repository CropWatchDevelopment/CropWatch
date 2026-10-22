// CropWatch push-only service worker.
//
// Deliberately minimal: no caching, no offline handling, no Firebase code. The
// alert engine sends data-only FCM messages ({title, body, url, ...}), so a
// plain `push` listener is all that is needed to surface them; keeping Firebase
// out of the worker also avoids double notifications from its auto-display
// path. Registered with the non-root scope `/push-sw/` so the (currently
// unregistered) offline service worker can still claim `/` later — push
// delivery and notification clicks do not depend on scope.

// Posted to an open app window to open an alert's page in it. The page side is
// PwaController (src/lib/pwa/pwa-controller.svelte.ts), which listens for it.
const NAVIGATE_MESSAGE = 'cw:navigate';

self.addEventListener('push', (event) => {
	let payload = {};
	try {
		payload = event.data ? event.data.json() : {};
	} catch {
		payload = { body: event.data ? event.data.text() : '' };
	}

	// Data-only messages carry fields at payload.data; display messages at
	// payload.notification; a bare object is accepted as a fallback.
	const data = payload.data ?? payload.notification ?? payload;
	const title = data.title || 'CropWatch';
	const url = data.url || '/';

	event.waitUntil(
		self.registration.showNotification(title, {
			body: data.body || '',
			icon: '/icons/icon-192x192.png',
			badge: '/icons/icon-192x192.png',
			// One notification per rule and device: a repeat alert replaces the
			// previous one (and still sounds) instead of piling up in the tray.
			// The title carries the rule name and the URL the device.
			tag: data.tag || `${title}|${url}`,
			renotify: true,
			data: { url }
		})
	);
});

self.addEventListener('notificationclick', (event) => {
	event.notification.close();
	const url = event.notification.data?.url || '/';

	// client.navigate() only works on pages this worker controls, and the
	// push-sw scope controls none. So: focus a window already on the alert's
	// page; else focus an open app window and ask it to open the page (rather
	// than stacking a second window); else open a new one.
	const target = new URL(url, self.location.origin).href;
	event.waitUntil(
		self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (clients) => {
			const onTarget = clients.find((client) => client.url === target);
			if (onTarget) return onTarget.focus();

			const open = clients.find((client) => client.focused) ?? clients[0];
			if (open) {
				try {
					const focused = await open.focus();
					focused.postMessage({ type: NAVIGATE_MESSAGE, url: target });
					return focused;
				} catch {
					// The browser would not focus it: fall through to a new window.
				}
			}
			return self.clients.openWindow(target);
		})
	);
});
