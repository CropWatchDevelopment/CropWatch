import { afterEach, describe, expect, it, vi } from 'vitest';
import type { IJWT } from '$lib/interfaces/jwt.interface';
import { renderWithServices } from '$lib/testing/render';
import Analytics from './Analytics.svelte';

// The Vite dev server, with a measurement id configured anyway.
const runtime = vi.hoisted(() => ({ afterNavigate: [] as Array<() => Promise<void> | void> }));
vi.mock('$app/environment', () => ({ browser: true, building: false, version: 'test', dev: true }));
vi.mock('$env/dynamic/public', () => ({ env: { PUBLIC_GA_MEASUREMENT_ID: 'G-TEST123' } }));
vi.mock('$app/navigation', () => ({
	afterNavigate: (callback: () => Promise<void> | void) => runtime.afterNavigate.push(callback)
}));
vi.mock('$app/state', () => ({ page: { url: new URL('http://localhost/') } }));

const gtag = vi.hoisted(() => ({
	initAnalytics: vi.fn(),
	trackPageView: vi.fn(),
	setAnalyticsUser: vi.fn()
}));
vi.mock('$lib/analytics/gtag', () => gtag);

let view: ReturnType<typeof renderWithServices> | null = null;

afterEach(() => {
	view?.unmount();
	view = null;
});

describe('Analytics on the dev server', () => {
	it('never reports local traffic', async () => {
		view = renderWithServices(Analytics, {
			app: { session: { sub: 'user-1', email: 'a@example.com', exp: 4102444800 } as IJWT }
		});

		for (const callback of runtime.afterNavigate) await callback();

		expect(runtime.afterNavigate).toHaveLength(1);
		expect(gtag.initAnalytics).not.toHaveBeenCalled();
		expect(gtag.trackPageView).not.toHaveBeenCalled();
		expect(gtag.setAnalyticsUser).not.toHaveBeenCalled();
	});
});
