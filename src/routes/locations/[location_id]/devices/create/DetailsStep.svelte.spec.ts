import { flushSync } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DeviceSetupLookupResult } from '$lib/api/api.dtos';
import { m } from '$lib/paraglide/messages.js';
import { createMockServices } from '$lib/testing/mock-services';
import { renderWithServices } from '$lib/testing/render';
import DetailsStep from './DetailsStep.svelte';
import { DeviceSetupFlow, type LicenseOption } from './device-setup-flow.svelte';

const { goto } = vi.hoisted(() => ({ goto: vi.fn() }));
vi.mock('$app/navigation', () => ({ goto }));

const LICENSES: LicenseOption[] = [
	{ id: 14, seatIndex: 2 },
	{ id: 15, seatIndex: 3 }
];

const LOOKUP: DeviceSetupLookupResult = {
	dev_eui: '00137A10000441DF',
	region: 'as1',
	ownership: { status: 'available' },
	model: { device_type_id: 10, source: 'prefix', suggested_device_type_ids: [10] },
	keys: 'inventory',
	network: { status: 'unknown' },
	supported_device_type_ids: [10]
};

let view: ReturnType<typeof renderWithServices> | null = null;

/** A flow on the details step, past an identified device. */
function detailsFlow(licenses = LICENSES) {
	const flow = new DeviceSetupFlow({
		devices: createMockServices().devices,
		locationId: 8,
		licenses
	});
	flow.devEuiInput = '00137A10000441DF';
	flow.lookup = LOOKUP;
	flow.deviceTypeId = '10';
	flow.step = 'details';
	return flow;
}

function render(
	flow: DeviceSetupFlow,
	props: {
		licenses?: LicenseOption[];
		groupSuggestions?: string[];
		locationLat?: number | null;
		locationLong?: number | null;
	} = {}
) {
	view = renderWithServices(DetailsStep, {
		props: {
			flow,
			licenses: props.licenses ?? LICENSES,
			groupSuggestions: props.groupSuggestions ?? [],
			locationLat: props.locationLat === undefined ? 35.68123 : props.locationLat,
			locationLong: props.locationLong === undefined ? 139.76712 : props.locationLong
		}
	});
	return view;
}

const byId = <T extends HTMLElement = HTMLButtonElement>(id: string) =>
	document.getElementById(id) as T | null;
const text = () => document.body.textContent ?? '';

function type(id: string, value: string) {
	const input = byId<HTMLInputElement>(id);
	if (!input) throw new Error(`no input #${id}`);
	input.value = value;
	input.dispatchEvent(new Event('input', { bubbles: true }));
	flushSync();
}

/** The error message rendered under a CwInput. */
const fieldError = (id: string) =>
	byId(id)?.closest('.cw-input')?.querySelector('.cw-input__message--error')?.textContent ?? null;

afterEach(() => {
	view?.unmount();
	view = null;
	goto.mockReset();
});

describe('DetailsStep', () => {
	it('asks for a name, a group, the install date and the position', () => {
		render(detailsFlow());

		expect(document.querySelector('[data-step-heading]')?.textContent?.trim()).toBe(
			m.device_setup_details_title()
		);
		expect(text()).toContain(m.device_setup_details_body());
		const name = byId<HTMLInputElement>('device-setup-name-input');
		expect(name?.required).toBe(true);
		expect(name?.maxLength).toBe(120);
		expect(name?.placeholder).toBe(m.device_setup_name_placeholder());
		expect(byId<HTMLInputElement>('device-setup-group-input')?.maxLength).toBe(120);
		expect(byId('device-setup-installed-at')).not.toBeNull();
		expect(text()).toContain(m.device_setup_position_title());
		expect(text()).toContain(`35.6812, 139.7671 · ${m.device_setup_position_hint()}`);
		expect(byId('device-setup-lat-input')).toBeNull();
		expect(document.querySelectorAll('.chip-button')).toHaveLength(0);
	});

	it('binds the name and the group to the flow, and requires a name once the user tried', () => {
		const flow = detailsFlow();
		render(flow);

		type('device-setup-name-input', 'FL1 Smoke Detector');
		type('device-setup-group-input', 'Floor 1');
		expect(flow.name).toBe('FL1 Smoke Detector');
		expect(flow.group).toBe('Floor 1');
		expect(fieldError('device-setup-name-input')).toBeNull();

		type('device-setup-name-input', '   ');
		expect(fieldError('device-setup-name-input')).toBeNull();
		byId('device-setup-details-continue')?.click();
		flushSync();
		expect(flow.step).toBe('details');
		expect(fieldError('device-setup-name-input')).toBe(m.device_setup_name_required());
	});

	it('offers the groups used at this location as one-tap chips', () => {
		const flow = detailsFlow();
		render(flow, { groupSuggestions: ['Floor 1', 'Floor 2'] });

		const chips = () => [...document.querySelectorAll<HTMLButtonElement>('.chip-button')];
		expect(chips().map((chip) => chip.textContent?.trim())).toEqual(['Floor 1', 'Floor 2']);
		expect(chips().map((chip) => chip.getAttribute('aria-pressed'))).toEqual(['false', 'false']);

		chips()[1].click();
		flushSync();

		expect(flow.group).toBe('Floor 2');
		expect(byId<HTMLInputElement>('device-setup-group-input')?.value).toBe('Floor 2');
		expect(chips().map((chip) => chip.getAttribute('aria-pressed'))).toEqual(['false', 'true']);
		expect(chips()[1].querySelector('.cw-chip')?.classList).toContain('cw-chip--primary');
		expect(chips()[0].querySelector('.cw-chip')?.classList).toContain('cw-chip--secondary');
	});

	it('keeps the install date as a local ISO day', async () => {
		const flow = detailsFlow();
		render(flow);
		expect(flow.installedAt).toBe('');

		byId('device-setup-installed-at')?.click();
		flushSync();
		const today = new Date();
		const first = new Date(today.getFullYear(), today.getMonth(), 1);
		const day = await vi.waitFor(() => {
			const button = document.querySelector<HTMLButtonElement>(
				`[data-day-time="${first.getTime()}"]`
			);
			if (!button) throw new Error('calendar not open');
			return button;
		});
		day.click();
		flushSync();

		const month = String(first.getMonth() + 1).padStart(2, '0');
		expect(flow.installedAt).toBe(`${first.getFullYear()}-${month}-01`);
	});

	it('starts from the install date already chosen', () => {
		const flow = detailsFlow();
		flow.installedAt = '2026-03-09';
		render(flow);

		expect(flow.installedAt).toBe('2026-03-09');
		expect(
			byId('device-setup-installed-at')?.classList.contains('cw-date-picker__trigger--placeholder')
		).toBe(false);
	});

	it('sets a precise position, seeded from the location, and checks it', () => {
		const flow = detailsFlow();
		render(flow);

		byId('device-setup-position-set')?.click();
		flushSync();

		expect(flow.usePreciseLocation).toBe(true);
		expect(byId<HTMLInputElement>('device-setup-lat-input')?.value).toBe('35.68123');
		expect(byId<HTMLInputElement>('device-setup-long-input')?.value).toBe('139.76712');
		expect(fieldError('device-setup-lat-input')).toBeNull();

		// Out of range shows at once; an emptied field only once the user tried.
		type('device-setup-lat-input', '95');
		expect(fieldError('device-setup-lat-input')).toBe(m.device_setup_lat_invalid());
		type('device-setup-long-input', '  ');
		expect(fieldError('device-setup-long-input')).toBeNull();
		flow.attempted = true;
		flushSync();
		expect(fieldError('device-setup-long-input')).toBe(m.device_setup_long_invalid());

		byId('device-setup-position-reset')?.click();
		flushSync();
		expect(flow.usePreciseLocation).toBe(false);
		expect(byId('device-setup-lat-input')).toBeNull();
	});

	it('keeps typed coordinates, and starts blank when the location has no position', () => {
		const typed = detailsFlow();
		typed.lat = '1.5';
		render(typed);
		byId('device-setup-position-set')?.click();
		expect(typed.lat).toBe('1.5');
		expect(typed.long).toBe('139.76712');
		view?.unmount();

		const nowhere = detailsFlow();
		render(nowhere, { locationLat: null, locationLong: 139.7 });
		expect(text()).toContain(m.device_setup_position_none());
		byId('device-setup-position-set')?.click();
		expect(nowhere.lat).toBe('');
		expect(nowhere.long).toBe('139.7');
		view?.unmount();

		const unplaced = detailsFlow();
		render(unplaced, { locationLat: 35.6, locationLong: null });
		expect(text()).toContain(m.device_setup_position_none());
		byId('device-setup-position-set')?.click();
		expect(unplaced.lat).toBe('35.6');
		expect(unplaced.long).toBe('');
	});

	it('uses the first free license, and lets the user pick another one', async () => {
		const flow = detailsFlow();
		render(flow);

		expect(text()).toContain(m.device_setup_license_summary({ count: 2 }));
		expect(flow.licenseId).toBe('14');
		byId('device-setup-license-change')?.click();
		flushSync();
		expect(byId('device-setup-license-change')).toBeNull();

		byId('device-setup-license-select')?.click();
		flushSync();
		const options = [...document.querySelectorAll<HTMLElement>('li[role="option"]')];
		expect(options.map((option) => option.textContent?.trim())).toEqual([
			m.device_setup_license_seat({ seat: 3 }),
			m.device_setup_license_seat({ seat: 4 })
		]);
		options[1].click();
		flushSync();

		expect(flow.licenseId).toBe('15');
		await expect.poll(() => byId('device-setup-license-select')).toBeNull();
		expect(text()).toContain(m.device_setup_license_summary({ count: 2 }));
	});

	it('offers no choice with a single license', () => {
		render(detailsFlow([{ id: 14, seatIndex: 0 }]), { licenses: [{ id: 14, seatIndex: 0 }] });

		expect(text()).toContain(m.device_setup_license_summary({ count: 1 }));
		expect(byId('device-setup-license-change')).toBeNull();
	});

	it('stops without a free license and links to billing', () => {
		const flow = detailsFlow([]);
		render(flow, { licenses: [] });

		const notice = document.querySelector('.app-notice');
		expect(notice?.classList).toContain('app-notice--warning');
		expect(notice?.querySelector('.app-notice__title')?.textContent).toBe(
			m.device_setup_no_license_title()
		);
		expect(notice?.textContent).toContain(m.device_setup_no_license_body());
		expect(byId('device-setup-details-continue')?.disabled).toBe(true);

		byId('device-setup-add-licenses')?.click();
		expect(goto).toHaveBeenCalledWith('/account/billing');
	});

	it('goes back to the device, or on to the review once the details are complete', () => {
		const flow = detailsFlow();
		render(flow);

		byId('device-setup-details-back')?.click();
		expect(flow.step).toBe('identify');

		flow.step = 'details';
		flushSync();
		type('device-setup-name-input', 'FL1');
		byId('device-setup-details-continue')?.click();
		expect(flow.step).toBe('review');
	});
});
