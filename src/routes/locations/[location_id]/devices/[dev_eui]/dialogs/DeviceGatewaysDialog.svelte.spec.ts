import { flushSync } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '$lib/api/api-error';
import type { DeviceGatewayDto } from '$lib/api/api.dtos';
import { m } from '$lib/paraglide/messages.js';
import { createMockServices, type MockServices } from '$lib/testing/mock-services';
import { renderWithServices } from '$lib/testing/render';
import DeviceGatewaysDialog from './DeviceGatewaysDialog.svelte';

function gateway(overrides: Partial<DeviceGatewayDto> = {}): DeviceGatewayDto {
	return {
		anonymized: false,
		gateway_id: 'gw-1',
		gateway_name: 'Field gateway',
		is_online: true,
		rssi: null,
		snr: null,
		last_update: '2026-10-09T10:00:00.000Z',
		...overrides
	};
}

let services: MockServices;
let view: ReturnType<typeof renderWithServices> | null = null;
const getDeviceGateways = () => services.gateways.getDeviceGateways;

function renderButton(accessToken: string | null = 'jwt-token') {
	view = renderWithServices(DeviceGatewaysDialog, {
		props: { devEui: 'DEV-001' },
		services,
		app: { accessToken: accessToken ?? undefined }
	});
	return view;
}

const signalButton = () => document.getElementById('device-gateways-open-button');
const signalIcon = () => signalButton()?.querySelector('.signal-strength') ?? null;
const noSignalSign = () => signalButton()?.querySelector('.signal-strength__none') ?? null;

function openDialog() {
	signalButton()?.click();
	flushSync();
}

beforeEach(() => {
	services = createMockServices();
});

afterEach(() => {
	view?.unmount();
	view = null;
	document.body.innerHTML = '';
});

describe('DeviceGatewaysDialog signal button', () => {
	it('shows no icon while the gateway lookup is still running', async () => {
		getDeviceGateways().mockReturnValue(new Promise(() => {}));
		renderButton();

		await vi.waitFor(() => expect(getDeviceGateways()).toHaveBeenCalledWith('DEV-001'));
		expect(signalIcon()).toBeNull();
	});

	it('shows empty bars with the "no" sign for a device never heard by a gateway', async () => {
		getDeviceGateways().mockResolvedValue([]);
		renderButton();

		await vi.waitFor(() => expect(noSignalSign()).not.toBeNull());
	});

	it('shows the "no" sign when the gateway reported no signal readings', async () => {
		getDeviceGateways().mockResolvedValue([gateway()]);
		renderButton();

		await vi.waitFor(() => expect(noSignalSign()).not.toBeNull());
	});

	it('shows real bars without the sign once the device has a signal', async () => {
		getDeviceGateways().mockResolvedValue([gateway({ rssi: -90, snr: 6 })]);
		renderButton();

		await vi.waitFor(() =>
			expect(signalButton()?.querySelectorAll('.signal-strength__bar--on')).toHaveLength(4)
		);
		expect(noSignalSign()).toBeNull();
	});

	it('rates the link by the gateways that still hear the device', async () => {
		getDeviceGateways().mockResolvedValue([
			// Strong, but last heard the device two days before the newest reading.
			gateway({ gateway_id: 'gw-old', rssi: -80, snr: 9, last_update: '2026-10-07T10:00:00.000Z' }),
			gateway({ rssi: -116, snr: -4 })
		]);
		renderButton();

		await vi.waitFor(() =>
			expect(signalButton()?.querySelectorAll('.signal-strength__bar--on')).toHaveLength(2)
		);
	});

	it('shows no icon when the lookup fails, since the signal is unknown', async () => {
		getDeviceGateways().mockRejectedValue(new Error('network down'));
		renderButton();

		await vi.waitFor(() => expect(getDeviceGateways()).toHaveBeenCalled());
		await new Promise((resolve) => setTimeout(resolve, 50));
		flushSync();
		expect(signalIcon()).toBeNull();
	});

	it('does not look anything up without a session', async () => {
		renderButton(null);
		await new Promise((resolve) => setTimeout(resolve, 20));

		expect(getDeviceGateways()).not.toHaveBeenCalled();
	});
});

describe('DeviceGatewaysDialog list', () => {
	it('lists each gateway with its readings, and hides the ones the caller may not see', async () => {
		getDeviceGateways().mockResolvedValue([
			gateway({ rssi: -90, snr: 6 }),
			gateway({ gateway_id: 'gw-2', gateway_name: null, is_online: false }),
			gateway({ anonymized: true, gateway_id: null, gateway_name: null })
		]);
		renderButton();
		await vi.waitFor(() => expect(getDeviceGateways()).toHaveBeenCalled());

		openDialog();

		await vi.waitFor(() => expect(document.body.textContent).toContain('Field gateway'));
		const text = document.body.textContent ?? '';
		expect(text).toContain('-90 dBm');
		expect(text).toContain('6 dB');
		// An unnamed gateway falls back to its id; a hidden one is "another gateway".
		expect(text).toContain('gw-2');
		expect(text).toContain(m.gateways_other_gateway());
		expect(text).toContain(m.device_gateways_anonymized_hint());
		expect(getDeviceGateways()).toHaveBeenCalledTimes(2);
	});

	it("says when no gateway has heard the device, and shows the API's error", async () => {
		getDeviceGateways().mockResolvedValue([]);
		renderButton();
		openDialog();
		await vi.waitFor(() => expect(document.body.textContent).toContain(m.device_gateways_empty()));

		getDeviceGateways().mockRejectedValue(
			new ApiError(502, 'Bad Gateway', { url: '', payload: { message: 'Gateway lookup failed' } })
		);
		document.getElementById('device-gateways-close-button')?.click();
		openDialog();
		await vi.waitFor(() => expect(document.body.textContent).toContain('Gateway lookup failed'));
	});

	it.each([
		[
			'an API error without a message',
			new ApiError(500, 'Internal Server Error', { url: '', payload: null })
		],
		['a network failure', new TypeError('Failed to fetch')]
	])('shows the translated fallback for %s', async (_case, failure) => {
		getDeviceGateways().mockRejectedValue(failure);
		renderButton();
		openDialog();

		await vi.waitFor(() =>
			expect(document.body.textContent).toContain(m.device_gateways_load_failed())
		);
		expect(document.body.textContent).not.toContain('Failed to fetch');
		expect(document.body.textContent).not.toContain('CropWatch API request failed');
	});

	it('ignores an older lookup that finishes after a newer one', async () => {
		let resolveFirst!: (value: DeviceGatewayDto[]) => void;
		getDeviceGateways()
			.mockReturnValueOnce(new Promise((resolve) => (resolveFirst = resolve)))
			.mockResolvedValueOnce([gateway({ gateway_name: 'Newest' })]);
		renderButton();
		openDialog();
		await vi.waitFor(() => expect(document.body.textContent).toContain('Newest'));

		resolveFirst([gateway({ gateway_name: 'Stale' })]);
		await new Promise((resolve) => setTimeout(resolve, 20));
		flushSync();

		expect(document.body.textContent).not.toContain('Stale');
	});
});
