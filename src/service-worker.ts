/// <reference no-default-lib="true" />
/// <reference lib="esnext" />
/// <reference lib="webworker" />
/// <reference types="@sveltejs/kit" />

import { version } from '$service-worker';

const self = globalThis.self as unknown as ServiceWorkerGlobalScope;
const base = self.location.pathname.split('/').slice(0, -1).join('/');

// Only the offline page and the files it needs are stored up front. Everything
// else is cached as the app uses it, so a phone never downloads the whole
// build (or the multi-megabyte source icons in static/) on install or on
// every deploy.
const STATIC_CACHE = `cropwatch-static-${version}`;
const RUNTIME_CACHE = `cropwatch-runtime-${version}`;
const OFFLINE_PATH = `${base}/offline`;
// Content-hashed build output: a URL's content never changes.
const IMMUTABLE_PREFIX = `${base}/_app/immutable/`;
const BUILD_STYLESHEET = /[^"'\s()]*\/_app\/immutable\/[^"'\s()]+\.css/g;

function shouldCacheRuntimeAsset(request: Request, url: URL): boolean {
	if (url.pathname.includes('__data.json')) return false;
	if (url.pathname.startsWith(`${base}/api/`)) return false;
	if (url.pathname.startsWith('/src/')) return false;
	if (url.pathname.startsWith('/@')) return false;
	if (url.pathname.includes('/node_modules/')) return false;

	return ['font', 'image', 'manifest', 'script', 'style', 'worker'].includes(request.destination);
}

function isCacheableResponse(response: Response): boolean {
	const cacheControl = response.headers.get('cache-control') ?? '';
	return response.ok && !cacheControl.includes('no-store');
}

/**
 * Stores the offline page, rendered in the user's language (the request
 * carries the locale cookie; the server never puts a session in this page),
 * with the stylesheets it links to, so it renders with no network.
 *
 * SvelteKit links assets relative to the page (`./_app/…`), but the worker
 * shows this page at whatever URL failed to load, where those links would
 * point elsewhere — so they are made absolute first.
 */
async function cacheOfflinePage(): Promise<void> {
	const response = await fetch(OFFLINE_PATH);
	if (!response.ok) throw new Error(`Offline page answered ${response.status}`);

	const html = (await response.text()).replace(/((?:href|src)=["'])\.\//g, `$1${base}/`);
	const stylesheets = new Set([...html.matchAll(BUILD_STYLESHEET)].map(([path]) => path));

	const cache = await caches.open(STATIC_CACHE);
	await cache.addAll([...stylesheets]);
	await cache.put(
		OFFLINE_PATH,
		new Response(html, {
			headers: { 'content-type': response.headers.get('content-type') ?? 'text/html' }
		})
	);
}

self.addEventListener('install', (event) => {
	// A failed install is retried on the next page load, so the worker never
	// runs without its offline page.
	event.waitUntil(cacheOfflinePage().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		(async () => {
			const expectedCaches = new Set([STATIC_CACHE, RUNTIME_CACHE]);

			for (const cacheName of await caches.keys()) {
				if (!expectedCaches.has(cacheName)) {
					await caches.delete(cacheName);
				}
			}

			// Start page requests while the worker boots, rather than after.
			await self.registration.navigationPreload?.enable();
			await self.clients.claim();
		})()
	);
});

async function navigate(event: FetchEvent): Promise<Response> {
	try {
		return (await event.preloadResponse) ?? (await fetch(event.request));
	} catch (error) {
		const cache = await caches.open(STATIC_CACHE);
		const offlineResponse = await cache.match(OFFLINE_PATH);

		if (offlineResponse) {
			return offlineResponse;
		}

		throw error;
	}
}

async function cacheFirst(request: Request): Promise<Response> {
	const cachedResponse = await caches.match(request);
	if (cachedResponse) return cachedResponse;

	const networkResponse = await fetch(request);
	if (isCacheableResponse(networkResponse)) {
		const cache = await caches.open(RUNTIME_CACHE);
		await cache.put(request, networkResponse.clone());
	}

	return networkResponse;
}

async function staleWhileRevalidate(request: Request): Promise<Response> {
	const cache = await caches.open(RUNTIME_CACHE);
	const cachedResponse = await cache.match(request);
	const networkPromise = fetch(request).then(async (response) => {
		if (isCacheableResponse(response)) {
			await cache.put(request, response.clone());
		}

		return response;
	});

	if (cachedResponse) {
		void networkPromise.catch(() => undefined);
		return cachedResponse;
	}

	return networkPromise;
}

self.addEventListener('fetch', (event) => {
	if (event.request.method !== 'GET') {
		return;
	}

	const url = new URL(event.request.url);

	if (url.origin !== self.location.origin) {
		return;
	}

	if (event.request.mode === 'navigate') {
		event.respondWith(navigate(event));
		return;
	}

	if (url.pathname.startsWith(IMMUTABLE_PREFIX)) {
		event.respondWith(cacheFirst(event.request));
		return;
	}

	if (shouldCacheRuntimeAsset(event.request, url)) {
		event.respondWith(staleWhileRevalidate(event.request));
	}
});
