import { flushSync } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { IJWT } from '$lib/interfaces/jwt.interface';
import { renderWithServices } from '$lib/testing/render';
import Analytics from './Analytics.svelte';

// Boundaries: the SvelteKit runtime (env, dev flag, router, page) and gtag.js,
// which would load Google's script. The dev-server case is in
// Analytics-dev.svelte.spec.ts: a mocked module's exports are fixed per file.
const runtime = vi.hoisted(() => ({
	env: {} as Record<string, string | undefined>,
	afterNavigate: [] as Array<() => Promise<void> | void>
}));
vi.mock('$app/environment', () => ({
	browser: true,
	building: false,
	version: 'test',
	dev: false
}));
vi.mock('$env/dynamic/public', () => ({ env: runtime.env }));
vi.mock('$app/navigation', () => ({
	afterNavigate: (callback: () => Promise<void> | void) => runtime.afterNavigate.push(callback)
}));
vi.mock('$app/state', () => ({
	page: { url: new URL('http://localhost/locations/8?tab=devices') }
}));

const gtag = vi.hoisted(() => ({
	initAnalytics: vi.fn(),
	trackPageView: vi.fn(),
	setAnalyticsUser: vi.fn()
}));
vi.mock('$lib/analytics/gtag', () => gtag);

const session = (sub: string) => ({ sub, email: `${sub}@example.com`, exp: 4102444800 }) as IJWT;

let view: ReturnType<typeof renderWithServices> | null = null;

function render(sessionValue: IJWT | null = null) {
	view = renderWithServices(Analytics, { app: { session: sessionValue } });
	return view;
}

async function navigated() {
	for (const callback of runtime.afterNavigate) await callback();
}

beforeEach(() => {
	runtime.env.PUBLIC_GA_MEASUREMENT_ID = 'G-TEST123';
	runtime.afterNavigate.length = 0;
});

afterEach(() => {
	view?.unmount();
	view = null;
	vi.clearAllMocks();
});

describe('Analytics', () => {
	it('starts GA for the signed-in user and records each page view', async () => {
		render(session('user-1'));

		await navigated();

		expect(gtag.initAnalytics).toHaveBeenCalledWith('G-TEST123', { userId: 'user-1' });
		expect(gtag.trackPageView).toHaveBeenCalledWith('/locations/8?tab=devices');
		expect(gtag.initAnalytics.mock.invocationCallOrder[0]).toBeLessThan(
			gtag.trackPageView.mock.invocationCallOrder[0]
		);
	});

	it('starts GA without a user id for anonymous visitors', async () => {
		render(null);

		await navigated();

		expect(gtag.initAnalytics).toHaveBeenCalledWith('G-TEST123', { userId: null });
		expect(gtag.trackPageView).toHaveBeenCalledTimes(1);
	});

	it("keeps GA's user id in step with the session", () => {
		render(session('user-1'));
		expect(gtag.setAnalyticsUser).toHaveBeenLastCalledWith('user-1');

		view!.app.session = session('user-2');
		flushSync();
		expect(gtag.setAnalyticsUser).toHaveBeenLastCalledWith('user-2');

		view!.app.session = null;
		flushSync();
		expect(gtag.setAnalyticsUser).toHaveBeenLastCalledWith(null);
	});

	it('does nothing without a measurement id', async () => {
		delete runtime.env.PUBLIC_GA_MEASUREMENT_ID;
		render(session('user-1'));

		await navigated();

		expect(gtag.initAnalytics).not.toHaveBeenCalled();
		expect(gtag.trackPageView).not.toHaveBeenCalled();
		expect(gtag.setAnalyticsUser).not.toHaveBeenCalled();
	});

	it('renders nothing', () => {
		render(session('user-1'));

		expect(view!.target.innerHTML.replace(/<!---->/g, '').trim()).toBe('');
	});
});
