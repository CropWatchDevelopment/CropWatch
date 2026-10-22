import { flushSync } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '$lib/api/api-error';
import type { PushDeviceDto } from '$lib/api/api.dtos';
import { formatDate, formatDateTime } from '$lib/i18n/format';
import { m } from '$lib/paraglide/messages.js';
import { describeDevice, pushDeviceId } from '$lib/push/push-device';
import { createMockServices, type MockServices } from '$lib/testing/mock-services';
import { renderWithServices } from '$lib/testing/render';
import PushNotificationsCard from './PushNotificationsCard.svelte';

// The boundary: Firebase configuration and SDK, the Notification API and the
// service worker registration. localStorage and crypto are the browser's own.
vi.mock('$env/static/public', () => ({
	PUBLIC_FIREBASE_API_KEY: 'test-api-key',
	PUBLIC_FIREBASE_APP_ID: 'test-app-id',
	PUBLIC_FIREBASE_AUTH_DOMAIN: 'cropwatch-test.firebaseapp.test',
	PUBLIC_FIREBASE_MESSAGING_SENDER_ID: 'test-sender',
	PUBLIC_FIREBASE_PROJECT_ID: 'test-project',
	PUBLIC_FIREBASE_VAPID_KEY: 'test-vapid-key'
}));

const firebase = vi.hoisted(() => ({ getToken: vi.fn() }));
vi.mock('firebase/app', () => ({
	initializeApp: () => ({ name: 'app' }),
	getApps: () => [],
	getApp: () => ({ name: 'app' })
}));
vi.mock('firebase/messaging', () => ({
	getMessaging: () => ({}),
	getToken: firebase.getToken,
	onMessage: () => () => undefined
}));

const STORAGE_KEY = 'cw:push-token';
const IPHONE_UA =
	'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148';

function device(overrides: Partial<PushDeviceDto> = {}): PushDeviceDto {
	return {
		id: 'device-b',
		deviceLabel: 'Office PC',
		createdAt: '2026-09-01T08:00:00.000Z',
		lastSeenAt: '2026-10-20T09:30:00.000Z',
		...overrides
	};
}

let services: MockServices;
let notification: {
	permission: NotificationPermission;
	requestPermission: ReturnType<typeof vi.fn>;
};
let register: ReturnType<typeof vi.spyOn>;
let view: ReturnType<typeof renderWithServices> | null = null;

function render(accessToken: string | null = 'jwt-token') {
	view = renderWithServices(PushNotificationsCard, {
		services,
		app: { accessToken: accessToken ?? undefined }
	});
	return view;
}

/** A browser without the Push API (restored after the test). */
let restorePushManager: (() => void) | null = null;
function withoutPushApi() {
	const descriptor = Object.getOwnPropertyDescriptor(window, 'PushManager');
	Reflect.deleteProperty(window, 'PushManager');
	restorePushManager = () => {
		if (descriptor) Object.defineProperty(window, 'PushManager', descriptor);
	};
}

const text = () => document.body.textContent ?? '';
const thisDeviceChip = () =>
	[...document.querySelectorAll('.push-devices__name .cw-chip')].find(
		(chip) => chip.textContent?.trim() === m.push_device_this_device()
	) ?? null;
const enableButton = () =>
	document.getElementById('settings-push-enable-button') as HTMLButtonElement | null;
const removeButton = (id: string) =>
	document.getElementById(`settings-push-device-${id}-remove-button`) as HTMLButtonElement | null;
const dialog = () => document.querySelector('dialog.cw-dialog') as HTMLDialogElement | null;
const ready = () => expect.poll(() => view?.target.querySelector('.cw-card')?.textContent);

beforeEach(() => {
	services = createMockServices();
	services.push.getPushDevices.mockResolvedValue([]);
	services.push.registerPushToken.mockResolvedValue({ registered: true });
	firebase.getToken.mockResolvedValue('fcm-token');
	notification = {
		permission: 'default',
		requestPermission: vi.fn(async () => (notification.permission = 'granted'))
	};
	vi.stubGlobal('Notification', notification);
	register = vi.spyOn(navigator.serviceWorker, 'register').mockResolvedValue({
		installing: null,
		waiting: null,
		active: { state: 'activated' }
	} as unknown as ServiceWorkerRegistration);
	localStorage.removeItem(STORAGE_KEY);
});

afterEach(() => {
	view?.unmount();
	view = null;
	document.body.innerHTML = '';
	localStorage.removeItem(STORAGE_KEY);
	restorePushManager?.();
	restorePushManager = null;
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
	firebase.getToken.mockReset();
});

describe('PushNotificationsCard support states', () => {
	it('explains a browser without push, and still lists the devices', async () => {
		withoutPushApi();
		services.push.getPushDevices.mockResolvedValue([device()]);
		render();

		await ready().toContain(m.push_unsupported_notice());
		expect(text()).toContain('Office PC');
		expect(enableButton()).toBeNull();
	});

	it('asks iPhone users to install the app first', async () => {
		withoutPushApi();
		vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(IPHONE_UA);
		render();

		await ready().toContain(m.push_ios_install_notice());
	});

	it('explains how to unblock notifications', async () => {
		notification.permission = 'denied';
		render();

		await ready().toContain(m.push_denied_notice());
		expect(enableButton()).toBeNull();
	});
});

describe('PushNotificationsCard device list', () => {
	it("offers push on this browser and lists the account's devices", async () => {
		services.push.getPushDevices.mockResolvedValue([
			device(),
			device({ id: 'device-c', deviceLabel: null, createdAt: null, lastSeenAt: null })
		]);
		render();

		await ready().toContain(m.push_disabled_notice());
		expect(enableButton()?.disabled).toBe(false);
		expect(text()).toContain(m.push_devices_title());
		expect(text()).toContain(
			m.push_device_meta({
				added: formatDate('2026-09-01T08:00:00.000Z'),
				lastOpened: formatDateTime('2026-10-20T09:30:00.000Z')
			})
		);
		// A device without a name or dates still gets a row.
		expect(text()).toContain(m.push_device_unknown());
		expect(text()).toContain(m.push_device_meta({ added: '', lastOpened: '' }));
		expect(removeButton('device-b')?.textContent).toContain(m.action_remove());
		expect(thisDeviceChip()).toBeNull();
		expect(services.push.getPushDevices).toHaveBeenCalledTimes(1);
	});

	it('marks this browser when it is on the list', async () => {
		localStorage.setItem(STORAGE_KEY, 'fcm-token');
		const thisId = await pushDeviceId('fcm-token');
		services.push.getPushDevices.mockResolvedValue([device({ id: thisId }), device()]);
		render();

		await ready().toContain(m.push_enabled_notice());
		expect(thisDeviceChip()?.closest('li')?.textContent).toContain('Office PC');
		expect(removeButton(thisId)?.textContent).toContain(m.push_disable_action());
		expect(removeButton('device-b')?.textContent).toContain(m.action_remove());
		expect(enableButton()).toBeNull();
	});

	it('warns when the device list cannot be loaded', async () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});
		services.push.getPushDevices.mockRejectedValue(new Error('down'));
		render();

		await ready().toContain(m.push_devices_load_failed());
		expect(enableButton()).toBeNull();
		expect(error).toHaveBeenCalledWith('Loading push devices failed:', expect.any(Error));
	});

	it('loads nothing and offers nothing without a session', async () => {
		render(null);

		await ready().toContain(m.push_disabled_notice());
		expect(services.push.getPushDevices).not.toHaveBeenCalled();
		expect(enableButton()?.disabled).toBe(true);
	});
});

describe('PushNotificationsCard enabling push', () => {
	it('enrolls this browser for the account and shows it as enabled', async () => {
		const thisId = await pushDeviceId('fcm-token');
		const label = describeDevice(navigator.userAgent, navigator.maxTouchPoints);
		services.push.getPushDevices
			.mockResolvedValueOnce([])
			.mockResolvedValueOnce([device({ id: thisId, deviceLabel: label })]);
		const view = render();
		await ready().toContain(m.push_disabled_notice());

		enableButton()?.click();

		await expect.poll(() => text()).toContain(m.push_enabled_notice());
		expect(register).toHaveBeenCalledWith('/push-sw.js', { scope: '/push-sw/' });
		expect(notification.requestPermission).toHaveBeenCalledTimes(1);
		expect(services.push.refreshPushToken).not.toHaveBeenCalled();
		expect(services.push.registerPushToken).toHaveBeenCalledWith({
			token: 'fcm-token',
			deviceLabel: label
		});
		expect(localStorage.getItem(STORAGE_KEY)).toBe('fcm-token');
		expect(services.push.getPushDevices).toHaveBeenCalledTimes(2);
		expect(thisDeviceChip()).not.toBeNull();
		expect(view.toasts().at(-1)).toMatchObject({
			tone: 'success',
			message: m.push_enabled_toast()
		});
	});

	it('changes nothing when the permission prompt is refused', async () => {
		notification.requestPermission.mockImplementation(
			async () => (notification.permission = 'denied')
		);
		const view = render();
		await ready().toContain(m.push_disabled_notice());

		enableButton()?.click();

		await expect.poll(() => text()).toContain(m.push_denied_notice());
		expect(services.push.registerPushToken).not.toHaveBeenCalled();
		expect(view.toasts()).toEqual([]);
	});

	it('reports a failed enrollment and lets the user retry', async () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});
		const failure = new Error('service worker failed');
		register.mockRejectedValue(failure);
		const view = render();
		await ready().toContain(m.push_disabled_notice());

		enableButton()?.click();

		await expect
			.poll(() => view.toasts().at(-1))
			.toMatchObject({ tone: 'danger', message: m.push_enable_failed() });
		expect(error).toHaveBeenCalledWith('Push enrollment failed:', failure);
		await expect.poll(() => enableButton()?.disabled).toBe(false);
		expect(services.push.registerPushToken).not.toHaveBeenCalled();
	});
});

describe('PushNotificationsCard removing a device', () => {
	async function openRemoval(id: string) {
		await expect.poll(() => removeButton(id)).not.toBeNull();
		removeButton(id)?.click();
		flushSync();
		await expect.poll(() => dialog()?.open).toBe(true);
	}

	it('removes another device after confirming', async () => {
		services.push.getPushDevices
			.mockResolvedValueOnce([device(), device({ id: 'device-c', deviceLabel: 'Phone' })])
			.mockResolvedValueOnce([device({ id: 'device-c', deviceLabel: 'Phone' })]);
		services.push.removePushDevice.mockResolvedValue(undefined);
		const view = render();
		await openRemoval('device-b');

		expect(dialog()?.textContent).toContain(m.push_device_remove_title({ device: 'Office PC' }));
		expect(dialog()?.textContent).toContain(m.push_device_remove_body({ device: 'Office PC' }));
		document.getElementById('settings-push-device-confirm-button')?.click();

		await expect.poll(() => dialog()?.open).toBe(false);
		expect(services.push.removePushDevice).toHaveBeenCalledWith('device-b');
		await expect.poll(() => removeButton('device-b')).toBeNull();
		expect(view.toasts().at(-1)).toMatchObject({
			tone: 'success',
			message: m.push_device_removed_toast({ device: 'Office PC' })
		});
	});

	it('warns before removing the last device, and cancel keeps it', async () => {
		services.push.getPushDevices.mockResolvedValue([device({ deviceLabel: null })]);
		render();
		await openRemoval('device-b');

		const label = m.push_device_unknown();
		expect(dialog()?.textContent).toContain(m.push_device_remove_last_body({ device: label }));
		document.getElementById('settings-push-device-cancel-button')?.click();

		await expect.poll(() => dialog()?.open).toBe(false);
		expect(services.push.removePushDevice).not.toHaveBeenCalled();
	});

	it('names an unlabelled device "unknown" in the removal toast', async () => {
		services.push.getPushDevices.mockResolvedValue([device({ deviceLabel: null })]);
		services.push.removePushDevice.mockResolvedValue(undefined);
		const view = render();
		await openRemoval('device-b');

		document.getElementById('settings-push-device-confirm-button')?.click();

		await expect
			.poll(() => view.toasts().at(-1))
			.toMatchObject({
				tone: 'success',
				message: m.push_device_removed_toast({ device: m.push_device_unknown() })
			});
	});

	it('treats a device already removed elsewhere as removed', async () => {
		services.push.getPushDevices
			.mockResolvedValueOnce([device(), device({ id: 'device-c' })])
			.mockResolvedValueOnce([device({ id: 'device-c' })]);
		services.push.removePushDevice.mockRejectedValue(
			new ApiError(404, 'Not Found', {
				url: 'https://api.cropwatch.test/push/tokens/x',
				payload: null
			})
		);
		const view = render();
		await openRemoval('device-b');

		document.getElementById('settings-push-device-confirm-button')?.click();

		await expect.poll(() => dialog()?.open).toBe(false);
		await expect.poll(() => removeButton('device-b')).toBeNull();
		expect(services.push.getPushDevices).toHaveBeenCalledTimes(2);
		expect(view.toasts()).toEqual([]);
	});

	it("shows the API's message, or a fallback, when removal fails", async () => {
		const failure = (payload: unknown) =>
			new ApiError(503, 'Service Unavailable', {
				url: 'https://api.cropwatch.test/push/tokens/device-b',
				payload
			});
		services.push.getPushDevices.mockResolvedValue([device(), device({ id: 'device-c' })]);
		services.push.removePushDevice
			.mockRejectedValueOnce(failure({ message: 'Push service unavailable' }))
			.mockRejectedValueOnce({})
			// Neither an API error without a message nor a network failure has
			// text for users: not "CropWatch API request failed …", not "Failed to fetch".
			.mockRejectedValueOnce(failure(null))
			.mockRejectedValueOnce(new TypeError('Failed to fetch'));
		const view = render();
		await openRemoval('device-b');
		const confirm = () =>
			document.getElementById('settings-push-device-confirm-button') as HTMLButtonElement;
		const newestToast = () => view.toasts().at(-1);

		for (const message of [
			'Push service unavailable',
			m.push_device_remove_failed(),
			m.push_device_remove_failed(),
			m.push_device_remove_failed()
		]) {
			await expect.poll(() => confirm().disabled).toBe(false);
			const before = newestToast()?.id;
			confirm().click();
			await expect.poll(() => newestToast()?.id).not.toBe(before);
			expect(newestToast()).toMatchObject({ tone: 'danger', message });
			// The dialog stays open to retry.
			expect(dialog()?.open).toBe(true);
		}
		expect(services.push.removePushDevice).toHaveBeenCalledTimes(4);
		expect(services.push.getPushDevices).toHaveBeenCalledTimes(1);
	});
});
