import { flushSync } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DeviceSetupLookupResult } from '$lib/api/api.dtos';
import { formatDate } from '$lib/i18n/format';
import { m } from '$lib/paraglide/messages.js';
import { createMockServices, type MockServices } from '$lib/testing/mock-services';
import { renderWithServices } from '$lib/testing/render';
import ReviewStep from './ReviewStep.svelte';
import { DeviceSetupFlow, type LicenseOption } from './device-setup-flow.svelte';

const { goto } = vi.hoisted(() => ({ goto: vi.fn() }));
vi.mock('$app/navigation', () => ({ goto }));

const DEVICE_TYPES = [
	{ label: 'Smoke detector', value: '10' },
	{ label: 'Air sensor', value: '22' }
];
const LICENSES: LicenseOption[] = [
	{ id: 14, seatIndex: 2 },
	{ id: 15, seatIndex: 3 }
];

const lookupResult = (
	overrides: Partial<DeviceSetupLookupResult> = {}
): DeviceSetupLookupResult => ({
	dev_eui: '00137A10000441DF',
	region: 'as1',
	ownership: { status: 'available' },
	model: { device_type_id: 10, source: 'prefix', suggested_device_type_ids: [10] },
	keys: 'inventory',
	network: { status: 'unknown' },
	supported_device_type_ids: [10, 22],
	...overrides
});

let devices: MockServices['devices'];
let view: ReturnType<typeof renderWithServices> | null = null;
const onchangelicense = vi.fn();
const onopenlocation = vi.fn();

/** A flow ready for review: identified, named and licensed. */
function reviewFlow(lookup: Partial<DeviceSetupLookupResult> = {}) {
	const flow = new DeviceSetupFlow({ devices, locationId: 8, licenses: LICENSES });
	flow.devEuiInput = '00137a10000441df';
	flow.lookup = lookupResult(lookup);
	flow.deviceTypeId = '10';
	flow.name = '  FL1 Smoke Detector ';
	flow.step = 'review';
	return flow;
}

function render(flow: DeviceSetupFlow, licenses = LICENSES) {
	view = renderWithServices(ReviewStep, {
		props: {
			flow,
			deviceTypeOptions: DEVICE_TYPES,
			licenses,
			locationName: 'Barn',
			onchangelicense,
			onopenlocation
		},
		services: createMockServices()
	});
	return view;
}

/** The summary as [term, description] pairs. */
const summary = () =>
	[...document.querySelectorAll('dl.summary > div')].map((row) => [
		row.querySelector('dt')?.textContent?.trim(),
		row.querySelector('dd')?.textContent?.replace(/\s+/g, ' ').trim()
	]);
const editButtons = () => [...document.querySelectorAll<HTMLButtonElement>('button.edit')];
const byId = (id: string) => document.getElementById(id) as HTMLButtonElement | null;

beforeEach(() => {
	devices = createMockServices().devices;
});

afterEach(() => {
	view?.unmount();
	view = null;
	goto.mockReset();
	onchangelicense.mockReset();
	onopenlocation.mockReset();
});

describe('ReviewStep', () => {
	it('summarises the device before it is registered', () => {
		render(reviewFlow());

		expect(document.querySelector('[data-step-heading]')?.textContent?.trim()).toBe(
			m.device_setup_review_title()
		);
		expect(document.body.textContent).toContain(m.device_setup_review_body());
		expect(summary()).toEqual([
			[m.device_setup_review_device(), 'FL1 Smoke Detector'],
			[m.device_setup_review_model(), 'Smoke detector'],
			[m.device_setup_dev_eui_label(), '00 13 7A 10 00 04 41 DF'],
			[m.device_setup_review_keys(), m.device_setup_keys_summary_inventory()],
			[m.device_setup_review_location(), 'Barn'],
			[
				m.device_setup_license_label(),
				`${m.device_setup_license_seat({ seat: 3 })} · ${m.device_setup_license_summary({ count: 2 })}`
			]
		]);
		expect(document.querySelector('.app-notice')).toBeNull();
	});

	it('adds the group, the precise position and the install date when given', () => {
		const flow = reviewFlow();
		flow.group = ' Floor 1 ';
		flow.usePreciseLocation = true;
		flow.lat = '35,6812';
		flow.long = '139.7671';
		flow.installedAt = '2026-10-01';
		flow.licenseId = '15';
		render(flow);

		expect(summary()).toEqual([
			[m.device_setup_review_device(), 'FL1 Smoke Detector'],
			[m.device_setup_review_model(), 'Smoke detector'],
			[m.device_setup_dev_eui_label(), '00 13 7A 10 00 04 41 DF'],
			[m.device_setup_review_keys(), m.device_setup_keys_summary_inventory()],
			[m.device_setup_review_location(), 'Barn · Floor 1 · 35.6812, 139.7671'],
			[m.device_setup_installed_label(), formatDate('2026-10-01T00:00:00')],
			[
				m.device_setup_license_label(),
				`${m.device_setup_license_seat({ seat: 4 })} · ${m.device_setup_license_summary({ count: 2 })}`
			]
		]);
	});

	it('shows a dash for an unknown model and only the count without a selected license', () => {
		const flow = reviewFlow();
		flow.deviceTypeId = '99';
		flow.licenseId = '';
		render(flow, [{ id: 15, seatIndex: 3 }]);

		expect(summary()[1]).toEqual([m.device_setup_review_model(), '—']);
		expect(summary().at(-1)).toEqual([
			m.device_setup_license_label(),
			m.device_setup_license_summary({ count: 1 })
		]);
	});

	it('says where the keys come from', () => {
		const network = reviewFlow({ keys: 'network' });
		render(network);
		expect(summary()[3]).toEqual([
			m.device_setup_review_keys(),
			m.device_setup_keys_summary_network()
		]);

		// Keys the network asked for are always the ones the user entered.
		network.keysRequestedByNetwork = true;
		flushSync();
		expect(summary()[3]).toEqual([
			m.device_setup_review_keys(),
			m.device_setup_keys_summary_entered()
		]);
		view?.unmount();

		render(reviewFlow({ keys: 'required' }));
		expect(summary()[3]).toEqual([
			m.device_setup_review_keys(),
			m.device_setup_keys_summary_entered()
		]);
		view?.unmount();

		const stale = reviewFlow();
		stale.devEuiInput = '00137A10000441E0';
		render(stale);
		expect(summary()[3]).toEqual([
			m.device_setup_review_keys(),
			m.device_setup_keys_summary_entered()
		]);
	});

	it('edits each part on the step that owns it', () => {
		const flow = reviewFlow();
		render(flow);

		expect(editButtons().map((button) => button.getAttribute('aria-label'))).toEqual([
			m.device_setup_edit_field({ field: m.device_setup_review_device() }),
			m.device_setup_edit_field({ field: m.device_setup_review_model() }),
			m.device_setup_edit_field({ field: m.device_setup_review_location() })
		]);
		expect(editButtons().map((button) => button.textContent?.trim())).toEqual([
			m.device_setup_edit(),
			m.device_setup_edit(),
			m.device_setup_edit()
		]);

		const steps = [];
		for (const button of editButtons()) {
			flow.step = 'review';
			button.click();
			steps.push(flow.step);
		}
		expect(steps).toEqual(['details', 'identify', 'details']);

		flow.step = 'review';
		byId('device-setup-review-back')?.click();
		expect(flow.step).toBe('details');
	});

	it('registers the device as reviewed', async () => {
		const flow = reviewFlow();
		devices.setupDevice.mockResolvedValue({
			dev_eui: '00137A10000441DF',
			location_id: 8,
			name: 'FL1 Smoke Detector',
			steps: []
		});
		render(flow);

		expect(byId('device-setup-register')?.textContent?.trim()).toBe(m.device_setup_register());
		byId('device-setup-register')?.click();

		expect(devices.setupDevice).toHaveBeenCalledWith({
			dev_eui: '00137A10000441DF',
			location_id: 8,
			device_type_id: 10,
			name: 'FL1 Smoke Detector',
			group: undefined,
			installed_at: undefined,
			lat: undefined,
			long: undefined,
			license_id: 14
		});
		await expect.poll(() => flow.step).toBe('done');
	});

	it('explains a failed setup and wires its actions to the flow and the page', async () => {
		const flow = reviewFlow();
		flow.failure = { code: 'NETWORK_UNAVAILABLE', message: null, reference: 'CW-1', details: {} };
		devices.setupDevice.mockReturnValue(new Promise(() => {}));
		render(flow);

		expect(document.querySelector('.app-notice__title')?.textContent).toBe(
			m.device_setup_network_unavailable_title()
		);
		byId('device-setup-outcome-retry')?.click();
		expect(devices.setupDevice).toHaveBeenCalledTimes(1);
		expect(flow.step).toBe('registering');

		flow.step = 'review';
		flow.failure = { code: 'NETWORK_MODEL_MISMATCH', message: null, reference: null, details: {} };
		flushSync();
		byId('device-setup-outcome-model')?.click();
		expect(flow.step).toBe('identify');
		expect(flow.failure).toBeNull();

		flow.step = 'review';
		flow.failure = { code: 'LICENSE_UNAVAILABLE', message: null, reference: null, details: {} };
		flushSync();
		byId('device-setup-outcome-license')?.click();
		expect(onchangelicense).toHaveBeenCalledTimes(1);

		flow.failure = { code: 'SETUP_IN_PROGRESS', message: null, reference: null, details: {} };
		flushSync();
		byId('device-setup-outcome-location')?.click();
		expect(onopenlocation).toHaveBeenCalledTimes(1);

		flow.failure = null;
		flushSync();
		expect(document.querySelector('.app-notice')).toBeNull();
	});

	it('names the DevEUI in an outcome and returns to the first step to check it', () => {
		const flow = reviewFlow();
		flow.failure = {
			code: 'DEVICE_OWNED_BY_OTHER_ACCOUNT',
			message: null,
			reference: null,
			details: {}
		};
		render(flow);

		expect(document.querySelector('.app-notice')?.textContent).toContain(
			m.device_setup_owned_other_body({ dev_eui: '00 13 7A 10 00 04 41 DF' })
		);
		byId('device-setup-outcome-identity')?.click();
		expect(flow.step).toBe('identify');
	});
});
