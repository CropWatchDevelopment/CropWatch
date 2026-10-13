// Pure helpers for the push device list, kept out of push-notifications.ts
// (Firebase, $env) so they unit-test in node.
import { m } from '$lib/paraglide/messages.js';

const BROWSERS: Array<[RegExp, string]> = [
	[/Edg\//, 'Edge'],
	[/Firefox\//, 'Firefox'],
	[/Chrome\//, 'Chrome'],
	[/Safari\//, 'Safari']
];

const PLATFORMS: Array<[RegExp, string]> = [
	[/CrOS/, 'ChromeOS'],
	[/Windows/, 'Windows'],
	[/Macintosh/, 'Mac'],
	[/Linux/, 'Linux']
];

/**
 * The name a device gets in the account's device list. iPhone and iPad only
 * receive push in the installed app, so the browser adds nothing there.
 * Product names stay as they are; only the words around them are translated.
 */
export function describeDevice(userAgent: string, maxTouchPoints: number): string {
	// iPadOS 13+ reports itself as a Mac; the touch screen gives it away.
	if (/iPad/.test(userAgent) || (userAgent.includes('Macintosh') && maxTouchPoints > 1)) {
		return 'iPad';
	}
	if (/iPhone|iPod/.test(userAgent)) return 'iPhone';
	if (/Android/.test(userAgent)) {
		return /Mobile/.test(userAgent)
			? m.push_device_android_phone()
			: m.push_device_android_tablet();
	}

	const browserName = BROWSERS.find(([pattern]) => pattern.test(userAgent))?.[1];
	const platform = PLATFORMS.find(([pattern]) => pattern.test(userAgent))?.[1];
	if (browserName && platform) {
		return m.push_device_browser_on_platform({ browser: browserName, platform });
	}
	return browserName ?? platform ?? m.push_device_unknown();
}

/**
 * A device's id in the device list: the same SHA-256 of its FCM token the API
 * uses, so the browser can find itself without the server sending tokens back.
 */
export async function pushDeviceId(token: string): Promise<string> {
	const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
	return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}
