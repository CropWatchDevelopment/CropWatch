import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { m } from '$lib/paraglide/messages.js';
import { describeDevice, pushDeviceId } from './push-device';

const UA = {
	iphoneApp:
		'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
	ipad: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1',
	safariMac:
		'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
	androidPhone:
		'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
	androidTablet:
		'Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
	chromeLinux:
		'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
	firefoxLinux: 'Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0',
	edgeWindows:
		'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0'
};

describe('describeDevice', () => {
	it('tells an iPhone from an iPad, including iPadOS posing as a Mac', () => {
		expect(describeDevice(UA.iphoneApp, 5)).toBe('iPhone');
		expect(describeDevice(UA.ipad, 5)).toBe('iPad');
		expect(describeDevice(UA.safariMac, 0)).toBe(
			m.push_device_browser_on_platform({ browser: 'Safari', platform: 'Mac' })
		);
	});

	it('tells an Android phone from an Android tablet', () => {
		expect(describeDevice(UA.androidPhone, 5)).toBe(m.push_device_android_phone());
		expect(describeDevice(UA.androidTablet, 5)).toBe(m.push_device_android_tablet());
	});

	it('names the browser and platform on computers', () => {
		expect(describeDevice(UA.chromeLinux, 0)).toBe(
			m.push_device_browser_on_platform({ browser: 'Chrome', platform: 'Linux' })
		);
		expect(describeDevice(UA.firefoxLinux, 0)).toBe(
			m.push_device_browser_on_platform({ browser: 'Firefox', platform: 'Linux' })
		);
		expect(describeDevice(UA.edgeWindows, 0)).toBe(
			m.push_device_browser_on_platform({ browser: 'Edge', platform: 'Windows' })
		);
	});

	it('falls back for a user agent it cannot read', () => {
		expect(describeDevice('curl/8.4.0', 0)).toBe(m.push_device_unknown());
	});
});

describe('pushDeviceId', () => {
	it("matches the API's id: SHA-256 hex of the token", async () => {
		expect(await pushDeviceId('fcm-token-1')).toBe(
			createHash('sha256').update('fcm-token-1').digest('hex')
		);
	});
});
