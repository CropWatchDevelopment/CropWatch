// CropWatch push-only service worker.
//
// Deliberately minimal: no caching, no offline handling, no Firebase code. The
// alert engine sends data-only FCM messages ({title, body, url, ...}), so a
// plain `push` listener is all that is needed to surface them; keeping Firebase
// out of the worker also avoids double notifications from its auto-display
// path. Registered with the non-root scope `/push-sw/` so the (currently
// unregistered) offline service worker can still claim `/` later — push
// delivery and notification clicks do not depend on scope.

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

	event.waitUntil(
		self.registration.showNotification(title, {
			body: data.body || '',
			icon: '/icons/icon-192x192.png',
			badge: '/icons/icon-192x192.png',
			data: { url: data.url || '/' }
		})
	);
});

self.addEventListener('notificationclick', (event) => {
	event.notification.close();
	const url = event.notification.data?.url || '/';

	// client.navigate() only works on pages this worker controls, and the
	// push-sw scope controls none — so focus a tab already on the target URL,
	// otherwise open a new one.
	const target = new URL(url, self.location.origin).href;
	event.waitUntil(
		self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
			for (const client of clients) {
				if (client.url === target && 'focus' in client) {
					return client.focus();
				}
			}
			return self.clients.openWindow(target);
		})
	);
});
