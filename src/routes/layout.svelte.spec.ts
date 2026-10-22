import { createRawSnippet, flushSync } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MeContextDto, PreferencesDto, RuleTemplateDto } from '$lib/api/api.dtos';
import type { PushRepository } from '$lib/api/repositories/push.repository';
import type { IJWT } from '$lib/interfaces/jwt.interface';
import type { Profile } from '$lib/interfaces/profile.interface';
import { m } from '$lib/paraglide/messages.js';
import { createFakeFetch, jsonResponse } from '$lib/testing/http';
import { renderWithServices } from '$lib/testing/render';
import { APPLE_SPLASH_LINKS } from '$lib/pwa/apple-splash';
import RootLayout from './+layout.svelte';

// --- Boundaries --------------------------------------------------------------
// The browser services are real (the layout is their composition root); only
// the network under them is faked. Config comes from this env.
vi.mock('$env/dynamic/public', () => ({
	env: { PUBLIC_API_BASE_URL: 'https://api.cropwatch.test' }
}));

/** `page` as SvelteKit provides it: `url` and `data` are reactive. */
const routing = vi.hoisted(() => ({ store: undefined as Map<string, unknown> | undefined }));
vi.mock('$app/state', async () => {
	const { SvelteMap } = await import('svelte/reactivity');
	const store = new SvelteMap<string, unknown>([
		['url', new URL('http://localhost/')],
		['data', {}]
	]);
	routing.store = store;
	return {
		page: {
			get url() {
				return store.get('url');
			},
			get data() {
				return store.get('data');
			},
			params: {}
		},
		updated: { current: false, check: async () => false }
	};
});

const nav = vi.hoisted(() => ({
	goto: vi.fn(),
	afterNavigate: vi.fn(),
	invalidate: vi.fn(async () => undefined)
}));
vi.mock('$app/navigation', () => nav);

type ForegroundHandler = (message: { title: string; body?: string }) => void;
const push = vi.hoisted(() => ({
	refreshPushToken: vi.fn(),
	initForegroundMessages: vi.fn(),
	unsubscribe: vi.fn(),
	onMessage: null as ForegroundHandler | null
}));
vi.mock('$lib/push/push-notifications', () => ({
	refreshPushToken: push.refreshPushToken,
	initForegroundMessages: push.initForegroundMessages
}));

const expiry = vi.hoisted(() => ({
	options: null as null | {
		getExpSeconds: () => number | null | undefined;
		onExpired: () => void;
		onRenew: () => Promise<unknown>;
		renewLeadMs: number;
	},
	rearm: vi.fn(),
	destroy: vi.fn()
}));
vi.mock('$lib/utils/session-expiry', () => ({
	createSessionExpiryWatcher: vi.fn((options: NonNullable<typeof expiry.options>) => {
		expiry.options = options;
		return { rearm: expiry.rearm, destroy: expiry.destroy };
	})
}));

// --- Fixtures ----------------------------------------------------------------
const SESSION = { sub: 'user-1', email: 'grower@example.com', exp: 4102444800 } as IJWT;
const PROFILE = { id: 'user-1', full_name: 'Kevin Tanaka' } as unknown as Profile;
const PREFERENCES = { user_id: 'user-1', temperature_unit: 'celsius' } as PreferencesDto;
const ORG_CONTEXT = { orgs_enabled: true, is_staff: false, org: null } as unknown as MeContextDto;
const RULES = [{ id: 3, name: 'Freezer too warm' }] as unknown as RuleTemplateDto[];

function signedInData(authToken = 'jwt-1', session: IJWT = SESSION) {
	return {
		session,
		authToken,
		profile: PROFILE,
		preferences: PREFERENCES,
		orgContext: ORG_CONTEXT,
		overview: {
			deviceStatuses: { online: 5, offline: 2 },
			triggeredRules: RULES,
			triggeredRulesCount: 1
		}
	};
}

function setPage(
	path: string,
	data: Record<string, unknown> = routing.store!.get('data') as never
) {
	routing.store!.set('url', new URL(path, 'http://localhost'));
	routing.store!.set('data', data);
}

let fake: ReturnType<typeof createFakeFetch>;
let view: ReturnType<typeof renderWithServices> | null = null;

function render() {
	const children = createRawSnippet(() => ({
		render: () => '<p class="page-child">Page content</p>'
	}));
	view = renderWithServices(RootLayout, {
		props: { children, data: {}, params: {} } as never
	});
	return view;
}

const requestsTo = (path: string) => fake.requests.filter((request) => request.path === path);
const sidenav = () => document.querySelector('.cw-sidenav');

beforeEach(() => {
	setPage('/locations?tab=map', signedInData());
	fake = createFakeFetch((request) => {
		if (request.path === '/auth/whats-new') {
			return jsonResponse({ current_release: 1, seen_release: 1, show: false });
		}
		return jsonResponse([]);
	});
	vi.stubGlobal('fetch', fake.fetch);
	push.refreshPushToken.mockResolvedValue(undefined);
	push.initForegroundMessages.mockImplementation(async (onMessage: ForegroundHandler) => {
		push.onMessage = onMessage;
		return push.unsubscribe;
	});
	expiry.options = null;
});

afterEach(() => {
	view?.unmount();
	view = null;
	vi.unstubAllGlobals();
	vi.clearAllMocks();
	push.onMessage = null;
});

describe('root layout app context', () => {
	it('mirrors the root load data into the app context', () => {
		const { app } = render();

		// The context is deep $state, so objects come back as reactive proxies.
		expect(app.session).toEqual(SESSION);
		expect(app.accessToken).toBe('jwt-1');
		expect(app.profile).toEqual(PROFILE);
		expect(app.preferences).toEqual(PREFERENCES);
		expect(app.orgContext).toEqual(ORG_CONTEXT);
		expect(app.deviceStatuses).toEqual({ online: 5, offline: 2 });
		expect(app.triggeredRules).toEqual(RULES);
		expect(app.triggeredRulesCount).toBe(1);
	});

	it('fills the signed-out defaults when the load returns nothing', () => {
		setPage('/locations', { authToken: null, session: null });

		const { app } = render();

		expect(app.session).toBeNull();
		expect(app.accessToken).toBeUndefined();
		expect(app.profile).toBeUndefined();
		expect(app.preferences).toBeUndefined();
		expect(app.orgContext).toBeUndefined();
		expect(app.deviceStatuses).toEqual({ online: 0, offline: 0 });
		expect(app.triggeredRules).toEqual([]);
		expect(app.triggeredRulesCount).toBe(0);
	});

	it('re-syncs whenever the page data changes (navigation, invalidateAll, login)', () => {
		setPage('/auth/login', {});
		const { app } = render();
		expect(app.accessToken).toBeUndefined();

		setPage('/', signedInData('jwt-after-login'));
		flushSync();

		expect(app.accessToken).toBe('jwt-after-login');
		expect(app.session).toEqual(SESSION);
		expect(app.triggeredRulesCount).toBe(1);

		setPage('/', { session: null, authToken: null });
		flushSync();

		expect(app.accessToken).toBeUndefined();
		expect(app.deviceStatuses).toEqual({ online: 0, offline: 0 });
	});
});

describe('root layout services', () => {
	it('gives the app services that send the current session token', async () => {
		render();

		await vi.waitFor(() => expect(requestsTo('/auth/whats-new')).toHaveLength(1));
		expect(requestsTo('/auth/whats-new')[0].url).toBe('https://api.cropwatch.test/auth/whats-new');
		expect(requestsTo('/auth/whats-new')[0].headers.get('authorization')).toBe('Bearer jwt-1');
	});

	it('follows token refreshes without being rebuilt', async () => {
		render();
		await vi.waitFor(() => expect(push.refreshPushToken).toHaveBeenCalledTimes(1));
		const pushRepository = push.refreshPushToken.mock.calls[0][0] as PushRepository;

		setPage('/locations', signedInData('jwt-refreshed'));
		flushSync();
		await pushRepository.getPushDevices();

		expect(fake.requests.at(-1)?.headers.get('authorization')).toBe('Bearer jwt-refreshed');
	});
});

describe('root layout push notifications', () => {
	it('re-stamps this browser and listens for foreground pushes once a session exists', async () => {
		render();

		await vi.waitFor(() => expect(push.initForegroundMessages).toHaveBeenCalledTimes(1));
		expect(push.refreshPushToken).toHaveBeenCalledTimes(1);
		expect(push.refreshPushToken.mock.calls[0][0]).toEqual(
			expect.objectContaining({ refreshPushToken: expect.any(Function) })
		);
	});

	it('waits for the first token, then initialises only once', async () => {
		setPage('/auth/login', {});
		render();
		await new Promise((resolve) => setTimeout(resolve, 20));
		expect(push.refreshPushToken).not.toHaveBeenCalled();

		setPage('/', signedInData('jwt-1'));
		flushSync();
		setPage('/', signedInData('jwt-2'));
		flushSync();

		await vi.waitFor(() => expect(push.initForegroundMessages).toHaveBeenCalledTimes(1));
		expect(push.refreshPushToken).toHaveBeenCalledTimes(1);
	});

	it('shows a foreground push as a dismissible warning toast', async () => {
		render();
		await vi.waitFor(() => expect(push.onMessage).not.toBeNull());

		push.onMessage!({ title: 'Freezer A', body: 'Too warm' });
		push.onMessage!({ title: 'Door open' });
		flushSync();

		const toasts = [...document.querySelectorAll('.cw-toast')];
		expect(toasts.map((toast) => toast.querySelector('.cw-toast__message')?.textContent)).toEqual([
			'Freezer A — Too warm',
			'Door open'
		]);
		for (const toast of toasts) {
			expect(toast.classList.contains('cw-toast--warning')).toBe(true);
			expect(toast.querySelector('.cw-toast__close')).not.toBeNull();
		}
	});

	it('stops listening when the app shell goes away', async () => {
		render();
		await vi.waitFor(() => expect(push.onMessage).not.toBeNull());
		await Promise.resolve();

		view!.unmount();
		view = null;

		expect(push.unsubscribe).toHaveBeenCalledTimes(1);
	});
});

describe('root layout session expiry', () => {
	it('watches the session expiry and re-arms when the session changes', () => {
		const { app } = render();

		expect(expiry.options?.getExpSeconds()).toBe(SESSION.exp);
		expect(expiry.rearm).toHaveBeenCalledTimes(1);

		setPage('/locations', signedInData('jwt-2', { ...SESSION, exp: SESSION.exp + 3_600 }));
		flushSync();

		expect(expiry.rearm).toHaveBeenCalledTimes(2);
		expect(expiry.options?.getExpSeconds()).toBe(SESSION.exp + 3_600);

		app.session = null;
		flushSync();
		expect(expiry.options?.getExpSeconds()).toBeNull();
	});

	it('clears the app and sends the user to log in, back to this page, when the session expires', () => {
		setPage('/locations/8?tab=map', signedInData());
		const { app } = render();

		expiry.options!.onExpired();

		expect(nav.goto).toHaveBeenCalledWith(
			'/auth/login?redirect=%2Flocations%2F8%3Ftab%3Dmap&reason=expired'
		);
		expect(app.accessToken).toBeUndefined();
		expect(app.session).toBeNull();
		expect(app.profile).toBeUndefined();
		expect(app.orgContext).toBeUndefined();
		expect(app.triggeredRules).toEqual([]);
	});

	it('renews the session five minutes before it runs out by re-running the root load', async () => {
		render();

		expect(expiry.options?.renewLeadMs).toBe(5 * 60 * 1000);
		await expiry.options!.onRenew();

		expect(nav.invalidate).toHaveBeenCalledWith('app:session');
	});

	it('does nothing on the login and logout pages', () => {
		setPage('/auth/logout', signedInData());
		const { app } = render();

		expiry.options!.onExpired();

		expect(nav.goto).not.toHaveBeenCalled();
		expect(app.accessToken).toBe('jwt-1');
	});

	it('stops watching when the app shell goes away', () => {
		render();

		view!.unmount();
		view = null;

		expect(expiry.destroy).toHaveBeenCalledTimes(1);
	});
});

describe('root layout shell', () => {
	it('frames app pages with the side navigation, header and what’s-new dialog', () => {
		render();

		const main = document.querySelector('.app-shell__content > main.app-shell__main');
		expect(main?.classList.contains('app-shell__main--standalone')).toBe(false);
		expect(main?.querySelector('.page-child')?.textContent).toBe('Page content');
		expect(sidenav()).not.toBeNull();
		expect(document.querySelector('.app-header')).not.toBeNull();
		expect(document.querySelector('dialog.cw-dialog')?.textContent).toContain(m.whats_new_title());
	});

	it.each(['/auth/login', '/offline'])('shows %s on its own, without the app chrome', (path) => {
		setPage(path, {});

		render();

		const main = document.querySelector('.app-shell > main.app-shell__main');
		expect(main?.classList.contains('app-shell__main--standalone')).toBe(true);
		expect(main?.querySelector('.page-child')).not.toBeNull();
		expect(sidenav()).toBeNull();
		expect(document.querySelector('.app-header')).toBeNull();
		expect(document.querySelector('dialog.cw-dialog')).toBeNull();
	});

	it('shows the install and update dock everywhere but the offline page', () => {
		render();
		expect(document.querySelector('.pwa-dock')).not.toBeNull();

		setPage('/auth/login', {});
		flushSync();
		expect(document.querySelector('.pwa-dock')).not.toBeNull();

		setPage('/offline', {});
		flushSync();
		expect(document.querySelector('.pwa-dock')).toBeNull();
	});

	it('switches between the two shells as the route changes', () => {
		render();
		expect(sidenav()).not.toBeNull();

		setPage('/auth/login', {});
		flushSync();

		expect(sidenav()).toBeNull();
		expect(document.querySelector('.app-shell__main--standalone')).not.toBeNull();
	});

	it('suspends side-navigation transitions while the window is resized', async () => {
		render();

		window.dispatchEvent(new Event('resize'));
		expect(sidenav()?.classList.contains('cw-sidenav--resizing')).toBe(true);
		window.dispatchEvent(new Event('resize'));

		await expect.poll(() => sidenav()?.classList.contains('cw-sidenav--resizing')).toBe(false);
	});

	it('cancels a pending resize timer when the shell goes away', () => {
		render();
		const setTimeoutSpy = vi.spyOn(window, 'setTimeout');
		window.dispatchEvent(new Event('resize'));
		const resizeTimer =
			setTimeoutSpy.mock.results[setTimeoutSpy.mock.calls.findIndex(([, delay]) => delay === 100)]
				?.value;
		setTimeoutSpy.mockRestore();
		const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout');

		view!.unmount();
		view = null;

		expect(resizeTimer).toBeDefined();
		expect(clearTimeoutSpy).toHaveBeenCalledWith(resizeTimer);
		clearTimeoutSpy.mockRestore();
	});

	it('links the web manifest, icons and theme colours', () => {
		render();

		const head = document.head;
		const manifest = head.querySelector('link[rel="manifest"]');
		expect(manifest?.getAttribute('href')).toBe('/manifest.webmanifest');
		// Sends the locale cookie, so the manifest comes back in the user's language.
		expect(manifest?.getAttribute('crossorigin')).toBe('use-credentials');
		const splash = [...head.querySelectorAll('link[rel="apple-touch-startup-image"]')];
		expect(splash).toHaveLength(APPLE_SPLASH_LINKS.length);
		expect(splash[0]?.getAttribute('href')).toBe(APPLE_SPLASH_LINKS[0]?.path);
		expect(splash[0]?.getAttribute('media')).toBe(APPLE_SPLASH_LINKS[0]?.media);
		expect(
			[...head.querySelectorAll('link[rel="icon"]')].map((link) => link.getAttribute('href'))
		).toEqual(
			expect.arrayContaining([
				'/icons/favicon.svg',
				'/icons/icon-32x32.png',
				'/icons/icon-192x192.png'
			])
		);
		expect(head.querySelector('link[rel="apple-touch-icon"]')?.getAttribute('href')).toBe(
			'/icons/apple-touch-icon.png'
		);
		expect(head.querySelector('meta[name="application-name"]')?.getAttribute('content')).toBe(
			'CropWatch'
		);
		expect(
			[...head.querySelectorAll('meta[name="theme-color"]')].map((meta) => [
				meta.getAttribute('content'),
				meta.getAttribute('media')
			])
		).toEqual(
			expect.arrayContaining([
				['#1f283b', null],
				['#eef1f7', '(prefers-color-scheme: light)'],
				['#1f283b', '(prefers-color-scheme: dark)']
			])
		);
	});

	it('links every language version of the current page for crawlers', () => {
		render();

		const links = [...document.querySelectorAll('div[style="display:none"] a')].map((link) => [
			link.textContent,
			link.getAttribute('href')
		]);
		expect(links).toEqual([
			['ja', '/locations'],
			['en', '/en/locations']
		]);
	});
});
