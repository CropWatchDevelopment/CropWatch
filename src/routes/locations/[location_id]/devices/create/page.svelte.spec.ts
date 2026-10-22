import { flushSync } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '$lib/api/api-error';
import type { DeviceSetupLookupResult, DeviceSetupResult } from '$lib/api/api.dtos';
import { m } from '$lib/paraglide/messages.js';
import { createMockServices, type MockServices } from '$lib/testing/mock-services';
import { renderWithServices } from '$lib/testing/render';
import DeviceSetupPage from './+page.svelte';
import { regionLabel } from './setup-messages';

const { goto, invalidateAll } = vi.hoisted(() => ({ goto: vi.fn(), invalidateAll: vi.fn() }));
vi.mock('$app/navigation', () => ({ goto, invalidateAll }));

const DEV_EUI = '00137A10000441DF';

function pageData(overrides: Record<string, unknown> = {}) {
	return {
		locationId: '8',
		locationName: 'Barn',
		locationLat: 35.6812,
		locationLong: 139.7671,
		locationRegion: 'as1' as const,
		deviceTypeOptions: [
			{ label: 'Smoke detector', value: '10' },
			{ label: 'Air sensor', value: '22' }
		],
		availableLicenses: [
			{ id: 14, seatIndex: 2 },
			{ id: 15, seatIndex: 3 }
		],
		groupSuggestions: ['Floor 1'],
		...overrides
	};
}

const lookupResult = (
	overrides: Partial<DeviceSetupLookupResult> = {}
): DeviceSetupLookupResult => ({
	dev_eui: DEV_EUI,
	region: 'eu1',
	ownership: { status: 'available' },
	model: { device_type_id: 10, source: 'prefix', suggested_device_type_ids: [10] },
	keys: 'inventory',
	network: { status: 'unknown' },
	supported_device_type_ids: [10, 22],
	...overrides
});

const SETUP_RESULT: DeviceSetupResult = {
	dev_eui: DEV_EUI,
	location_id: 8,
	name: 'FL1 Smoke Detector',
	steps: [
		{ key: 'availability', outcome: 'done' },
		{ key: 'network', outcome: 'created', application_id: 'cw', region: 'as1' },
		{ key: 'saved', outcome: 'done' },
		{ key: 'license', outcome: 'done' }
	]
};

let services: MockServices;
let view: ReturnType<typeof renderWithServices> | null = null;

function render(initial = pageData()) {
	let data = $state.raw(initial);
	view = renderWithServices(DeviceSetupPage, {
		props: {
			get data() {
				return data;
			},
			params: { location_id: initial.locationId },
			form: null
		} as never,
		services,
		app: { accessToken: 'jwt-token' }
	});
	return {
		...view,
		/** What `invalidateAll` hands the page: fresh load data. */
		setData(next: ReturnType<typeof pageData>) {
			data = next;
			flushSync();
		}
	};
}

const byId = <T extends HTMLElement = HTMLButtonElement>(id: string) =>
	document.getElementById(id) as T | null;
const text = () => document.body.textContent ?? '';
const heading = () => document.querySelector<HTMLElement>('[data-step-heading]');
const subtitle = () => document.querySelector('h1 + p')?.textContent?.trim();
const stepper = () =>
	[...document.querySelectorAll('.stepper__item')].map((item) => ({
		state: [...item.classList].find((name) => name.startsWith('stepper__item--'))?.slice(15),
		current: item.getAttribute('aria-current'),
		dot: item.querySelector('.stepper__dot svg')
			? '✓'
			: item.querySelector('.stepper__dot')?.textContent?.trim(),
		label: item.querySelector('span:last-child')?.textContent?.trim()
	}));

function type(id: string, value: string) {
	const input = byId<HTMLInputElement>(id);
	if (!input) throw new Error(`no input #${id}`);
	input.value = value;
	input.dispatchEvent(new Event('input', { bubbles: true }));
	flushSync();
}

/** Types the DevEUI, waits for its lookup and continues to the details step. */
async function identify() {
	type('device-setup-dev-eui-input', DEV_EUI);
	await expect.poll(() => byId('device-setup-model-select')).not.toBeNull();
	byId('device-setup-identify-continue')?.click();
	flushSync();
	expect(heading()?.textContent?.trim()).toBe(m.device_setup_details_title());
}

/** From the details step to the review step. */
function describeDevice(name = 'FL1 Smoke Detector') {
	type('device-setup-name-input', name);
	byId('device-setup-details-continue')?.click();
	flushSync();
	expect(heading()?.textContent?.trim()).toBe(m.device_setup_review_title());
}

beforeEach(() => {
	services = createMockServices();
	services.devices.lookupDeviceSetup.mockResolvedValue(lookupResult());
	invalidateAll.mockResolvedValue(undefined);
});

afterEach(() => {
	view?.unmount();
	view = null;
	goto.mockReset();
	invalidateAll.mockReset();
	vi.restoreAllMocks();
});

/** Registers a device whose license was taken meanwhile: the review step offers "Change". */
async function registerWithTakenLicense() {
	services.devices.setupDevice.mockRejectedValue(
		new ApiError(409, 'Conflict', {
			url: 'https://api.cropwatch.test/device-setup',
			payload: { statusCode: 409, message: 'License is already assigned.' }
		})
	);
	await identify();
	describeDevice();
	byId('device-setup-register')?.click();
	await expect.poll(() => byId('device-setup-outcome-license')).not.toBeNull();
}

describe('device setup page', () => {
	it('introduces the wizard for this location', () => {
		render();

		expect(document.title).toBe(m.device_setup_page_title());
		expect(document.querySelector('h1')?.textContent).toBe(m.device_setup_page_title());
		expect(subtitle()).toBe(
			m.device_setup_subtitle({ location: 'Barn', region: regionLabel('as1') })
		);
		expect(document.querySelector('.license-pill')?.textContent?.trim()).toBe(
			m.device_setup_licenses_available({ count: 2 })
		);
		expect(document.querySelector('nav.stepper')?.getAttribute('aria-label')).toBe(
			m.device_setup_progress_label()
		);
		expect(stepper()).toEqual([
			{ state: 'active', current: 'step', dot: '1', label: m.device_setup_step_identify() },
			{ state: 'upcoming', current: null, dot: '2', label: m.device_setup_step_details() },
			{ state: 'upcoming', current: null, dot: '3', label: m.device_setup_step_review() }
		]);
		expect(heading()?.textContent?.trim()).toBe(m.device_setup_identify_title());
		for (const message of [
			m.device_setup_how_title(),
			m.device_setup_how_1(),
			m.device_setup_how_2(),
			m.device_setup_how_3(),
			m.device_setup_how_safe(),
			m.device_setup_where_title(),
			m.device_setup_where_body()
		]) {
			expect(text()).toContain(message);
		}
	});

	it('names the region the lookup found when the location has none', async () => {
		render(pageData({ locationRegion: null }));
		expect(subtitle()).toBe('Barn');

		type('device-setup-dev-eui-input', DEV_EUI);

		await expect
			.poll(subtitle)
			.toBe(m.device_setup_subtitle({ location: 'Barn', region: regionLabel('eu1') }));
		expect(services.devices.lookupDeviceSetup).toHaveBeenCalledWith(
			{ dev_eui: DEV_EUI, location_id: 8 },
			{ signal: expect.any(AbortSignal) }
		);
	});

	it('goes back to the location from the back button and from cancel', () => {
		render();

		expect(byId('device-setup-back-button')?.textContent?.trim()).toBe(`← ${m.action_back()}`);
		byId('device-setup-back-button')?.click();
		byId('device-setup-cancel')?.click();

		expect(goto.mock.calls).toEqual([['/locations/8'], ['/locations/8']]);
	});

	it('walks through the steps, moving focus to each heading, and registers the device', async () => {
		services.devices.setupDevice.mockResolvedValue(SETUP_RESULT);
		render();

		await identify();
		await expect.poll(() => document.activeElement).toBe(heading());
		expect(stepper().map(({ state, dot }) => [state, dot])).toEqual([
			['done', '✓'],
			['active', '2'],
			['upcoming', '3']
		]);

		describeDevice();
		await expect
			.poll(() => document.activeElement?.textContent?.trim())
			.toBe(m.device_setup_review_title());
		expect(stepper().map(({ state }) => state)).toEqual(['done', 'done', 'active']);

		byId('device-setup-register')?.click();

		await expect
			.poll(() => heading()?.textContent?.trim())
			.toBe(m.device_setup_done_title({ name: 'FL1 Smoke Detector' }));
		expect(services.devices.setupDevice).toHaveBeenCalledWith({
			dev_eui: DEV_EUI,
			location_id: 8,
			device_type_id: 10,
			name: 'FL1 Smoke Detector',
			group: undefined,
			installed_at: undefined,
			lat: undefined,
			long: undefined,
			license_id: 14
		});
		expect(stepper().map(({ state }) => state)).toEqual(['done', 'done', 'done']);
		// The setup used a license: the count is refreshed.
		await vi.waitFor(() => expect(invalidateAll).toHaveBeenCalledTimes(1));

		byId('device-setup-open-device')?.click();
		expect(goto).toHaveBeenCalledWith(`/locations/8/devices/${DEV_EUI}`, { invalidateAll: true });
	});

	it('shows the registration in progress with every step done in the stepper', async () => {
		services.devices.setupDevice.mockReturnValue(new Promise(() => {}));
		render();
		await identify();
		describeDevice();

		byId('device-setup-register')?.click();
		flushSync();

		expect(heading()?.textContent?.trim()).toBe(
			m.device_setup_registering_title({ name: 'FL1 Smoke Detector' })
		);
		expect(stepper().map(({ state }) => state)).toEqual(['done', 'done', 'done']);
		expect(invalidateAll).not.toHaveBeenCalled();
	});

	it('opens the new device by the DevEUI entered when the API returned none', async () => {
		services.devices.setupDevice.mockResolvedValue({
			name: 'FL1',
			steps: []
		} as unknown as DeviceSetupResult);
		render();
		await identify();
		describeDevice('FL1');
		byId('device-setup-register')?.click();
		await expect.poll(() => byId('device-setup-open-device')).not.toBeNull();

		byId('device-setup-open-device')?.click();

		expect(goto).toHaveBeenCalledWith(`/locations/8/devices/${DEV_EUI}`, { invalidateAll: true });
	});

	it('starts over for another device once the free licenses are reloaded', async () => {
		services.devices.setupDevice.mockResolvedValue(SETUP_RESULT);
		const page = render();
		await identify();
		type('device-setup-group-input', 'Floor 1');
		describeDevice();
		byId('device-setup-register')?.click();
		await expect.poll(() => byId('device-setup-add-another')).not.toBeNull();
		await vi.waitFor(() => expect(invalidateAll).toHaveBeenCalledTimes(1));

		let reloaded!: () => void;
		invalidateAll.mockImplementation(
			() =>
				new Promise<void>((resolve) => {
					reloaded = () => {
						page.setData(pageData({ availableLicenses: [{ id: 15, seatIndex: 3 }] }));
						resolve();
					};
				})
		);
		byId('device-setup-add-another')?.click();
		flushSync();
		expect(byId('device-setup-add-another')?.getAttribute('aria-busy')).toBe('true');

		reloaded();

		await expect.poll(() => heading()?.textContent?.trim()).toBe(m.device_setup_identify_title());
		expect(byId<HTMLInputElement>('device-setup-dev-eui-input')?.value).toBe('');
		expect(document.querySelector('.license-pill')?.textContent?.trim()).toBe(
			m.device_setup_licenses_available({ count: 1 })
		);
		expect(stepper()[0].state).toBe('active');

		// The group carries over; the remaining license is selected.
		await identify();
		expect(byId<HTMLInputElement>('device-setup-group-input')?.value).toBe('Floor 1');
		describeDevice('FL2');
		expect(text()).toContain(m.device_setup_license_seat({ seat: 4 }));
	});

	it('reloads the free licenses before letting the user change a license that was taken', async () => {
		services.devices.setupDevice.mockRejectedValue(
			new ApiError(409, 'Conflict', {
				url: 'https://api.cropwatch.test/device-setup',
				payload: { statusCode: 409, message: 'License is already assigned.' }
			})
		);
		const page = render();
		await identify();
		describeDevice();
		byId('device-setup-register')?.click();
		await expect.poll(() => byId('device-setup-outcome-license')).not.toBeNull();
		expect(heading()?.textContent?.trim()).toBe(m.device_setup_review_title());

		invalidateAll.mockImplementation(async () => {
			page.setData(pageData({ availableLicenses: [{ id: 15, seatIndex: 3 }] }));
		});
		byId('device-setup-outcome-license')?.click();

		await expect.poll(() => heading()?.textContent?.trim()).toBe(m.device_setup_details_title());
		expect(invalidateAll).toHaveBeenCalledTimes(1);
		expect(text()).toContain(m.device_setup_license_summary({ count: 1 }));
		expect(document.querySelector('.app-notice')).toBeNull();

		services.devices.setupDevice.mockResolvedValue(SETUP_RESULT);
		describeDevice();
		byId('device-setup-register')?.click();
		await vi.waitFor(() =>
			expect(services.devices.setupDevice).toHaveBeenLastCalledWith(
				expect.objectContaining({ license_id: 15 })
			)
		);
	});

	it('still changes the license, and says the list may be out of date, when it cannot be reloaded', async () => {
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
		const view = render();
		await registerWithTakenLicense();
		const failure = new Error('reload failed');
		invalidateAll.mockRejectedValue(failure);

		byId('device-setup-outcome-license')?.click();

		await expect.poll(() => heading()?.textContent?.trim()).toBe(m.device_setup_details_title());
		expect(view.toasts()).toMatchObject([
			{ tone: 'warning', message: m.device_setup_licenses_reload_failed() }
		]);
		expect(consoleError).toHaveBeenCalledWith('Failed to reload the available licenses:', failure);
	});

	it('still starts over, and says the list may be out of date, when the licenses cannot be reloaded', async () => {
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
		services.devices.setupDevice.mockResolvedValue(SETUP_RESULT);
		const view = render();
		await identify();
		describeDevice();
		byId('device-setup-register')?.click();
		await expect.poll(() => byId('device-setup-add-another')).not.toBeNull();
		await vi.waitFor(() => expect(invalidateAll).toHaveBeenCalledTimes(1));
		const failure = new Error('reload failed');
		invalidateAll.mockRejectedValue(failure);

		byId('device-setup-add-another')?.click();

		await expect.poll(() => heading()?.textContent?.trim()).toBe(m.device_setup_identify_title());
		expect(view.toasts()).toMatchObject([
			{ tone: 'warning', message: m.device_setup_licenses_reload_failed() }
		]);
		expect(consoleError).toHaveBeenCalledWith('Failed to reload the available licenses:', failure);
		expect(byId<HTMLInputElement>('device-setup-dev-eui-input')?.value).toBe('');
	});

	it('only logs a license count that cannot be refreshed after a setup', async () => {
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
		const failure = new Error('reload failed');
		invalidateAll.mockRejectedValue(failure);
		services.devices.setupDevice.mockResolvedValue(SETUP_RESULT);
		const view = render();
		await identify();
		describeDevice();

		byId('device-setup-register')?.click();

		await vi.waitFor(() =>
			expect(consoleError).toHaveBeenCalledWith('Failed to reload the available licenses:', failure)
		);
		// The device was set up: the done step stays, without an error toast.
		expect(heading()?.textContent?.trim()).toBe(
			m.device_setup_done_title({ name: 'FL1 Smoke Detector' })
		);
		expect(view.toasts()).toEqual([]);
	});

	it('opens the location from a setup that is already running', async () => {
		services.devices.setupDevice.mockRejectedValue(
			new ApiError(409, 'Conflict', {
				url: 'https://api.cropwatch.test/device-setup',
				payload: { code: 'SETUP_IN_PROGRESS', message: 'Busy', reference: 'CW-1' }
			})
		);
		render();
		await identify();
		describeDevice();
		byId('device-setup-register')?.click();
		await expect.poll(() => byId('device-setup-outcome-location')).not.toBeNull();

		byId('device-setup-outcome-location')?.click();

		expect(goto).toHaveBeenCalledWith('/locations/8');
	});

	it('keeps the selected license valid when the page data brings other licenses', async () => {
		services.devices.setupDevice.mockResolvedValue(SETUP_RESULT);
		const page = render();
		await identify();

		page.setData(pageData({ availableLicenses: [{ id: 21, seatIndex: 5 }] }));
		describeDevice();
		expect(text()).toContain(m.device_setup_license_seat({ seat: 6 }));

		byId('device-setup-register')?.click();
		await vi.waitFor(() =>
			expect(services.devices.setupDevice).toHaveBeenCalledWith(
				expect.objectContaining({ license_id: 21 })
			)
		);
	});

	it('asks for keys again on the first step when the network rejects them', async () => {
		services.devices.lookupDeviceSetup.mockResolvedValue(lookupResult({ keys: 'inventory' }));
		services.devices.setupDevice.mockRejectedValue(
			new ApiError(422, 'Unprocessable Entity', {
				url: 'https://api.cropwatch.test/device-setup',
				payload: { code: 'KEYS_REQUIRED', message: 'Keys needed', details: { reason: 'verify' } }
			})
		);
		render();
		await identify();
		describeDevice();

		byId('device-setup-register')?.click();

		await expect.poll(() => heading()?.textContent?.trim()).toBe(m.device_setup_identify_title());
		expect(text()).toContain(m.device_setup_keys_verify());
		expect(byId('device-setup-app-key-input')).not.toBeNull();
		expect(stepper()[0].state).toBe('active');
	});
});
