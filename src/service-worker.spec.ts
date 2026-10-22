import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

// The SvelteKit build manifest the worker precaches (a duplicate on purpose).
vi.mock('$service-worker', () => ({
	build: ['/_app/immutable/start.js', '/_app/immutable/app.js'],
	files: ['/favicon.ico', '/icons/icon-192x192.png', '/_app/immutable/app.js'],
	prerendered: ['/legal'],
	version: 'test-1'
}));

const ORIGIN = 'https://app.cropwatch.test';
const STATIC_CACHE = 'cropwatch-static-test-1';
const RUNTIME_CACHE = 'cropwatch-runtime-test-1';

/** The parts of a fetch event's `Request` the worker reads. */
interface WorkerRequest {
	url: string;
	method: string;
	mode: RequestMode;
	destination: RequestDestination;
}

const keyOf = (request: WorkerRequest | string) =>
	typeof request === 'string' ? new URL(request, ORIGIN).href : request.url;

/** An in-memory Cache: entries keyed by absolute URL. */
class FakeCache {
	readonly entries = new Map<string, Response>();
	readonly addAll = vi.fn(async (urls: string[]) => {
		for (const url of urls) this.entries.set(keyOf(url), new Response(`precached ${url}`));
	});
	readonly match = vi.fn(async (request: WorkerRequest | string) =>
		this.entries.get(keyOf(request))?.clone()
	);
	readonly put = vi.fn(async (request: WorkerRequest | string, response: Response) => {
		this.entries.set(keyOf(request), response);
	});
}

type Listener = (event: unknown) => void;

/**
 * Imports a fresh copy of the worker into a fake `ServiceWorkerGlobalScope`
 * served from `scriptPath`, with fake `caches` and `fetch`.
 */
async function loadWorker(scriptPath = '/service-worker.js') {
	const listeners = new Map<string, Listener>();
	const stores = new Map<string, FakeCache>();
	const worker = {
		location: new URL(scriptPath, ORIGIN),
		addEventListener: vi.fn((type: string, listener: Listener) => listeners.set(type, listener)),
		clients: { claim: vi.fn(async () => undefined) },
		skipWaiting: vi.fn(async () => undefined)
	};
	const caches = {
		open: vi.fn(async (name: string) => {
			if (!stores.has(name)) stores.set(name, new FakeCache());
			return stores.get(name)!;
		}),
		keys: vi.fn(async () => [...stores.keys()]),
		delete: vi.fn(async (name: string) => stores.delete(name))
	};
	const network = vi.fn<(request: WorkerRequest) => Promise<Response>>(
		async () => new Response('from network')
	);

	vi.stubGlobal('self', worker);
	vi.stubGlobal('caches', caches);
	vi.stubGlobal('fetch', network);
	vi.resetModules();
	// Not a literal for TypeScript: the worker is type-checked on its own (the
	// generated tsconfig excludes it), and pulling its `no-default-lib` /
	// `webworker` references into the app program would drop the DOM libs.
	await import('./service-worker' as string);

	const cache = async (name: string) => (await caches.open(name)) as FakeCache;

	return {
		worker,
		caches,
		stores,
		network,
		cache,
		dispatch(type: string, event: unknown) {
			const listener = listeners.get(type);
			if (!listener) throw new Error(`no ${type} listener`);
			listener(event);
		},
		/** Dispatches a fetch event; resolves to whatever the worker responded with (or `null`). */
		fetch(init: Partial<WorkerRequest> & { path: string }) {
			const request: WorkerRequest = {
				url: new URL(init.path, ORIGIN).href,
				method: init.method ?? 'GET',
				mode: init.mode ?? 'cors',
				destination: init.destination ?? ''
			};
			let responded: Promise<Response> | null = null;
			this.dispatch('fetch', {
				request,
				respondWith: (response: Promise<Response>) => (responded = response)
			});
			return { request, responded: () => responded };
		},
		/** Runs a lifecycle event and waits for the promise handed to `waitUntil`. */
		async lifecycle(type: 'install' | 'activate') {
			let pending: Promise<unknown> = Promise.resolve();
			this.dispatch(type, { waitUntil: (promise: Promise<unknown>) => (pending = promise) });
			await pending;
		}
	};
}

// Transform the worker once up front, outside any test's timeout (the first
// transform can be slow while the dev server is busy); re-imports are cached.
beforeAll(async () => {
	await loadWorker();
	vi.unstubAllGlobals();
}, 60_000);

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('service worker lifecycle', () => {
	it('precaches the build, static files and prerendered pages once each, per version', async () => {
		const sw = await loadWorker();

		await sw.lifecycle('install');

		const staticCache = await sw.cache(STATIC_CACHE);
		expect(staticCache.addAll).toHaveBeenCalledWith([
			'/_app/immutable/start.js',
			'/_app/immutable/app.js',
			'/favicon.ico',
			'/icons/icon-192x192.png',
			'/legal'
		]);
	});

	it('drops the caches of other versions and takes control of open pages', async () => {
		const sw = await loadWorker();
		for (const name of [STATIC_CACHE, RUNTIME_CACHE, 'cropwatch-static-test-0', 'unrelated']) {
			await sw.caches.open(name);
		}

		await sw.lifecycle('activate');

		expect([...sw.stores.keys()]).toEqual([STATIC_CACHE, RUNTIME_CACHE]);
		expect(sw.caches.delete).toHaveBeenCalledTimes(2);
		expect(sw.worker.clients.claim).toHaveBeenCalledTimes(1);
	});

	it('activates a waiting update when the page asks it to', async () => {
		const sw = await loadWorker();

		sw.dispatch('message', { data: { type: 'OTHER' } });
		sw.dispatch('message', { data: null });
		sw.dispatch('message', {});
		expect(sw.worker.skipWaiting).not.toHaveBeenCalled();

		sw.dispatch('message', { data: { type: 'SKIP_WAITING' } });
		expect(sw.worker.skipWaiting).toHaveBeenCalledTimes(1);
	});
});

describe('service worker fetch handling', () => {
	it('leaves non-GET and cross-origin requests to the browser', async () => {
		const sw = await loadWorker();

		expect(sw.fetch({ path: '/favicon.ico', method: 'POST' }).responded()).toBeNull();
		expect(
			sw.fetch({ path: 'https://api.cropwatch.test/favicon.ico', destination: 'image' }).responded()
		).toBeNull();
		expect(sw.network).not.toHaveBeenCalled();
	});

	describe('precached files', () => {
		it('are answered from the static cache', async () => {
			const sw = await loadWorker();
			await sw.lifecycle('install');

			const response = await sw.fetch({ path: '/favicon.ico' }).responded();

			await expect(response?.text()).resolves.toBe('precached /favicon.ico');
			expect(sw.network).not.toHaveBeenCalled();
		});

		it('come from the network when missing, and are cached for next time', async () => {
			const sw = await loadWorker();
			sw.network.mockResolvedValue(new Response('fresh app.js'));

			const { request, responded } = sw.fetch({ path: '/_app/immutable/app.js' });
			const response = await responded();

			await expect(response?.text()).resolves.toBe('fresh app.js');
			expect(sw.network).toHaveBeenCalledWith(request);
			const staticCache = await sw.cache(STATIC_CACHE);
			expect(staticCache.put).toHaveBeenCalledWith(request, expect.any(Response));
			await expect(staticCache.entries.get(request.url)?.text()).resolves.toBe('fresh app.js');
		});

		it.each([
			['a failed response', new Response('missing', { status: 404 })],
			['a no-store response', new Response('x', { headers: { 'cache-control': 'no-store' } })]
		])('are not cached from %s', async (_label, networkResponse) => {
			const sw = await loadWorker();
			sw.network.mockResolvedValue(networkResponse);

			const response = await sw.fetch({ path: '/favicon.ico' }).responded();

			expect(response).toBe(networkResponse);
			expect((await sw.cache(STATIC_CACHE)).put).not.toHaveBeenCalled();
		});
	});

	describe('navigations', () => {
		it('go to the network first', async () => {
			const sw = await loadWorker();
			const page = new Response('<html>locations</html>');
			sw.network.mockResolvedValue(page);

			const response = await sw.fetch({ path: '/locations', mode: 'navigate' }).responded();

			expect(response).toBe(page);
		});

		it('show the cached offline page when the network is down', async () => {
			const sw = await loadWorker();
			const staticCache = await sw.cache(STATIC_CACHE);
			staticCache.entries.set(`${ORIGIN}/offline`, new Response('offline page'));
			sw.network.mockRejectedValue(new TypeError('Failed to fetch'));

			const response = await sw.fetch({ path: '/locations', mode: 'navigate' }).responded();

			await expect(response?.text()).resolves.toBe('offline page');
			expect(staticCache.match).toHaveBeenCalledWith('/offline');
		});

		it('fail with the network error when no offline page is cached', async () => {
			const sw = await loadWorker();
			const failure = new TypeError('Failed to fetch');
			sw.network.mockRejectedValue(failure);

			await expect(sw.fetch({ path: '/rules', mode: 'navigate' }).responded()).rejects.toBe(
				failure
			);
		});
	});

	describe('runtime assets', () => {
		it('serve the cached copy at once and refresh it in the background', async () => {
			const sw = await loadWorker();
			const runtimeCache = await sw.cache(RUNTIME_CACHE);
			runtimeCache.entries.set(`${ORIGIN}/fonts/inter.woff2`, new Response('old font'));
			sw.network.mockResolvedValue(new Response('new font'));

			const { request, responded } = sw.fetch({
				path: '/fonts/inter.woff2',
				destination: 'font'
			});
			const response = await responded();

			await expect(response?.text()).resolves.toBe('old font');
			await vi.waitFor(() =>
				expect(runtimeCache.put).toHaveBeenCalledWith(request, expect.any(Response))
			);
			await expect(runtimeCache.entries.get(request.url)?.text()).resolves.toBe('new font');
		});

		it('keep serving the cached copy when the refresh fails', async () => {
			const sw = await loadWorker();
			const runtimeCache = await sw.cache(RUNTIME_CACHE);
			runtimeCache.entries.set(`${ORIGIN}/images/logo.png`, new Response('cached logo'));
			sw.network.mockRejectedValue(new TypeError('Failed to fetch'));

			const response = await sw
				.fetch({ path: '/images/logo.png', destination: 'image' })
				.responded();

			await expect(response?.text()).resolves.toBe('cached logo');
			expect(runtimeCache.put).not.toHaveBeenCalled();
		});

		it('come from the network the first time, and are cached', async () => {
			const sw = await loadWorker();
			sw.network.mockResolvedValue(new Response('body { }'));

			const { request, responded } = sw.fetch({ path: '/theme.css', destination: 'style' });
			const response = await responded();

			await expect(response?.text()).resolves.toBe('body { }');
			expect((await sw.cache(RUNTIME_CACHE)).put).toHaveBeenCalledWith(
				request,
				expect.any(Response)
			);
		});

		it('are not cached when the response may not be stored', async () => {
			const sw = await loadWorker();
			sw.network.mockResolvedValue(new Response('x', { status: 500 }));

			const response = await sw.fetch({ path: '/worker.js', destination: 'worker' }).responded();

			expect(response?.status).toBe(500);
			expect((await sw.cache(RUNTIME_CACHE)).put).not.toHaveBeenCalled();
		});

		it('fail with the network error when nothing is cached', async () => {
			const sw = await loadWorker();
			const failure = new TypeError('Failed to fetch');
			sw.network.mockRejectedValue(failure);

			await expect(
				sw.fetch({ path: '/manifest.webmanifest', destination: 'manifest' }).responded()
			).rejects.toBe(failure);
		});

		it.each(['font', 'image', 'manifest', 'script', 'style', 'worker'] as const)(
			'include %s requests',
			async (destination) => {
				const sw = await loadWorker();

				expect(sw.fetch({ path: '/asset', destination }).responded()).not.toBeNull();
			}
		);

		it.each(['', 'document', 'audio', 'video'] as const)(
			'leave "%s" requests to the browser',
			async (destination) => {
				const sw = await loadWorker();

				expect(sw.fetch({ path: '/asset', destination }).responded()).toBeNull();
			}
		);

		it.each([
			'/locations/__data.json',
			'/api/devices',
			'/src/lib/app.ts',
			'/@vite/client',
			'/deps/node_modules/svelte/index.js'
		])('never cache %s', async (path) => {
			const sw = await loadWorker();

			expect(sw.fetch({ path, destination: 'script' }).responded()).toBeNull();
			expect(sw.network).not.toHaveBeenCalled();
		});
	});

	it('scopes the offline page and the API paths to its base path', async () => {
		const sw = await loadWorker('/cropwatch/service-worker.js');
		const staticCache = await sw.cache(STATIC_CACHE);
		staticCache.entries.set(`${ORIGIN}/cropwatch/offline`, new Response('scoped offline page'));
		sw.network.mockRejectedValue(new TypeError('Failed to fetch'));

		const offline = await sw.fetch({ path: '/cropwatch/rules', mode: 'navigate' }).responded();
		await expect(offline?.text()).resolves.toBe('scoped offline page');
		expect(staticCache.match).toHaveBeenCalledWith('/cropwatch/offline');

		expect(
			sw.fetch({ path: '/cropwatch/api/devices', destination: 'script' }).responded()
		).toBeNull();
		// Outside the base path, /api/ is just another asset path.
		const outside = sw.fetch({ path: '/api/devices.js', destination: 'script' }).responded();
		expect(outside).not.toBeNull();
		await expect(outside).rejects.toThrow('Failed to fetch');
	});
});
