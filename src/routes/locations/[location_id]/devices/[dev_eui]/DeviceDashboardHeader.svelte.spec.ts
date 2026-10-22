import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PermissionLevel } from '$lib/constants/permissions';
import { m } from '$lib/paraglide/messages.js';
import { createMockServices, type MockServices } from '$lib/testing/mock-services';
import { renderWithServices } from '$lib/testing/render';
import DeviceDashboardHeader from './DeviceDashboardHeader.svelte';
import { getRangeOptions, type RangeSelection } from './device-detail';

const { goto, page } = vi.hoisted(() => ({
	goto: vi.fn(),
	page: { url: new URL('http://localhost/locations/8/devices/DEV-1') }
}));
vi.mock('$app/navigation', () => ({ goto }));
vi.mock('$app/state', () => ({ page }));

let services: MockServices;
let view: ReturnType<typeof renderWithServices> | null = null;

function render(overrides: Record<string, unknown> = {}) {
	const onSelectRange = vi.fn();
	view = renderWithServices(DeviceDashboardHeader, {
		props: {
			activeRange: 'today' as RangeSelection | null,
			controlsDisabled: false,
			devEui: 'DEV-1',
			exportTimeZone: 'Asia/Tokyo',
			fetching: false,
			isTrafficDevice: false,
			lastUpdatedAt: null,
			locationId: '8',
			locationName: 'North field',
			onSelectRange,
			permissionLevel: PermissionLevel.ADMIN,
			rangeOptions: getRangeOptions(),
			titleName: 'Soil probe',
			...overrides
		},
		services,
		app: { accessToken: 'jwt-token' }
	});
	return { ...view, onSelectRange };
}

const byId = (id: string) => document.getElementById(id) as HTMLButtonElement | null;
const text = () => document.body.textContent ?? '';

beforeEach(() => {
	services = createMockServices();
	services.gateways.getDeviceGateways.mockResolvedValue([]);
	page.url = new URL('http://localhost/locations/8/devices/DEV-1');
});

afterEach(() => {
	view?.unmount();
	view = null;
	goto.mockReset();
	document.body.innerHTML = '';
});

describe('device dashboard header', () => {
	it('names the device and its location, and shows its DevEUI', () => {
		render();

		expect(text()).toContain(m.devices_dashboard_card_title({ devEui: 'Soil probe' }));
		expect(text()).toContain(m.devices_dashboard_card_subtitle({ locationName: 'North field' }));
		// In the reader's language (the specs run in Japanese), with a copy button.
		const devEuiLine = [...document.querySelectorAll('.device-header__meta p')].find((line) =>
			line.querySelector('.cw-copy')
		);
		expect(devEuiLine?.textContent).toContain(m.devices_dashboard_dev_eui({ devEui: 'DEV-1' }));
		expect(devEuiLine?.textContent).not.toContain('Dev-Eui');
	});

	it('says when the device last reported', () => {
		render();
		const lastUpdated = () => document.querySelector('.device-header__meta p')?.textContent ?? '';
		expect(lastUpdated()).toContain(m.display_last_updated());
		expect(lastUpdated()).toContain(m.common_not_available());
		view?.unmount();

		render({ lastUpdatedAt: new Date(Date.now() - 5 * 60_000).toISOString() });
		expect(lastUpdated()).toContain(m.display_last_updated());
		expect(lastUpdated()).not.toContain(m.common_not_available());
	});

	it('offers the ranges, marks the active one and selects another', () => {
		const { onSelectRange } = render({ activeRange: 24 });

		for (const option of getRangeOptions()) {
			const button = byId(`device-header-range-${option.value}-button`);
			expect(button?.textContent).toContain(option.label);
			expect(button?.className).toContain(option.value === 24 ? 'primary' : 'secondary');
		}
		byId('device-header-range-72-button')?.click();

		expect(onSelectRange).toHaveBeenCalledWith(72);
	});

	it('disables the ranges and tools while controls are disabled', () => {
		render({ controlsDisabled: true });

		expect(byId('device-header-range-today-button')?.disabled).toBe(true);
		expect(byId('device-notes-review-open-button')?.disabled).toBe(true);
		expect(byId('device-csv-export-open-button')?.disabled).toBe(true);
		expect(byId('device-gateways-open-button')?.disabled).toBe(true);
	});

	it('has no ranges for traffic devices, which export a month instead', () => {
		render({ isTrafficDevice: true });

		expect(document.querySelector('[id^="device-header-range-"]')).toBeNull();
		expect(byId('device-csv-traffic-export-open-button')).not.toBeNull();
		expect(byId('device-csv-export-open-button')).not.toBeNull();
	});

	it('shows the notes and exports to managers, and the settings to admins only', () => {
		render({ permissionLevel: PermissionLevel.MANAGER });
		expect(byId('device-notes-review-open-button')).not.toBeNull();
		expect(byId('device-csv-export-open-button')).not.toBeNull();
		expect(byId('device-csv-traffic-export-open-button')).toBeNull();
		expect(byId('device-header-settings-button')).toBeNull();
		expect(byId('device-gateways-open-button')).not.toBeNull();
		view?.unmount();

		render({ permissionLevel: PermissionLevel.USER });
		expect(byId('device-notes-review-open-button')).toBeNull();
		expect(byId('device-csv-export-open-button')).toBeNull();
		expect(byId('device-header-settings-button')).toBeNull();
		expect(byId('device-gateways-open-button')).not.toBeNull();
	});

	it("opens the device's settings", () => {
		render();

		expect(byId('device-header-settings-button')?.textContent).toContain(m.nav_settings());
		byId('device-header-settings-button')?.click();

		expect(goto).toHaveBeenCalledWith('/locations/8/devices/DEV-1/settings');
	});

	it('cannot open the settings without a location or device', () => {
		render({ locationId: '' });
		expect(byId('device-header-settings-button')?.disabled).toBe(true);
		expect(byId('device-header-back-button')?.disabled).toBe(true);
		view?.unmount();

		render({ devEui: '' });
		expect(byId('device-header-settings-button')?.disabled).toBe(true);
	});

	it('goes back to the location, or to where the user came from', () => {
		render();
		byId('device-header-back-button')?.click();
		expect(goto).toHaveBeenLastCalledWith('/locations/8');

		page.url = new URL('http://localhost/locations/8/devices/DEV-1?backTo=/&filter=Greenhouse');
		byId('device-header-back-button')?.click();
		expect(goto).toHaveBeenLastCalledWith('/?locationGroup=Greenhouse');
	});

	it('shows that readings are loading', () => {
		render({ fetching: true });

		expect(text()).toContain(m.devices_loading_telemetry());
		expect(document.querySelector('.device-header__status .cw-spinner')).not.toBeNull();
	});
});
