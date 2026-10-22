import { flushSync } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { m } from '$lib/paraglide/messages.js';
import { NAVIGATE_MESSAGE } from '$lib/pwa/pwa-controller.svelte';
import { renderWithServices } from '$lib/testing/render';
import PwaDock from './PwaDock.svelte';

// A production build: the dock registers the service worker.
vi.mock('$app/environment', () => ({
	browser: true,
	dev: false,
	building: false,
	version: 'test'
}));

const nav = vi.hoisted(() => ({ goto: vi.fn() }));
vi.mock('$app/navigation', () => nav);

/** SvelteKit's `updated`, reactive like the real one. */
const versions = vi.hoisted(() => ({
	store: undefined as Map<string, boolean> | undefined,
	check: vi.fn(async () => false)
}));
vi.mock('$app/state', async () => {
	const { SvelteMap } = await import('svelte/reactivity');
	const store = new SvelteMap([['current', false]]);
	versions.store = store;
	return {
		updated: {
			get current() {
				return store.get('current');
			},
			check: versions.check
		}
	};
});

const IPHONE =
	'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';

let view: ReturnType<typeof renderWithServices> | null = null;
let registration: { update: ReturnType<typeof vi.fn> };
let register: ReturnType<typeof vi.fn>;
const badge = { set: vi.fn(async () => undefined), clear: vi.fn(async () => undefined) };

function render(props: { prompts?: boolean; badgeCount?: number } = {}) {
	view = renderWithServices(PwaDock, { props });
	flushSync();
	return view;
}

const dock = () => document.querySelector('.pwa-dock')!;
const button = (label: string) =>
	[...dock().querySelectorAll('button')].find((b) => b.textContent?.trim() === label)!;

function offerInstall(outcome: 'accepted' | 'dismissed' = 'accepted') {
	const event = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
		prompt: vi.fn(async () => undefined),
		userChoice: Promise.resolve({ outcome, platform: 'web' })
	});
	window.dispatchEvent(event);
	flushSync();
	return event;
}

beforeEach(() => {
	registration = { update: vi.fn(async () => undefined) };
	register = vi.fn(async () => registration);
	vi.spyOn(ServiceWorkerContainer.prototype, 'register').mockImplementation(register as never);
	Object.defineProperty(navigator, 'setAppBadge', { value: badge.set, configurable: true });
	Object.defineProperty(navigator, 'clearAppBadge', { value: badge.clear, configurable: true });
	localStorage.clear();
	versions.store!.set('current', false);
});

afterEach(() => {
	view?.unmount();
	view = null;
	vi.restoreAllMocks();
	vi.clearAllMocks();
	delete (navigator as Partial<Navigator>).setAppBadge;
	delete (navigator as Partial<Navigator>).clearAppBadge;
	localStorage.clear();
});

describe('PwaDock', () => {
	it('registers the offline service worker in a production build', async () => {
		render();

		await expect.poll(() => register.mock.calls).toEqual([['/service-worker.js']]);
		expect(dock().children).toHaveLength(0);
	});

	it('offers to install the app when Chromium can, and installs from the button', async () => {
		render();

		const event = offerInstall();
		expect(dock().textContent).toContain(m.pwa_install_title());

		button(m.action_install()).click();

		await expect.poll(() => event.prompt.mock.calls.length).toBe(1);
		await expect.poll(() => dock().children.length).toBe(0);
	});

	it('puts the install offer away on "not now"', () => {
		render();
		offerInstall();

		button(m.action_not_now()).click();
		flushSync();

		expect(dock().children).toHaveLength(0);
	});

	it('explains Add to Home Screen on an iPhone, until dismissed', () => {
		vi.spyOn(Navigator.prototype, 'userAgent', 'get').mockReturnValue(IPHONE);
		render();

		expect(dock().textContent).toContain(m.pwa_install_iphone_body());

		button(m.action_dismiss()).click();
		flushSync();

		expect(dock().children).toHaveLength(0);
	});

	it('never offers to install on the sign-in pages', () => {
		vi.spyOn(Navigator.prototype, 'userAgent', 'get').mockReturnValue(IPHONE);
		render({ prompts: false });
		offerInstall();

		expect(dock().children).toHaveLength(0);
	});

	it('offers a reload when a new version is deployed, even on the sign-in pages', async () => {
		render({ prompts: false });
		await expect.poll(() => register.mock.calls.length).toBe(1);

		versions.store!.set('current', true);
		flushSync();

		expect(dock().textContent).toContain(m.pwa_update_title());
		await expect.poll(() => registration.update.mock.calls.length).toBe(1);

		const navigation = (window as unknown as { navigation: EventTarget }).navigation;
		const attempts: string[] = [];
		const onNavigate = (event: Event) => {
			attempts.push((event as Event & { navigationType: string }).navigationType);
			event.preventDefault();
		};
		navigation.addEventListener('navigate', onNavigate);
		try {
			button(m.pwa_update_now()).click();
			await expect.poll(() => attempts).toEqual(['reload']);
		} finally {
			navigation.removeEventListener('navigate', onNavigate);
		}
	});

	it('puts the update offer away on "later"', () => {
		render();
		versions.store!.set('current', true);
		flushSync();

		button(m.action_later()).click();
		flushSync();

		expect(dock().children).toHaveLength(0);
	});

	it('checks for a new version when the app comes back to the foreground', async () => {
		render();
		await expect.poll(() => register.mock.calls.length).toBe(1);

		window.dispatchEvent(new Event('focus'));

		expect(versions.check).toHaveBeenCalledTimes(1);
		await expect.poll(() => registration.update.mock.calls.length).toBe(1);
	});

	it('survives a failed version check', async () => {
		versions.check.mockRejectedValueOnce(new Error('offline'));
		render();

		window.dispatchEvent(new Event('focus'));

		await expect.poll(() => versions.check.mock.calls.length).toBe(1);
	});

	it('shows the triggered-rule count on the app icon', () => {
		render({ badgeCount: 3 });

		expect(badge.set).toHaveBeenCalledWith(3);
	});

	it('opens the page of an alert tapped while the app is open', () => {
		render();

		navigator.serviceWorker.dispatchEvent(
			new MessageEvent('message', {
				data: { type: NAVIGATE_MESSAGE, url: `${location.origin}/locations/4` }
			})
		);

		expect(nav.goto).toHaveBeenCalledWith('/locations/4');
	});
});
