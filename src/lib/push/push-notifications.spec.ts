import { createHash } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockServices, type MockServices } from '$lib/testing/mock-services';
import { describeDevice } from './push-device';
import {
	enablePush,
	getPushSupport,
	getStoredToken,
	getThisDeviceId,
	initForegroundMessages,
	iosNeedsInstall,
	isPushSupported,
	refreshPushToken
} from './push-notifications';

// The boundary: SvelteKit's environment and env, the Firebase SDK, and the
// browser APIs (stubbed per test below). Everything else is the real module.
const environment = vi.hoisted(() => ({ browser: true }));
vi.mock('$app/environment', () => environment);

const CONFIGURED_ENV = {
	PUBLIC_FIREBASE_API_KEY: 'test-api-key',
	PUBLIC_FIREBASE_APP_ID: 'test-app-id',
	PUBLIC_FIREBASE_AUTH_DOMAIN: 'cropwatch-test.firebaseapp.test',
	PUBLIC_FIREBASE_MESSAGING_SENDER_ID: 'test-sender',
	PUBLIC_FIREBASE_PROJECT_ID: 'test-project',
	PUBLIC_FIREBASE_VAPID_KEY: 'test-vapid-key'
};
const env = vi.hoisted(() => ({}) as Record<string, string>);
vi.mock('$env/static/public', () => env);

const firebase = vi.hoisted(() => ({
	apps: [] as unknown[],
	initializeApp: vi.fn((options: unknown) => ({ name: 'new-app', options })),
	getApp: vi.fn(() => ({ name: 'existing-app' })),
	getMessaging: vi.fn((app: unknown) => ({ messagingFor: app })),
	getToken: vi.fn(),
	onMessage: vi.fn()
}));
vi.mock('firebase/app', () => ({
	initializeApp: firebase.initializeApp,
	getApps: () => firebase.apps,
	getApp: firebase.getApp
}));
vi.mock('firebase/messaging', () => ({
	getMessaging: firebase.getMessaging,
	getToken: firebase.getToken,
	onMessage: firebase.onMessage
}));

const DESKTOP_UA =
	'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const IPHONE_UA =
	'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148';
const IPAD_AS_MAC_UA =
	'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1';
const STORAGE_KEY = 'cw:push-token';

type FakeWorker = ReturnType<typeof fakeWorker>;

function fakeWorker(state: ServiceWorkerState) {
	const listeners = new Set<() => void>();
	return {
		state,
		addEventListener: vi.fn((_type: string, listener: () => void) => void listeners.add(listener)),
		removeEventListener: vi.fn(
			(_type: string, listener: () => void) => void listeners.delete(listener)
		),
		moveTo(next: ServiceWorkerState) {
			this.state = next;
			for (const listener of [...listeners]) listener();
		}
	};
}

interface BrowserOptions {
	userAgent?: string;
	maxTouchPoints?: number;
	/** Notification.permission before (and, via `answer`, after) the prompt. */
	permission?: NotificationPermission;
	answer?: NotificationPermission;
	standalone?: boolean;
	/** serviceWorker, PushManager and Notification exist. */
	pushApis?: boolean;
	worker?: { installing?: FakeWorker; waiting?: FakeWorker; active?: FakeWorker };
	stored?: string | null;
	/** localStorage throws (e.g. a private window that refuses storage). */
	storageThrows?: boolean;
}

function installBrowser(options: BrowserOptions = {}) {
	const {
		userAgent = DESKTOP_UA,
		maxTouchPoints = 0,
		permission = 'granted',
		answer = 'granted',
		standalone = false,
		pushApis = true,
		worker = { active: fakeWorker('activated') },
		stored = null,
		storageThrows = false
	} = options;

	const notification = {
		permission,
		requestPermission: vi.fn(async () => (notification.permission = answer))
	};
	const registration = {
		installing: worker.installing ?? null,
		waiting: worker.waiting ?? null,
		active: worker.active ?? null
	};
	const register = vi.fn(async () => registration);
	const items = new Map<string, string>(stored ? [[STORAGE_KEY, stored]] : []);
	const storage = {
		getItem: vi.fn((key: string) => {
			if (storageThrows) throw new Error('SecurityError');
			return items.get(key) ?? null;
		}),
		setItem: vi.fn((key: string, value: string) => {
			if (storageThrows) throw new Error('QuotaExceededError');
			items.set(key, value);
		})
	};

	vi.stubGlobal('navigator', {
		userAgent,
		maxTouchPoints,
		...(pushApis ? { serviceWorker: { register } } : {})
	});
	vi.stubGlobal('window', {
		matchMedia: vi.fn((query: string) => ({
			matches: query === '(display-mode: standalone)' && standalone
		})),
		...(pushApis ? { PushManager: class PushManager {}, Notification: notification } : {})
	});
	vi.stubGlobal('Notification', pushApis ? notification : undefined);
	vi.stubGlobal('localStorage', storage);

	return { notification, register, registration, storage, stored: () => items.get(STORAGE_KEY) };
}

let push: MockServices['push'];

beforeEach(() => {
	environment.browser = true;
	Object.assign(env, CONFIGURED_ENV);
	firebase.apps = [];
	firebase.getToken.mockResolvedValue('fcm-token');
	push = createMockServices().push;
	push.registerPushToken.mockResolvedValue({ registered: true });
	push.refreshPushToken.mockResolvedValue({ subscribed: true });
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
	// Back to the original implementations (and no recorded calls) for the Firebase fakes.
	vi.resetAllMocks();
});

describe('push support', () => {
	it('is never available outside the browser', async () => {
		installBrowser({ stored: 'fcm-token' });
		environment.browser = false;

		expect(isPushSupported()).toBe(false);
		expect(iosNeedsInstall()).toBe(false);
		expect(getPushSupport()).toBe('unsupported');
		expect(getStoredToken()).toBeNull();
		await expect(getThisDeviceId()).resolves.toBeNull();
	});

	it('needs the Firebase configuration', () => {
		installBrowser();
		expect(isPushSupported()).toBe(true);

		for (const [key, value] of [
			['PUBLIC_FIREBASE_API_KEY', ''],
			['PUBLIC_FIREBASE_API_KEY', 'replace-me'],
			['PUBLIC_FIREBASE_PROJECT_ID', ''],
			['PUBLIC_FIREBASE_VAPID_KEY', '']
		]) {
			Object.assign(env, CONFIGURED_ENV, { [key]: value });
			expect(isPushSupported(), `${key}=${value}`).toBe(false);
			expect(getPushSupport()).toBe('unsupported');
		}
	});

	it('needs the service worker, Push and Notification APIs', () => {
		installBrowser({ pushApis: false });

		expect(isPushSupported()).toBe(false);
		expect(getPushSupport()).toBe('unsupported');
	});

	it('tells a blocked permission apart from one that can still be asked', () => {
		installBrowser({ permission: 'denied' });
		expect(getPushSupport()).toBe('denied');

		installBrowser({ permission: 'default' });
		expect(getPushSupport()).toBe('supported');

		installBrowser({ permission: 'granted' });
		expect(getPushSupport()).toBe('supported');
	});

	it('asks iPhone and iPad users to install the app first', () => {
		installBrowser({ userAgent: IPHONE_UA, pushApis: false });
		expect(iosNeedsInstall()).toBe(true);
		expect(getPushSupport()).toBe('ios-needs-install');

		// iPadOS reports itself as a Mac; the touch screen gives it away.
		installBrowser({ userAgent: IPAD_AS_MAC_UA, maxTouchPoints: 5, pushApis: false });
		expect(getPushSupport()).toBe('ios-needs-install');

		installBrowser({ userAgent: IPAD_AS_MAC_UA, maxTouchPoints: 0, pushApis: false });
		expect(getPushSupport()).toBe('unsupported');
	});

	it('does not ask for an install when already installed, or when push works', () => {
		installBrowser({ userAgent: IPHONE_UA, pushApis: false, standalone: true });
		expect(iosNeedsInstall()).toBe(false);
		expect(getPushSupport()).toBe('unsupported');

		installBrowser({ userAgent: IPHONE_UA, pushApis: true });
		expect(iosNeedsInstall()).toBe(false);
		expect(getPushSupport()).toBe('supported');
	});
});

describe('this browser', () => {
	it('is identified in the device list by the SHA-256 of its stored token', async () => {
		installBrowser({ stored: 'fcm-token-1' });

		expect(getStoredToken()).toBe('fcm-token-1');
		await expect(getThisDeviceId()).resolves.toBe(
			createHash('sha256').update('fcm-token-1').digest('hex')
		);
	});

	it('has no id before it ever enrolled, or when storage is unavailable', async () => {
		installBrowser();
		await expect(getThisDeviceId()).resolves.toBeNull();

		installBrowser({ storageThrows: true });
		expect(getStoredToken()).toBeNull();
		await expect(getThisDeviceId()).resolves.toBeNull();
	});
});

describe('enablePush', () => {
	it('does nothing where push is unsupported', async () => {
		const browser = installBrowser({ pushApis: false });

		await expect(enablePush(push)).resolves.toBe(false);
		expect(browser.register).not.toHaveBeenCalled();
		expect(push.registerPushToken).not.toHaveBeenCalled();
	});

	it('registers the push worker, then stops when permission is not granted', async () => {
		const browser = installBrowser({ permission: 'default', answer: 'denied' });

		await expect(enablePush(push)).resolves.toBe(false);

		expect(browser.register).toHaveBeenCalledWith('/push-sw.js', { scope: '/push-sw/' });
		expect(browser.register.mock.invocationCallOrder[0]).toBeLessThan(
			browser.notification.requestPermission.mock.invocationCallOrder[0]
		);
		expect(firebase.getToken).not.toHaveBeenCalled();
		expect(push.registerPushToken).not.toHaveBeenCalled();
		expect(browser.stored()).toBeUndefined();
	});

	it('subscribes the account on a browser that never enrolled', async () => {
		const browser = installBrowser({ permission: 'default' });

		await expect(enablePush(push)).resolves.toBe(true);

		expect(firebase.initializeApp).toHaveBeenCalledWith({
			apiKey: 'test-api-key',
			authDomain: 'cropwatch-test.firebaseapp.test',
			projectId: 'test-project',
			messagingSenderId: 'test-sender',
			appId: 'test-app-id'
		});
		expect(firebase.getToken).toHaveBeenCalledWith(
			{ messagingFor: { name: 'new-app', options: expect.any(Object) } },
			{ vapidKey: 'test-vapid-key', serviceWorkerRegistration: browser.registration }
		);
		expect(push.refreshPushToken).not.toHaveBeenCalled();
		expect(push.registerPushToken).toHaveBeenCalledWith({
			token: 'fcm-token',
			deviceLabel: describeDevice(DESKTOP_UA, 0)
		});
		expect(browser.stored()).toBe('fcm-token');
	});

	it('moves the accounts on a rotated token before subscribing this one', async () => {
		const browser = installBrowser({ stored: 'old-token' });
		firebase.getToken.mockResolvedValue('new-token');

		await expect(enablePush(push)).resolves.toBe(true);

		expect(push.refreshPushToken).toHaveBeenCalledWith({
			token: 'new-token',
			previousToken: 'old-token'
		});
		expect(push.registerPushToken).toHaveBeenCalledWith({
			token: 'new-token',
			deviceLabel: describeDevice(DESKTOP_UA, 0)
		});
		expect(push.refreshPushToken.mock.invocationCallOrder[0]).toBeLessThan(
			push.registerPushToken.mock.invocationCallOrder[0]
		);
		expect(browser.stored()).toBe('new-token');
	});

	it('only subscribes when the token has not changed', async () => {
		installBrowser({ stored: 'fcm-token' });

		await expect(enablePush(push)).resolves.toBe(true);

		expect(push.refreshPushToken).not.toHaveBeenCalled();
		expect(push.registerPushToken).toHaveBeenCalledTimes(1);
	});

	it('reuses a Firebase app that is already initialised', async () => {
		installBrowser();
		firebase.apps = [{ name: 'existing-app' }];

		await enablePush(push);

		expect(firebase.initializeApp).not.toHaveBeenCalled();
		expect(firebase.getMessaging).toHaveBeenCalledWith({ name: 'existing-app' });
	});

	it('rejects when the API does, and remembers no token', async () => {
		const browser = installBrowser();
		const failure = new Error('API down');
		push.registerPushToken.mockRejectedValue(failure);

		await expect(enablePush(push)).rejects.toBe(failure);
		expect(browser.stored()).toBeUndefined();
	});

	it('still succeeds when the browser refuses to store the token', async () => {
		const browser = installBrowser({ storageThrows: true });

		await expect(enablePush(push)).resolves.toBe(true);
		expect(browser.storage.setItem).toHaveBeenCalledWith(STORAGE_KEY, 'fcm-token');
	});

	it('waits for a new push worker to activate before asking for permission', async () => {
		const installing = fakeWorker('installing');
		const browser = installBrowser({ worker: { installing } });

		const pending = enablePush(push);
		await vi.waitFor(() => expect(installing.addEventListener).toHaveBeenCalled());
		installing.moveTo('installed');
		await Promise.resolve();
		expect(browser.notification.requestPermission).not.toHaveBeenCalled();

		installing.moveTo('activated');
		await expect(pending).resolves.toBe(true);
		expect(installing.addEventListener).toHaveBeenCalledWith('statechange', expect.any(Function));
		expect(installing.removeEventListener).toHaveBeenCalledWith(
			'statechange',
			installing.addEventListener.mock.calls[0][1]
		);
	});

	it('stops waiting when the push worker turns redundant, or uses a waiting one', async () => {
		const waiting = fakeWorker('installed');
		installBrowser({ worker: { waiting } });

		const pending = enablePush(push);
		await vi.waitFor(() => expect(waiting.addEventListener).toHaveBeenCalled());
		waiting.moveTo('redundant');

		await expect(pending).resolves.toBe(true);
	});

	it('does not wait without a worker in the registration', async () => {
		installBrowser({ worker: {} });

		await expect(enablePush(push)).resolves.toBe(true);
	});
});

describe('refreshPushToken', () => {
	it('does nothing unless push is supported, granted and this browser enrolled', async () => {
		for (const options of [
			{ pushApis: false, stored: 'fcm-token' },
			{ permission: 'default' as const, stored: 'fcm-token' },
			{ permission: 'denied' as const, stored: 'fcm-token' },
			{ stored: null }
		]) {
			const browser = installBrowser(options);
			await refreshPushToken(push);
			expect(browser.register).not.toHaveBeenCalled();
		}
		expect(push.refreshPushToken).not.toHaveBeenCalled();
	});

	it("re-stamps the account's subscription when the token is unchanged", async () => {
		const browser = installBrowser({ stored: 'fcm-token' });

		await refreshPushToken(push);

		expect(push.refreshPushToken).toHaveBeenCalledWith({
			token: 'fcm-token',
			previousToken: undefined,
			deviceLabel: describeDevice(DESKTOP_UA, 0)
		});
		expect(browser.storage.setItem).not.toHaveBeenCalled();
	});

	it('follows a rotated token and remembers the new one', async () => {
		const browser = installBrowser({ stored: 'old-token' });
		firebase.getToken.mockResolvedValue('new-token');

		await refreshPushToken(push);

		expect(push.refreshPushToken).toHaveBeenCalledWith({
			token: 'new-token',
			previousToken: 'old-token',
			deviceLabel: describeDevice(DESKTOP_UA, 0)
		});
		expect(browser.stored()).toBe('new-token');
	});

	it('sends nothing when Firebase hands out no token', async () => {
		installBrowser({ stored: 'fcm-token' });
		firebase.getToken.mockResolvedValue('');

		await refreshPushToken(push);

		expect(push.refreshPushToken).not.toHaveBeenCalled();
	});

	it('logs a failed refresh instead of throwing', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const browser = installBrowser({ stored: 'old-token' });
		const failure = new Error('API down');
		firebase.getToken.mockResolvedValue('new-token');
		push.refreshPushToken.mockRejectedValue(failure);

		await expect(refreshPushToken(push)).resolves.toBeUndefined();

		expect(warn).toHaveBeenCalledWith('Push token refresh failed:', failure);
		expect(browser.stored()).toBe('old-token');
	});
});

describe('initForegroundMessages', () => {
	it('listens only on an enrolled browser with permission', async () => {
		for (const options of [
			{ pushApis: false, stored: 'fcm-token' },
			{ permission: 'default' as const, stored: 'fcm-token' },
			{ stored: null }
		]) {
			installBrowser(options);
			const unsubscribe = await initForegroundMessages(vi.fn());
			expect(unsubscribe()).toBeUndefined();
		}
		expect(firebase.onMessage).not.toHaveBeenCalled();
	});

	it('turns each foreground push into a message, with fallbacks', async () => {
		installBrowser({ stored: 'fcm-token' });
		const unsubscribe = vi.fn();
		firebase.onMessage.mockReturnValue(unsubscribe);
		const onPush = vi.fn();

		await expect(initForegroundMessages(onPush)).resolves.toBe(unsubscribe);
		const [messaging, listener] = firebase.onMessage.mock.calls[0];
		expect(messaging).toEqual({ messagingFor: expect.anything() });

		listener({
			data: { title: 'Data title', body: 'Data body', url: '/locations/1' },
			notification: { title: 'Notification title', body: 'Notification body' }
		});
		listener({ notification: { title: 'Notification title', body: 'Notification body' } });
		listener({});

		expect(onPush.mock.calls).toEqual([
			[{ title: 'Data title', body: 'Data body', url: '/locations/1' }],
			[{ title: 'Notification title', body: 'Notification body', url: null }],
			[{ title: 'CropWatch', body: '', url: null }]
		]);
	});

	it('logs and gives a no-op unsubscribe when the listener cannot start', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		installBrowser({ stored: 'fcm-token' });
		const failure = new Error('messaging unsupported');
		firebase.getMessaging.mockImplementationOnce(() => {
			throw failure;
		});

		const unsubscribe = await initForegroundMessages(vi.fn());

		expect(unsubscribe()).toBeUndefined();
		expect(warn).toHaveBeenCalledWith('Foreground push listener failed to start:', failure);
	});
});
