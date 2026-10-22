import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	NAVIGATE_MESSAGE,
	PwaController,
	type BeforeInstallPromptEvent
} from './pwa-controller.svelte';

const ORIGIN = 'https://app.cropwatch.test';
const IPHONE =
	'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const ANDROID =
	'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36';
const DAY_MS = 24 * 60 * 60 * 1000;

interface FakeWindowOptions {
	userAgent?: string;
	installed?: boolean;
	serviceWorker?: boolean;
	register?: () => Promise<unknown>;
	badge?: boolean;
	badgeFails?: boolean;
	stored?: Record<string, string>;
	storageThrows?: boolean;
}

/** The parts of `window` the controller uses, as a fake that tests can drive. */
function fakeWindow(options: FakeWindowOptions = {}) {
	const displayMode = Object.assign(new EventTarget(), { matches: options.installed ?? false });
	const registration = { update: vi.fn(async () => undefined) };
	const workers = Object.assign(new EventTarget(), {
		register: vi.fn(options.register ?? (async () => registration)),
		startMessages: vi.fn()
	});
	const items = new Map(Object.entries(options.stored ?? {}));
	const failing = () => {
		if (options.storageThrows) throw new DOMException('denied', 'SecurityError');
	};
	const badgeResult = () =>
		options.badgeFails
			? Promise.reject(new DOMException('no', 'NotAllowedError'))
			: Promise.resolve();
	const navigator = {
		userAgent: options.userAgent ?? ANDROID,
		maxTouchPoints: 5,
		...(options.serviceWorker === false ? {} : { serviceWorker: workers }),
		...(options.badge ? { setAppBadge: vi.fn(badgeResult), clearAppBadge: vi.fn(badgeResult) } : {})
	};
	const win = Object.assign(new EventTarget(), {
		navigator,
		matchMedia: vi.fn((query: string) =>
			query === '(display-mode: standalone)' ? displayMode : { matches: false }
		),
		location: { origin: ORIGIN, reload: vi.fn() },
		localStorage: {
			getItem: vi.fn((key: string) => (failing(), items.get(key) ?? null)),
			setItem: vi.fn((key: string, value: string) => (failing(), items.set(key, value)))
		}
	});
	return {
		win: win as unknown as Window,
		fake: win,
		navigator,
		displayMode,
		workers,
		registration,
		items,
		/** Chromium offering to install; resolves the user's choice with `outcome`. */
		offerInstall(outcome: 'accepted' | 'dismissed' = 'accepted') {
			const event = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
				prompt: vi.fn(async () => undefined),
				userChoice: Promise.resolve({ outcome, platform: 'web' })
			}) as BeforeInstallPromptEvent & { prompt: ReturnType<typeof vi.fn> };
			win.dispatchEvent(event);
			return event;
		}
	};
}

function startController(
	options: FakeWindowOptions = {},
	serviceWorkerUrl: string | null = '/sw.js'
) {
	const env = fakeWindow(options);
	const onNavigate = vi.fn();
	const pwa = new PwaController({ serviceWorkerUrl, onNavigate });
	const stop = pwa.start(env.win);
	return { ...env, pwa, onNavigate, stop };
}

/** Lets pending promise chains (registration, prompt outcome) settle. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

afterEach(() => {
	vi.restoreAllMocks();
});

describe('PwaController: service worker', () => {
	it('registers the service worker', async () => {
		const { workers } = startController();
		await settle();

		expect(workers.register).toHaveBeenCalledWith('/sw.js');
	});

	it('skips registration without a URL (dev) or without service worker support', async () => {
		const devBuild = startController({}, null);
		const unsupported = startController({ serviceWorker: false });
		await settle();

		expect(devBuild.workers.register).not.toHaveBeenCalled();
		expect(unsupported.workers.register).not.toHaveBeenCalled();
	});

	it('logs a failed registration instead of throwing', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		startController({ register: () => Promise.reject(new Error('insecure origin')) });
		await settle();

		expect(warn).toHaveBeenCalledWith('Service worker registration failed:', expect.any(Error));
	});
});

describe('PwaController: installing the app', () => {
	it('takes over Chromium’s install prompt and shows it when asked', async () => {
		const { pwa, offerInstall } = startController();
		expect(pwa.canInstall).toBe(false);

		const event = offerInstall('accepted');
		expect(event.defaultPrevented).toBe(true);
		expect(pwa.canInstall).toBe(true);

		await pwa.install();
		expect(event.prompt).toHaveBeenCalledTimes(1);
		expect(pwa.canInstall).toBe(false);
	});

	it('stays away for two weeks when the prompt is turned down', async () => {
		const { pwa, offerInstall, items } = startController();
		offerInstall('dismissed');

		await pwa.install();

		expect(Number(items.get('cw:pwa:install-dismissed-at'))).toBeGreaterThan(0);
		offerInstall();
		expect(pwa.canInstall).toBe(false);
	});

	it('remembers "not now" across visits, for two weeks', () => {
		const recent = startController({
			stored: { 'cw:pwa:install-dismissed-at': String(Date.now() - DAY_MS) }
		});
		recent.offerInstall();
		expect(recent.pwa.canInstall).toBe(false);

		const old = startController({
			stored: { 'cw:pwa:install-dismissed-at': String(Date.now() - 15 * DAY_MS) }
		});
		old.offerInstall();
		expect(old.pwa.canInstall).toBe(true);
	});

	it('does nothing when asked to install without an offer', async () => {
		const { pwa } = startController();

		await expect(pwa.install()).resolves.toBeUndefined();
	});

	it('never offers to install the installed app, and notices an install', () => {
		const installed = startController({ installed: true });
		installed.offerInstall();
		expect(installed.pwa.installed).toBe(true);
		expect(installed.pwa.canInstall).toBe(false);

		const tab = startController();
		tab.offerInstall();
		tab.fake.dispatchEvent(new Event('appinstalled'));
		expect(tab.pwa.installed).toBe(true);
		expect(tab.pwa.canInstall).toBe(false);
	});

	it('follows the display mode when the tab becomes the app', () => {
		const { pwa, displayMode } = startController();

		displayMode.matches = true;
		displayMode.dispatchEvent(new Event('change'));

		expect(pwa.installed).toBe(true);
	});

	it('still works when storage is refused (private browsing)', () => {
		const { pwa, offerInstall } = startController({ storageThrows: true });
		offerInstall();
		expect(pwa.canInstall).toBe(true);

		pwa.dismissInstall();

		expect(pwa.canInstall).toBe(false);
	});

	it('stops listening once stopped', () => {
		const { pwa, offerInstall, stop } = startController();

		stop();
		offerInstall();

		expect(pwa.canInstall).toBe(false);
	});
});

describe('PwaController: Home Screen hint on iPhone and iPad', () => {
	it('explains Add to Home Screen in an iOS browser tab, until dismissed', () => {
		const { pwa, items } = startController({ userAgent: IPHONE });
		expect(pwa.isIos).toBe(true);
		expect(pwa.showIosHint).toBe(true);

		pwa.dismissIosHint();

		expect(pwa.showIosHint).toBe(false);
		expect(items.has('cw:pwa:ios-hint-dismissed-at')).toBe(true);
	});

	it('is not shown in the installed app, or on other platforms', () => {
		expect(startController({ userAgent: IPHONE, installed: true }).pwa.showIosHint).toBe(false);
		expect(startController({ userAgent: ANDROID }).pwa.showIosHint).toBe(false);
	});
});

describe('PwaController: updates', () => {
	it('offers the new version and fetches the new service worker', async () => {
		const { pwa, registration } = startController();
		await settle();
		expect(pwa.showUpdate).toBe(false);

		pwa.updateFound();

		expect(pwa.updateAvailable).toBe(true);
		expect(pwa.showUpdate).toBe(true);
		expect(registration.update).toHaveBeenCalledTimes(1);
	});

	it('hides the offer until the next load when put off', () => {
		const { pwa } = startController();
		pwa.updateFound();

		pwa.dismissUpdate();

		expect(pwa.showUpdate).toBe(false);
	});

	it('ignores a failed update check', async () => {
		const { pwa, registration } = startController();
		await settle();
		registration.update.mockRejectedValueOnce(new Error('offline'));

		pwa.checkForUpdate();
		await settle();

		expect(registration.update).toHaveBeenCalledTimes(1);
	});

	it('reloads the page to switch versions', () => {
		const { pwa, fake } = startController();

		pwa.reload();

		expect(fake.location.reload).toHaveBeenCalledTimes(1);
	});

	it('does nothing before it is started', () => {
		const pwa = new PwaController({ serviceWorkerUrl: null, onNavigate: vi.fn() });

		expect(() => {
			pwa.checkForUpdate();
			pwa.reload();
			pwa.setBadge(3);
			pwa.dismissInstall();
		}).not.toThrow();
	});
});

describe('PwaController: app icon badge', () => {
	it('shows the count, and clears it at zero', () => {
		const { pwa, navigator } = startController({ badge: true });

		pwa.setBadge(3);
		pwa.setBadge(0);

		expect(navigator.setAppBadge).toHaveBeenCalledWith(3);
		expect(navigator.clearAppBadge).toHaveBeenCalledTimes(1);
	});

	it('ignores browsers without badges, and a refused badge', async () => {
		expect(() => startController().pwa.setBadge(2)).not.toThrow();

		const refused = startController({ badge: true, badgeFails: true });
		refused.pwa.setBadge(2);
		await settle();
		expect(refused.navigator.setAppBadge).toHaveBeenCalledWith(2);
	});
});

describe('PwaController: alerts tapped while the app is open', () => {
	const message = (data: unknown) => new MessageEvent('message', { data });

	it('opens the alert’s page when the push worker asks', () => {
		const { workers, onNavigate } = startController();
		expect(workers.startMessages).toHaveBeenCalledTimes(1);

		workers.dispatchEvent(
			message({ type: NAVIGATE_MESSAGE, url: `${ORIGIN}/locations/4/devices/AB?tab=chart` })
		);

		expect(onNavigate).toHaveBeenCalledWith('/locations/4/devices/AB?tab=chart');
	});

	it.each([
		['another origin', { type: NAVIGATE_MESSAGE, url: 'https://evil.example/' }],
		['another message', { type: 'other', url: `${ORIGIN}/` }],
		['no URL', { type: NAVIGATE_MESSAGE }],
		['no data', null]
	])('ignores %s', (_, data) => {
		const { workers, onNavigate } = startController();

		workers.dispatchEvent(message(data));

		expect(onNavigate).not.toHaveBeenCalled();
	});
});
