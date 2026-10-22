import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('$service-worker', () => ({ version: 'test-1' }));

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
		skipWaiting: vi.fn(async () => undefined),
		registration: { navigationPreload: { enable: vi.fn(async () => undefined) } } as {
			navigationPreload?: { enable: () => Promise<void> };
		}
	};
	const caches = {
		open: vi.fn(async (name: string) => {
			if (!stores.has(name)) stores.set(name, new FakeCache());
			return stores.get(name)!;
		}),
		keys: vi.fn(async () => [...stores.keys()]),
		match: vi.fn(async (request: WorkerRequest) => {
			for (const store of stores.values()) {
				const hit = await store.match(request);
				if (hit) return hit;
			}
			return undefined;
		}),
		delete: vi.fn(async (name: string) => stores.delete(name))
	};
	const network = vi.fn<(request: WorkerRequest | string) => Promise<Response>>(
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
		fetch(
			init: Partial<WorkerRequest> & {
				path: string;
				preloadResponse?: Promise<Response | undefined>;
			}
		) {
			const request: WorkerRequest = {
				url: new URL(init.path, ORIGIN).href,
				method: init.method ?? 'GET',
				mode: init.mode ?? 'cors',
				destination: init.destination ?? ''
			};
			let responded: Promise<Response> | null = null;
			this.dispatch('fetch', {
				request,
				preloadResponse: init.preloadResponse ?? Promise.resolve(undefined),
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

/** The offline page as the server renders it (never hydrated: no scripts of its own). */
const OFFLINE_HTML = `<!doctype html><html><head>
<link href="./_app/immutable/assets/0.abc.css" rel="stylesheet">
<link href="/_app/immutable/assets/offline.def.css" rel="stylesheet">
<link href="./_app/immutable/assets/0.abc.css" rel="stylesheet">
<link rel="icon" href="./icons/favicon.svg">
<script src="https://www.googletagmanager.com/gtag/js"></script>
</head><body><a href="">Try again</a></body></html>`;

describe('service worker lifecycle', () => {
	it('caches the offline page and the stylesheets it links to, then takes over at once', async () => {
		const sw = await loadWorker();
		sw.network.mockResolvedValue(new Response(OFFLINE_HTML));

		await sw.lifecycle('install');

		expect(sw.network).toHaveBeenCalledWith('/offline');
		const staticCache = await sw.cache(STATIC_CACHE);
		expect(staticCache.addAll).toHaveBeenCalledWith([
			'/_app/immutable/assets/0.abc.css',
			'/_app/immutable/assets/offline.def.css'
		]);
		// Shown at whatever URL failed, so page-relative links are made absolute;
		// the retry link (the current URL) stays as it is.
		const cached = await staticCache.entries.get(`${ORIGIN}/offline`)?.text();
		expect(cached).toContain('<link href="/_app/immutable/assets/0.abc.css"');
		expect(cached).toContain('<link rel="icon" href="/icons/favicon.svg">');
		expect(cached).not.toContain('"./');
		expect(cached).toContain('<a href="">Try again</a>');
		expect(sw.worker.skipWaiting).toHaveBeenCalledTimes(1);
	});

	it('makes the offline page’s links absolute under its base path', async () => {
		const sw = await loadWorker('/cropwatch/service-worker.js');
		sw.network.mockResolvedValue(
			new Response('<link href="./_app/immutable/assets/0.abc.css" rel="stylesheet">', {
				headers: { 'content-type': 'text/html; charset=utf-8' }
			})
		);

		await sw.lifecycle('install');

		expect(sw.network).toHaveBeenCalledWith('/cropwatch/offline');
		const staticCache = await sw.cache(STATIC_CACHE);
		expect(staticCache.addAll).toHaveBeenCalledWith(['/cropwatch/_app/immutable/assets/0.abc.css']);
		const cached = staticCache.entries.get(`${ORIGIN}/cropwatch/offline`);
		expect(cached?.headers.get('content-type')).toBe('text/html; charset=utf-8');
	});

	it('fails to install (and is retried later) when the offline page cannot be fetched', async () => {
		const sw = await loadWorker();
		sw.network.mockResolvedValue(new Response('down', { status: 503 }));

		await expect(sw.lifecycle('install')).rejects.toThrow('Offline page answered 503');
		expect(sw.worker.skipWaiting).not.toHaveBeenCalled();
	});

	it('drops the caches of other versions, turns on navigation preload and takes control', async () => {
		const sw = await loadWorker();
		for (const name of [STATIC_CACHE, RUNTIME_CACHE, 'cropwatch-static-test-0', 'unrelated']) {
			await sw.caches.open(name);
		}

		await sw.lifecycle('activate');

		expect([...sw.stores.keys()]).toEqual([STATIC_CACHE, RUNTIME_CACHE]);
		expect(sw.caches.delete).toHaveBeenCalledTimes(2);
		expect(sw.worker.registration.navigationPreload?.enable).toHaveBeenCalledTimes(1);
		expect(sw.worker.clients.claim).toHaveBeenCalledTimes(1);
	});

	it('still takes control where navigation preload is not supported', async () => {
		const sw = await loadWorker();
		sw.worker.registration.navigationPreload = undefined;

		await sw.lifecycle('activate');

		expect(sw.worker.clients.claim).toHaveBeenCalledTimes(1);
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

	describe('build output (content-hashed)', () => {
		it('is answered from any cache without the network', async () => {
			const sw = await loadWorker();
			const staticCache = await sw.cache(STATIC_CACHE);
			staticCache.entries.set(`${ORIGIN}/_app/immutable/entry/start.def.js`, new Response('start'));

			const response = await sw
				.fetch({ path: '/_app/immutable/entry/start.def.js', destination: 'script' })
				.responded();

			await expect(response?.text()).resolves.toBe('start');
			expect(sw.network).not.toHaveBeenCalled();
		});

		it('comes from the network the first time, and is cached for next time', async () => {
			const sw = await loadWorker();
			sw.network.mockResolvedValue(new Response('chunk'));

			const { request, responded } = sw.fetch({
				path: '/_app/immutable/chunks/x.js',
				destination: 'script'
			});
			const response = await responded();

			await expect(response?.text()).resolves.toBe('chunk');
			expect(sw.network).toHaveBeenCalledWith(request);
			const runtimeCache = await sw.cache(RUNTIME_CACHE);
			await expect(runtimeCache.entries.get(request.url)?.text()).resolves.toBe('chunk');
		});

		it.each([
			['a failed response', new Response('missing', { status: 404 })],
			['a no-store response', new Response('x', { headers: { 'cache-control': 'no-store' } })]
		])('is not cached from %s', async (_label, networkResponse) => {
			const sw = await loadWorker();
			sw.network.mockResolvedValue(networkResponse);

			const response = await sw
				.fetch({ path: '/_app/immutable/chunks/x.js', destination: 'script' })
				.responded();

			expect(response).toBe(networkResponse);
			expect((await sw.cache(RUNTIME_CACHE)).put).not.toHaveBeenCalled();
		});
	});

	describe('navigations', () => {
		it('use the preloaded response when the browser started one', async () => {
			const sw = await loadWorker();
			const page = new Response('<html>preloaded</html>');

			const response = await sw
				.fetch({ path: '/locations', mode: 'navigate', preloadResponse: Promise.resolve(page) })
				.responded();

			expect(response).toBe(page);
			expect(sw.network).not.toHaveBeenCalled();
		});

		it('go to the network otherwise', async () => {
			const sw = await loadWorker();
			const page = new Response('<html>locations</html>');
			sw.network.mockResolvedValue(page);

			const response = await sw.fetch({ path: '/locations', mode: 'navigate' }).responded();

			expect(response).toBe(page);
		});

		it.each([
			['the network is down', undefined],
			['the preload failed', () => Promise.reject(new TypeError('Failed to fetch'))]
		])('show the cached offline page when %s', async (_label, preload) => {
			const sw = await loadWorker();
			const staticCache = await sw.cache(STATIC_CACHE);
			staticCache.entries.set(`${ORIGIN}/offline`, new Response('offline page'));
			sw.network.mockRejectedValue(new TypeError('Failed to fetch'));

			const response = await sw
				.fetch({ path: '/locations', mode: 'navigate', preloadResponse: preload?.() })
				.responded();

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
		staticCache.entries.set(`${ORIGIN}/cropwatch/_app/immutable/a.js`, new Response('scoped'));
		const chunk = await sw
			.fetch({ path: '/cropwatch/_app/immutable/a.js', destination: 'script' })
			.responded();
		await expect(chunk?.text()).resolves.toBe('scoped');
		// Outside the base path, /api/ is just another asset path.
		const outside = sw.fetch({ path: '/api/devices.js', destination: 'script' }).responded();
		expect(outside).not.toBeNull();
		await expect(outside).rejects.toThrow('Failed to fetch');
	});
});
