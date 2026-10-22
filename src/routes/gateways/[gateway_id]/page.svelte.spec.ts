import { afterEach, describe, expect, it, vi } from 'vitest';
import type { GatewayDeviceDto, GatewayDto } from '$lib/api/api.dtos';
import { m } from '$lib/paraglide/messages.js';
import { renderWithServices } from '$lib/testing/render';
import GatewayPage from './+page.svelte';

const { goto } = vi.hoisted(() => ({ goto: vi.fn() }));
vi.mock('$app/navigation', () => ({ goto }));

const GATEWAY: GatewayDto = {
	id: 1,
	gateway_id: 'gw-1',
	gateway_name: 'North Gateway',
	is_online: true,
	is_public: true,
	created_at: '2026-04-22T00:00:00.000Z',
	updated_at: null,
	last_seen_at: null,
	status_checked_at: null
};

function device(overrides: Partial<GatewayDeviceDto>): GatewayDeviceDto {
	return {
		dev_eui: 'A1',
		name: 'Pump',
		location_id: 8,
		location_name: 'Barn',
		rssi: -80,
		snr: 7,
		last_update: null,
		...overrides
	};
}

function render(gateway: GatewayDto | null, devices: GatewayDeviceDto[], otherCount = 0) {
	return renderWithServices(GatewayPage, {
		props: {
			data: { gateway, gatewayDevices: { devices, other_device_count: otherCount } },
			params: { gateway_id: 'gw-1' }
		} as never
	});
}

let view: ReturnType<typeof render> | null = null;

afterEach(() => {
	view?.unmount();
	view = null;
	goto.mockReset();
});

const rowOf = (text: string) =>
	[...(view?.target.querySelectorAll('tbody tr') ?? [])].find((tr) =>
		tr.textContent?.includes(text)
	) as HTMLElement | undefined;

describe('gateway detail page', () => {
	it('says so when the gateway does not exist (or is not visible)', () => {
		view = render(null, []);

		expect(view.target.textContent).toContain(m.gateways_not_found());
	});

	it('shows the gateway and the devices it hears', async () => {
		view = render(GATEWAY, [
			device({}),
			device({ dev_eui: 'B2', name: null, rssi: null, snr: null, location_name: null })
		]);

		expect(view.target.textContent).toContain('North Gateway');
		expect(view.target.textContent).toContain(m.gateways_public());
		await expect.poll(() => rowOf('Pump')?.textContent).toContain('-80 dBm');
		expect(rowOf('Pump')?.textContent).toContain('7 dB');
		// A device without a name shows its DevEUI; missing values show "not available".
		expect(rowOf('B2')?.textContent).toContain(m.common_not_available());
	});

	it('notes devices the caller cannot see, and an empty gateway', () => {
		view = render({ ...GATEWAY, is_online: false, is_public: false }, [], 3);

		expect(view.target.textContent).toContain(m.gateways_other_devices({ count: 3 }));
		expect(view.target.textContent).toContain(m.gateways_no_devices());
		expect(view.target.textContent).toContain(m.gateways_private());
		expect(view.target.textContent).toContain(m.gateways_offline());
	});

	it('opens a device that has a location, and ignores one without', async () => {
		view = render(GATEWAY, [
			device({}),
			device({ dev_eui: 'C3', name: 'Orphan', location_id: null })
		]);

		await expect.poll(() => rowOf('Orphan')).toBeDefined();
		rowOf('Orphan')?.click();
		expect(goto).not.toHaveBeenCalled();

		rowOf('Pump')?.click();
		expect(goto).toHaveBeenCalledWith('/locations/8/devices/A1');
	});

	it('filters the devices by name, DevEUI or location', async () => {
		view = render(GATEWAY, [
			device({ dev_eui: 'A1', name: 'Pump' }),
			device({ dev_eui: 'B2', name: 'Fan', location_name: 'Greenhouse' })
		]);
		await expect.poll(() => rowOf('Fan')).toBeDefined();

		const search = view.target.querySelector(
			'.cw-data-table__search-wrapper input'
		) as HTMLInputElement;
		search.value = 'greenhouse';
		search.dispatchEvent(new Event('input', { bubbles: true }));

		await expect.poll(() => rowOf('Pump')).toBeUndefined();
		expect(rowOf('Fan')).toBeDefined();
	});
});
