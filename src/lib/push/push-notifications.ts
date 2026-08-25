// Web-push (FCM) enrollment for the current browser/device.
//
// The flow is deliberately all client-side: permission and the FCM token are
// properties of THIS browser install, not of the account, so unlike the LINE
// link there is no server action involved — the token is fetched here and
// registered with the API directly. Firebase is loaded lazily inside the
// functions (never at module top level) so the SDK stays out of the SSR path
// and out of every page's initial bundle.
import { browser } from '$app/environment';
import {
	PUBLIC_FIREBASE_API_KEY,
	PUBLIC_FIREBASE_APP_ID,
	PUBLIC_FIREBASE_AUTH_DOMAIN,
	PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
	PUBLIC_FIREBASE_PROJECT_ID,
	PUBLIC_FIREBASE_VAPID_KEY
} from '$env/static/public';
import { ApiService } from '$lib/api/api.service';

const PUSH_SW_URL = '/push-sw.js';
const PUSH_SW_SCOPE = '/push-sw/';
const STORAGE_KEY = 'cw:push-token';

export type PushStatus = 'unsupported' | 'ios-needs-install' | 'denied' | 'enabled' | 'disabled';

export interface ForegroundPushMessage {
	title: string;
	body: string;
	url: string | null;
}

function isConfigured(): boolean {
	return Boolean(
		PUBLIC_FIREBASE_API_KEY &&
		PUBLIC_FIREBASE_API_KEY !== 'replace-me' &&
		PUBLIC_FIREBASE_PROJECT_ID &&
		PUBLIC_FIREBASE_VAPID_KEY
	);
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
	const isIos =
		/iPad|iPhone|iPod/.test(navigator.userAgent) ||
		// iPadOS 13+ reports as Macintosh but has touch support.
		(navigator.userAgent.includes('Macintosh') && navigator.maxTouchPoints > 1);
	const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
	return isIos && !isStandalone && !isPushSupported();
}

export function getPushStatus(): PushStatus {
	if (!browser) return 'unsupported';
	if (iosNeedsInstall()) return 'ios-needs-install';
	if (!isPushSupported()) return 'unsupported';
	if (Notification.permission === 'denied') return 'denied';
	if (Notification.permission === 'granted' && getStoredToken()) return 'enabled';
	return 'disabled';
}

export function getStoredToken(): string | null {
	if (!browser) return null;
	try {
		return localStorage.getItem(STORAGE_KEY);
	} catch {
		return null;
	}
}

function setStoredToken(token: string | null): void {
	try {
		if (token) localStorage.setItem(STORAGE_KEY, token);
		else localStorage.removeItem(STORAGE_KEY);
	} catch {
		// Private browsing modes can refuse storage — enrollment still works,
		// the device just re-registers (idempotent upsert) on next load.
	}
}

async function getMessaging() {
	const [{ initializeApp, getApps, getApp }, messagingModule] = await Promise.all([
		import('firebase/app'),
		import('firebase/messaging')
	]);

	const app = getApps().length
		? getApp()
		: initializeApp({
				apiKey: PUBLIC_FIREBASE_API_KEY,
				authDomain: PUBLIC_FIREBASE_AUTH_DOMAIN,
				projectId: PUBLIC_FIREBASE_PROJECT_ID,
				messagingSenderId: PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
				appId: PUBLIC_FIREBASE_APP_ID
			});

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

function describeDevice(): string {
	const ua = navigator.userAgent;
	const platform = /Android/.test(ua)
		? 'Android'
		: /iPad|iPhone|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1)
			? 'iOS'
			: /Windows/.test(ua)
				? 'Windows'
				: /Macintosh/.test(ua)
					? 'macOS'
					: /Linux/.test(ua)
						? 'Linux'
						: 'Unknown';
	const browserName = /Edg\//.test(ua)
		? 'Edge'
		: /Chrome\//.test(ua)
			? 'Chrome'
			: /Safari\//.test(ua)
				? 'Safari'
				: /Firefox\//.test(ua)
					? 'Firefox'
					: 'Browser';
	return `${browserName} on ${platform}`;
}

/**
 * Full enrollment for this device. Must be called from a user gesture (click)
 * so `Notification.requestPermission()` is allowed to show the prompt (iOS
 * requires it, Chrome strongly prefers it).
 * Returns the resulting status.
 */
export async function enablePush(authToken: string): Promise<PushStatus> {
	if (!isPushSupported()) return getPushStatus();

	const registration = await registerPushServiceWorker();

	const permission = await Notification.requestPermission();
	if (permission !== 'granted') {
		return permission === 'denied' ? 'denied' : 'disabled';
	}

	const { messaging, messagingModule } = await getMessaging();
	const token = await messagingModule.getToken(messaging, {
		vapidKey: PUBLIC_FIREBASE_VAPID_KEY,
		serviceWorkerRegistration: registration
	});

	await new ApiService({ authToken }).registerPushToken({
		token,
		deviceLabel: describeDevice()
	});
	setStoredToken(token);
	return 'enabled';
}

/** Remove this device's enrollment (FCM token + API registration). */
export async function disablePush(authToken: string): Promise<void> {
	const stored = getStoredToken();

	try {
		const { messaging, messagingModule } = await getMessaging();
		await messagingModule.deleteToken(messaging);
	} catch {
		// Token deletion is best-effort; the API row removal below is what stops
		// sends, and the engine prunes dead FCM tokens on first failed push.
	}

	if (stored) {
		await new ApiService({ authToken }).unregisterPushToken(stored).catch(() => undefined);
	}
	setStoredToken(null);
}

/**
 * Silent refresh on app load for already-enrolled devices: FCM tokens rotate,
 * and re-registering the current token bumps `last_seen_at` server-side. No-op
 * unless permission is granted and this device previously enrolled.
 */
export async function refreshPushToken(authToken: string): Promise<void> {
	if (!isPushSupported()) return;
	if (Notification.permission !== 'granted') return;

	const stored = getStoredToken();
	if (!stored) return;

	try {
		const registration = await registerPushServiceWorker();
		const { messaging, messagingModule } = await getMessaging();
		const token = await messagingModule.getToken(messaging, {
			vapidKey: PUBLIC_FIREBASE_VAPID_KEY,
			serviceWorkerRegistration: registration
		});
		if (!token) return;

		await new ApiService({ authToken }).registerPushToken({
			token,
			deviceLabel: describeDevice()
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
