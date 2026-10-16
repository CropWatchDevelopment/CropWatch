import { flushSync, mount, unmount } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DeviceGatewayDto } from '$lib/api/api.dtos';
import DeviceGatewaysDialog from './DeviceGatewaysDialog.svelte';

const { getDeviceGateways } = vi.hoisted(() => ({
	getDeviceGateways: vi.fn<(devEui: string) => Promise<DeviceGatewayDto[]>>()
}));

vi.mock('$lib/api/api.service', () => ({
	ApiService: class {
		getDeviceGateways = getDeviceGateways;
	}
}));

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

function renderButton() {
	const component = mount(DeviceGatewaysDialog, {
		target: document.body,
		props: { authToken: 'jwt-token', devEui: 'DEV-001' }
	});
	flushSync();
	return component;
}

const signalButton = () => document.getElementById('device-gateways-open-button');
const signalIcon = () => signalButton()?.querySelector('.signal-strength') ?? null;
const noSignalSign = () => signalButton()?.querySelector('.signal-strength__none') ?? null;

afterEach(() => {
	getDeviceGateways.mockReset();
	document.body.innerHTML = '';
});

describe('DeviceGatewaysDialog signal button', () => {
	it('shows no icon while the gateway lookup is still running', async () => {
		getDeviceGateways.mockReturnValue(new Promise(() => {}));
		const component = renderButton();

		await vi.waitFor(() => expect(getDeviceGateways).toHaveBeenCalled());
		expect(signalIcon()).toBeNull();

		unmount(component);
	});

	it('shows empty bars with the "no" sign for a device never heard by a gateway', async () => {
		getDeviceGateways.mockResolvedValue([]);
		const component = renderButton();

		await vi.waitFor(() => expect(noSignalSign()).not.toBeNull());

		unmount(component);
	});

	it('shows the "no" sign when the gateway reported no signal readings', async () => {
		getDeviceGateways.mockResolvedValue([gateway()]);
		const component = renderButton();

		await vi.waitFor(() => expect(noSignalSign()).not.toBeNull());

		unmount(component);
	});

	it('shows real bars without the sign once the device has a signal', async () => {
		getDeviceGateways.mockResolvedValue([gateway({ rssi: -90, snr: 6 })]);
		const component = renderButton();

		await vi.waitFor(() =>
			expect(signalButton()?.querySelectorAll('.signal-strength__bar--on')).toHaveLength(4)
		);
		expect(noSignalSign()).toBeNull();

		unmount(component);
	});

	it('rates the link by the gateways that still hear the device', async () => {
		getDeviceGateways.mockResolvedValue([
			// Strong, but last heard the device two days before the newest reading.
			gateway({ gateway_id: 'gw-old', rssi: -80, snr: 9, last_update: '2026-10-07T10:00:00.000Z' }),
			gateway({ rssi: -116, snr: -4 })
		]);
		const component = renderButton();

		await vi.waitFor(() =>
			expect(signalButton()?.querySelectorAll('.signal-strength__bar--on')).toHaveLength(2)
		);

		unmount(component);
	});

	it('shows no icon when the lookup fails, since the signal is unknown', async () => {
		getDeviceGateways.mockRejectedValue(new Error('network down'));
		const component = renderButton();

		await vi.waitFor(() => expect(getDeviceGateways).toHaveBeenCalled());
		await new Promise((resolve) => setTimeout(resolve, 50));
		flushSync();
		expect(signalIcon()).toBeNull();

		unmount(component);
	});
});
