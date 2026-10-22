import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

type GtagModule = typeof import('./gtag');

// Transform the module once up front, outside any test's timeout (the first
// transform can be slow while the dev server is busy); re-imports are cached.
beforeAll(async () => {
	await import('./gtag');
}, 60_000);

interface FakeWindow {
	dataLayer?: unknown[];
	gtag?: (...args: unknown[]) => void;
	location: { href: string };
}

/**
 * A fresh copy of the module (it remembers the active measurement id) inside a
 * fake browser: `document.head` records the injected script instead of loading it.
 */
async function loadGtag(options: { dataLayer?: unknown[] } = {}) {
	const appended: Array<{ async?: boolean; src?: string }> = [];
	const fakeWindow: FakeWindow = {
		location: { href: 'https://app.cropwatch.test/locations?tab=map' },
		...(options.dataLayer ? { dataLayer: options.dataLayer } : {})
	};
	const fakeDocument = {
		title: 'Locations | CropWatch',
		head: { appendChild: vi.fn((node: { async?: boolean; src?: string }) => appended.push(node)) },
		createElement: vi.fn(() => ({}) as { async?: boolean; src?: string })
	};
	vi.stubGlobal('window', fakeWindow);
	vi.stubGlobal('document', fakeDocument);
	vi.resetModules();
	const gtag: GtagModule = await import('./gtag');
	return { gtag, window: fakeWindow, document: fakeDocument, appended };
}

/** The data-layer entries as plain arrays (gtag.js queues `arguments` objects). */
const entries = (dataLayer: unknown[] | undefined) =>
	(dataLayer ?? []).map((entry) => Array.from(entry as ArrayLike<unknown>));

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('initAnalytics', () => {
	it('loads gtag.js once and configures GA without the automatic page view', async () => {
		const { gtag, window, document, appended } = await loadGtag();

		gtag.initAnalytics('G-TEST123', { userId: 'user-1' });

		expect(document.createElement).toHaveBeenCalledWith('script');
		expect(appended).toEqual([
			{ async: true, src: 'https://www.googletagmanager.com/gtag/js?id=G-TEST123' }
		]);
		expect(entries(window.dataLayer)).toEqual([
			['js', expect.any(Date)],
			['config', 'G-TEST123', { send_page_view: false, user_id: 'user-1' }]
		]);
	});

	it('queues the live arguments objects gtag.js expects, not arrays', async () => {
		const { gtag, window } = await loadGtag();

		gtag.initAnalytics('G-TEST123');

		for (const entry of window.dataLayer ?? []) {
			expect(Array.isArray(entry)).toBe(false);
			expect(Object.prototype.toString.call(entry)).toBe('[object Arguments]');
		}
	});

	it('leaves the user id out for anonymous visitors', async () => {
		const { gtag, window } = await loadGtag();

		gtag.initAnalytics('G-TEST123', { userId: null });

		expect(entries(window.dataLayer)[1]).toEqual([
			'config',
			'G-TEST123',
			{ send_page_view: false }
		]);
	});

	it('keeps an existing data layer', async () => {
		const earlier = ['queued before GA loaded'];
		const { gtag, window } = await loadGtag({ dataLayer: earlier });

		gtag.initAnalytics('G-TEST123');

		expect(window.dataLayer).toBe(earlier);
		expect(window.dataLayer?.[0]).toBe('queued before GA loaded');
		expect(window.dataLayer).toHaveLength(3);
	});

	it('is idempotent per measurement id', async () => {
		const { gtag, appended } = await loadGtag();

		gtag.initAnalytics('G-TEST123');
		gtag.initAnalytics('G-TEST123');
		expect(appended).toHaveLength(1);

		gtag.initAnalytics('G-OTHER');
		expect(appended).toHaveLength(2);
	});

	it('does nothing without a measurement id', async () => {
		const { gtag, window, appended } = await loadGtag();

		gtag.initAnalytics('');

		expect(appended).toEqual([]);
		expect(window.dataLayer).toBeUndefined();
		expect(window.gtag).toBeUndefined();
	});
});

describe('trackPageView', () => {
	it('records a page view for the current page', async () => {
		const { gtag, window } = await loadGtag();
		gtag.initAnalytics('G-TEST123');

		gtag.trackPageView('/locations?tab=map');

		expect(entries(window.dataLayer).at(-1)).toEqual([
			'event',
			'page_view',
			{
				page_path: '/locations?tab=map',
				page_location: 'https://app.cropwatch.test/locations?tab=map',
				page_title: 'Locations | CropWatch'
			}
		]);
	});

	it('does nothing before GA is set up', async () => {
		const { gtag, window } = await loadGtag();

		gtag.trackPageView('/locations');

		expect(window.dataLayer).toBeUndefined();
	});
});

describe('setAnalyticsUser', () => {
	it("updates GA's user id on the active property", async () => {
		const { gtag, window } = await loadGtag();
		gtag.initAnalytics('G-TEST123', { userId: 'user-1' });

		gtag.setAnalyticsUser('user-2');
		gtag.setAnalyticsUser(null);

		expect(entries(window.dataLayer).slice(-2)).toEqual([
			['config', 'G-TEST123', { user_id: 'user-2' }],
			['config', 'G-TEST123', { user_id: null }]
		]);
	});

	it('does nothing before GA is set up', async () => {
		const { gtag, window } = await loadGtag();

		gtag.setAnalyticsUser('user-1');

		expect(window.dataLayer).toBeUndefined();
	});

	it('does nothing when another script defined gtag but GA was never initialised here', async () => {
		const { gtag, window } = await loadGtag();
		window.gtag = vi.fn();

		gtag.setAnalyticsUser('user-1');

		expect(window.gtag).not.toHaveBeenCalled();
	});
});

describe('outside the browser', () => {
	it('is a no-op during SSR', async () => {
		vi.resetModules();
		const gtag: GtagModule = await import('./gtag');

		expect(() => {
			gtag.initAnalytics('G-TEST123');
			gtag.trackPageView('/');
			gtag.setAnalyticsUser('user-1');
		}).not.toThrow();
		expect(typeof window).toBe('undefined');
	});
});
