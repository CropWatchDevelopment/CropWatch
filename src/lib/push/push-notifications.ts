// Web-push (FCM) enrollment for the current browser/device.
//
// The flow is deliberately all client-side: permission and the FCM token are
// properties of THIS browser install, not of the account, so unlike the LINE
// link there is no server action involved — the token is fetched here and
// registered with the API directly. Firebase is loaded lazily inside the
// functions (never at module top level) so the SDK stays out of the SSR path
// and out of every page's initial bundle.
//
// One browser token can carry several accounts (a shared office PC). Turning
// push on, or refreshing it, only ever touches the signed-in account's own
// subscription, and logging out changes nothing: alerts keep arriving until
// the person turns them off from their device list.
import { browser } from '$app/environment';
import { readFirebaseConfig } from '$lib/config/firebase';
import type { PushRepository } from '$lib/api/repositories/push.repository';
import { isInstalledApp, isIosDevice } from '$lib/pwa/platform';
import { describeDevice, pushDeviceId } from './push-device';

const PUSH_SW_URL = '/push-sw.js';
const PUSH_SW_SCOPE = '/push-sw/';
const STORAGE_KEY = 'cw:push-token';

export type PushSupport = 'unsupported' | 'ios-needs-install' | 'denied' | 'supported';

export interface ForegroundPushMessage {
	title: string;
	body: string;
	url: string | null;
}

function isConfigured(): boolean {
	const { apiKey, projectId, vapidKey } = readFirebaseConfig();
	return Boolean(apiKey && apiKey !== 'replace-me' && projectId && vapidKey);
}

export function isPushSupported(): boolean {
	return (
		browser &&
		isConfigured() &&
		'serviceWorker' in navigator &&
		'PushManager' in window &&
		'Notification' in window
	);
}

// iOS Safari only exposes the push APIs to PWAs installed on the home screen.
// When the APIs are missing on an iOS device the fix is "install the app", not
// "unsupported browser" — the settings card words the two states differently.
export function iosNeedsInstall(): boolean {
	if (!browser) return false;
	return isIosDevice(navigator) && !isInstalledApp(window) && !isPushSupported();
}

// Whether this browser can do push at all. Whether it is on for the signed-in
// account comes from their device list (see getThisDeviceId).
export function getPushSupport(): PushSupport {
	if (!browser) return 'unsupported';
	if (iosNeedsInstall()) return 'ios-needs-install';
	if (!isPushSupported()) return 'unsupported';
	if (Notification.permission === 'denied') return 'denied';
	return 'supported';
}

/** This browser's id in the account's device list, or null if it never enrolled. */
export async function getThisDeviceId(): Promise<string | null> {
	const token = getStoredToken();
	return token ? pushDeviceId(token) : null;
}

export function getStoredToken(): string | null {
	if (!browser) return null;
	try {
		return localStorage.getItem(STORAGE_KEY);
	} catch {
		return null;
	}
}

// Never cleared: the token belongs to the browser, and other accounts on it
// may still be using it after one turns push off.
function setStoredToken(token: string): void {
	try {
		localStorage.setItem(STORAGE_KEY, token);
	} catch {
		// Private browsing modes can refuse storage. Push still works, but this
		// browser can't recognise itself in the device list or follow a token
		// rotation on later loads.
	}
}

async function getMessaging() {
	const [{ initializeApp, getApps, getApp }, messagingModule] = await Promise.all([
		import('firebase/app'),
		import('firebase/messaging')
	]);

	const { apiKey, authDomain, projectId, messagingSenderId, appId } = readFirebaseConfig();
	const app = getApps().length
		? getApp()
		: initializeApp({ apiKey, authDomain, projectId, messagingSenderId, appId });

	return { messaging: messagingModule.getMessaging(app), messagingModule };
}

async function registerPushServiceWorker(): Promise<ServiceWorkerRegistration> {
	const registration = await navigator.serviceWorker.register(PUSH_SW_URL, {
		scope: PUSH_SW_SCOPE
	});
	// Do NOT await navigator.serviceWorker.ready here: it tracks the worker
	// controlling THIS page, and the push worker's scope (/push-sw/) matches no
	// page, so that promise never settles. Wait on this registration's own
	// worker instead — pushManager.subscribe needs it activated.
	const worker = registration.installing ?? registration.waiting ?? registration.active;
	if (worker && worker.state !== 'activated') {
		await new Promise<void>((resolve) => {
			const onStateChange = () => {
				if (worker.state === 'activated' || worker.state === 'redundant') {
					worker.removeEventListener('statechange', onStateChange);
					resolve();
				}
			};
			worker.addEventListener('statechange', onStateChange);
		});
	}
	return registration;
}

/**
 * Turns push on for the signed-in account on this browser; other accounts
 * already on it keep theirs. Must be called from a user gesture (click) so
 * `Notification.requestPermission()` is allowed to show the prompt (iOS
 * requires it, Chrome strongly prefers it). Resolves false when permission
 * isn't granted.
 *
 * @param push - The browser services' push repository (it sends the current session token).
 */
export async function enablePush(push: PushRepository): Promise<boolean> {
	if (!isPushSupported()) return false;

	const registration = await registerPushServiceWorker();

	const permission = await Notification.requestPermission();
	if (permission !== 'granted') return false;

	const { messaging, messagingModule } = await getMessaging();
	const token = await messagingModule.getToken(messaging, {
		vapidKey: readFirebaseConfig().vapidKey,
		serviceWorkerRegistration: registration
	});

	const stored = getStoredToken();
	// Firebase issued this browser a new token since it last checked in: move
	// the accounts already on it first, or their subscriptions would be left
	// on a dead token.
	if (stored && stored !== token) {
		await push.refreshPushToken({ token, previousToken: stored });
	}
	await push.registerPushToken({
		token,
		deviceLabel: describeDevice(navigator.userAgent, navigator.maxTouchPoints)
	});
	setStoredToken(token);
	return true;
}

/**
 * Silent refresh on app load. Never turns push on: it only re-stamps the
 * signed-in account's existing subscription on this browser (`last_seen_at`
 * and the device name). FCM tokens rotate; when Firebase hands this browser a
 * new one, every account on it moves along. No-op unless permission is
 * granted and this browser enrolled before.
 *
 * @param push - The browser services' push repository (it sends the current session token).
 */
export async function refreshPushToken(push: PushRepository): Promise<void> {
	if (!isPushSupported()) return;
	if (Notification.permission !== 'granted') return;

	const stored = getStoredToken();
	if (!stored) return;

	try {
		const registration = await registerPushServiceWorker();
		const { messaging, messagingModule } = await getMessaging();
		const token = await messagingModule.getToken(messaging, {
			vapidKey: readFirebaseConfig().vapidKey,
			serviceWorkerRegistration: registration
		});
		if (!token) return;

		await push.refreshPushToken({
			token,
			previousToken: token !== stored ? stored : undefined,
			deviceLabel: describeDevice(navigator.userAgent, navigator.maxTouchPoints)
		});
		if (token !== stored) setStoredToken(token);
	} catch (error) {
		console.warn('Push token refresh failed:', error);
	}
}

/**
 * Show pushes that arrive while the app is in the foreground (the service
 * worker only receives them when no page is focused). Returns an unsubscribe
 * function. No-op unless this device is enrolled.
 */
export async function initForegroundMessages(
	onPush: (message: ForegroundPushMessage) => void
): Promise<() => void> {
	if (!isPushSupported() || Notification.permission !== 'granted' || !getStoredToken()) {
		return () => undefined;
	}

	try {
		const { messaging, messagingModule } = await getMessaging();
		return messagingModule.onMessage(messaging, (payload) => {
			const data = payload.data ?? {};
			onPush({
				title: data.title ?? payload.notification?.title ?? 'CropWatch',
				body: data.body ?? payload.notification?.body ?? '',
				url: data.url ?? null
			});
		});
	} catch (error) {
		console.warn('Foreground push listener failed to start:', error);
		return () => undefined;
	}
}
