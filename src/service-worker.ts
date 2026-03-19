/// <reference no-default-lib="true" />
/// <reference lib="esnext" />
/// <reference lib="webworker" />
/// <reference types="@sveltejs/kit" />

import { build, files, prerendered, version } from '$service-worker';

const self = globalThis.self as ServiceWorkerGlobalScope;
const base = self.location.pathname.split('/').slice(0, -1).join('/');

const STATIC_CACHE = `cropwatch-static-${version}`;
const RUNTIME_CACHE = `cropwatch-runtime-${version}`;
const OFFLINE_PATH = `${base}/offline`;
const PRECACHE_URLS = [...new Set([...build, ...files, ...prerendered])];
const PRECACHE_URL_SET = new Set(PRECACHE_URLS);

function shouldCacheRuntimeAsset(request: Request, url: URL): boolean {
	if (url.origin !== self.location.origin) return false;
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

self.addEventListener('install', (event) => {
	event.waitUntil(
		(async () => {
			const cache = await caches.open(STATIC_CACHE);
			await cache.addAll(PRECACHE_URLS);
		})()
	);
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

			await self.clients.claim();
		})()
	);
});

self.addEventListener('message', (event) => {
	if (event.data?.type === 'SKIP_WAITING') {
		void self.skipWaiting();
	}
});

self.addEventListener('fetch', (event) => {
	if (event.request.method !== 'GET') {
		return;
	}

	const url = new URL(event.request.url);

	if (url.origin !== self.location.origin) {
		return;
	}

	if (PRECACHE_URL_SET.has(url.pathname)) {
		event.respondWith(
			(async () => {
				const cache = await caches.open(STATIC_CACHE);
				const cachedResponse = await cache.match(event.request);

				if (cachedResponse) {
					return cachedResponse;
				}

				const networkResponse = await fetch(event.request);
				if (isCacheableResponse(networkResponse)) {
					await cache.put(event.request, networkResponse.clone());
				}

				return networkResponse;
			})()
		);
		return;
	}

	if (event.request.mode === 'navigate') {
		event.respondWith(
			(async () => {
				try {
					return await fetch(event.request);
				} catch (error) {
					const cache = await caches.open(STATIC_CACHE);
					const offlineResponse = await cache.match(OFFLINE_PATH);

					if (offlineResponse) {
						return offlineResponse;
					}

					throw error;
				}
			})()
		);
		return;
	}

	if (!shouldCacheRuntimeAsset(event.request, url)) {
		return;
	}

	event.respondWith(
		(async () => {
			const cache = await caches.open(RUNTIME_CACHE);
			const cachedResponse = await cache.match(event.request);
			const networkPromise = fetch(event.request).then(async (response) => {
				if (isCacheableResponse(response)) {
					await cache.put(event.request, response.clone());
				}

				return response;
			});

			if (cachedResponse) {
				void networkPromise.catch(() => undefined);
				return cachedResponse;
			}

			return networkPromise;
		})()
	);
});
