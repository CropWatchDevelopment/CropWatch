import { flushSync } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '$lib/api/api-error';
import type { DeviceSetupLookupResult } from '$lib/api/api.dtos';
import { formatHexPairs } from '$lib/devices/eui';
import { parseDeviceQr, type DeviceQrPayload } from '$lib/devices/qr-payload';
import { m } from '$lib/paraglide/messages.js';
import { createMockServices, type MockServices } from '$lib/testing/mock-services';
import { renderWithServices } from '$lib/testing/render';
import IdentifyStep from './IdentifyStep.svelte';
import { DeviceSetupFlow, type SetupFailure } from './device-setup-flow.svelte';
import { supportHref } from './setup-messages';

const DEV_EUI = '00137A10000441DF';
const KEY = '2B7E151628AED2A6ABF7158809CF4F3C';
const DEVICE_TYPES = [
	{ label: 'Air sensor', value: '2' },
	{ label: 'Smoke detector', value: '10' },
	{ label: 'Soil probe', value: '22' },
	{ label: 'Water meter', value: '31' }
];

const lookupResult = (
	overrides: Partial<DeviceSetupLookupResult> = {}
): DeviceSetupLookupResult => ({
	dev_eui: DEV_EUI,
	region: 'as1',
	ownership: { status: 'available' },
	model: { device_type_id: 10, source: 'prefix', suggested_device_type_ids: [22, 10] },
	keys: 'inventory',
	network: { status: 'unknown' },
	supported_device_type_ids: [2, 10, 22],
	...overrides
});

const apiError = (status: number, payload: unknown) =>
	new ApiError(status, 'Error', { url: 'https://api.cropwatch.test/device-setup/lookup', payload });

let devices: MockServices['devices'];
let flow: DeviceSetupFlow;
let view: ReturnType<typeof renderWithServices> | null = null;
const oncancel = vi.fn();

function render() {
	view = renderWithServices(IdentifyStep, {
		props: { flow, deviceTypeOptions: DEVICE_TYPES, oncancel }
	});
	return view;
}

/** A flow whose DevEUI was already looked up (no new lookup starts). */
function identified(overrides: Partial<DeviceSetupLookupResult> = {}, label?: DeviceQrPayload) {
	if (label) flow.applyQr(label);
	else flow.devEuiInput = DEV_EUI;
	flow.lookup = lookupResult({ dev_eui: label?.devEui ?? DEV_EUI, ...overrides });
	if (!label?.deviceTypeId) {
		const suggested = flow.lookup.model.device_type_id;
		flow.deviceTypeId = suggested ? String(suggested) : '';
	}
	render();
}

const byId = <T extends HTMLElement = HTMLButtonElement>(id: string) =>
	document.getElementById(id) as T | null;
const text = () => document.body.textContent ?? '';
const notices = () =>
	[...document.querySelectorAll<HTMLElement>('.app-notice')].map((notice) => ({
		tone: [...notice.classList].find((name) => name.startsWith('app-notice--'))?.slice(12),
		title: notice.querySelector('.app-notice__title')?.textContent ?? null,
		body: notice.querySelector('.app-notice__body p')?.textContent?.trim()
	}));

function type(id: string, value: string) {
	const input = byId<HTMLInputElement>(id);
	if (!input) throw new Error(`no input #${id}`);
	input.value = value;
	input.dispatchEvent(new Event('input', { bubbles: true }));
	flushSync();
}

const fieldError = (id: string) =>
	byId(id)?.closest('.cw-input')?.querySelector('.cw-input__message--error')?.textContent ?? null;
const fieldHint = (id: string) =>
	byId(id)?.closest('.cw-input')?.querySelector('.cw-input__message')?.textContent ?? null;
const modelMessage = () =>
	byId('device-setup-model-select')
		?.closest('.cw-dropdown')
		?.querySelector('.cw-dropdown__message');

function modelOptions() {
	byId('device-setup-model-select')?.click();
	flushSync();
	const options = [...document.querySelectorAll<HTMLElement>('li[role="option"]')].map(
		(option) => ({
			label: option.textContent?.trim(),
			disabled: option.getAttribute('aria-disabled') === 'true'
		})
	);
	byId('device-setup-model-select')?.click();
	flushSync();
	return options;
}

function chooseModel(label: string) {
	byId('device-setup-model-select')?.click();
	flushSync();
	[...document.querySelectorAll<HTMLElement>('li[role="option"]')]
		.find((option) => option.textContent?.trim() === label)
		?.click();
	flushSync();
}

/** Records (and cancels) the page navigations a click starts, such as the support mail link. */
function captureNavigations() {
	const urls: string[] = [];
	const navigation = (window as unknown as { navigation: EventTarget }).navigation;
	const onNavigate = (event: Event) => {
		urls.push((event as Event & { destination: { url: string } }).destination.url);
		event.preventDefault();
	};
	navigation.addEventListener('navigate', onNavigate);
	return { urls, stop: () => navigation.removeEventListener('navigate', onNavigate) };
}

beforeEach(() => {
	devices = createMockServices().devices;
	flow = new DeviceSetupFlow({ devices, locationId: 8, licenses: [{ id: 14, seatIndex: 2 }] });
});

afterEach(() => {
	view?.unmount();
	view = null;
	oncancel.mockReset();
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

describe('IdentifyStep', () => {
	it('asks for the DevEUI, by scanning or typing', () => {
		render();

		const heading = document.querySelector<HTMLElement>('[data-step-heading]');
		expect(heading?.textContent?.trim()).toBe(m.device_setup_identify_title());
		expect(heading?.tabIndex).toBe(-1);
		expect(text()).toContain(m.device_setup_identify_body());
		expect(byId('device-setup-scan-button')?.textContent?.trim()).toBe(m.device_setup_scan_qr());
		const input = byId<HTMLInputElement>('device-setup-dev-eui-input');
		expect(input?.placeholder).toBe('00 13 7A 10 00 04 41 DF');
		expect(input?.required).toBe(true);
		expect(fieldHint('device-setup-dev-eui-input')).toBe(m.device_setup_dev_eui_hint());
		expect(byId('device-setup-identify-continue')?.disabled).toBe(true);
		expect(byId('device-setup-model-select')).toBeNull();

		byId('device-setup-cancel')?.click();
		expect(oncancel).toHaveBeenCalledTimes(1);
	});

	it('looks a complete DevEUI up after a pause in typing, at this location', async () => {
		devices.lookupDeviceSetup.mockResolvedValue(lookupResult());
		render();

		type('device-setup-dev-eui-input', '00 13 7A');
		type('device-setup-dev-eui-input', '00 13 7A 10 00 04 41 DE');
		type('device-setup-dev-eui-input', '00 13 7a 10 00 04 41 df');

		await vi.waitFor(() => expect(devices.lookupDeviceSetup).toHaveBeenCalled());
		expect(devices.lookupDeviceSetup).toHaveBeenCalledTimes(1);
		expect(devices.lookupDeviceSetup).toHaveBeenCalledWith(
			{ dev_eui: DEV_EUI, location_id: 8 },
			{ signal: expect.any(AbortSignal) }
		);
		await expect.poll(() => byId('device-setup-model-select')).not.toBeNull();
		expect(byId('device-setup-identify-continue')?.disabled).toBe(false);

		// Re-typing the same DevEUI does not look it up again.
		type('device-setup-dev-eui-input', '00:13:7A:10:00:04:41:DF');
		await new Promise((resolve) => setTimeout(resolve, 450));
		expect(devices.lookupDeviceSetup).toHaveBeenCalledTimes(1);
	});

	it('shows that it is checking, and cancels the check when the DevEUI becomes incomplete', async () => {
		devices.lookupDeviceSetup.mockReturnValue(new Promise(() => {}));
		render();

		type('device-setup-dev-eui-input', DEV_EUI);
		await vi.waitFor(() => expect(devices.lookupDeviceSetup).toHaveBeenCalled());
		flushSync();
		const status = document.querySelector('[aria-live="polite"]');
		expect(status?.textContent).toContain(m.device_setup_checking());
		expect(status?.querySelector('.cw-spinner')).not.toBeNull();

		type('device-setup-dev-eui-input', '00137A');

		expect(devices.lookupDeviceSetup.mock.calls[0][1]?.signal?.aborted).toBe(true);
		expect(flow.lookingUp).toBe(false);
		expect(status?.textContent).not.toContain(m.device_setup_checking());
	});

	it('explains field problems in the DevEUI', () => {
		render();

		type('device-setup-dev-eui-input', '00137Z');
		expect(fieldError('device-setup-dev-eui-input')).toBe(
			m.device_setup_hex_invalid_char({ char: 'Z' })
		);
		type('device-setup-dev-eui-input', '0013');
		expect(fieldError('device-setup-dev-eui-input')).toBeNull();
		flow.attempted = true;
		flushSync();
		expect(fieldError('device-setup-dev-eui-input')).toBe(
			m.device_setup_hex_length({ got: 4, expected: 16 })
		);
	});

	it('explains a lookup the user may not make', async () => {
		devices.lookupDeviceSetup.mockRejectedValue(apiError(403, { message: 'Forbidden' }));
		render();
		type('device-setup-dev-eui-input', DEV_EUI);

		await expect.poll(notices).toEqual([
			{
				tone: 'danger',
				title: m.device_setup_forbidden_title(),
				body: m.device_setup_forbidden_body()
			}
		]);
	});

	it('asks the user to wait when rate limited', async () => {
		devices.lookupDeviceSetup.mockRejectedValue(apiError(429, { message: 'Too Many Requests' }));
		render();
		type('device-setup-dev-eui-input', DEV_EUI);

		await expect
			.poll(notices)
			.toEqual([{ tone: 'warning', title: null, body: m.device_setup_rate_limited() }]);
	});

	it('offers a retry when the lookup failed, quoting the support reference', async () => {
		devices.lookupDeviceSetup
			.mockRejectedValueOnce(new TypeError('Failed to fetch'))
			.mockRejectedValueOnce(
				apiError(500, { code: 'SETUP_FAILED', message: 'boom', reference: 'CW-REF9' })
			)
			.mockResolvedValueOnce(lookupResult());
		render();
		type('device-setup-dev-eui-input', DEV_EUI);

		await expect
			.poll(notices)
			.toEqual([{ tone: 'warning', title: null, body: m.device_setup_lookup_failed() }]);
		expect(byId('device-setup-lookup-retry')?.textContent?.trim()).toBe(m.device_setup_retry());

		byId('device-setup-lookup-retry')?.click();
		await expect.poll(notices).toEqual([
			{
				tone: 'warning',
				title: null,
				body: m.device_setup_lookup_failed_server({ reference: 'CW-REF9' })
			}
		]);

		byId('device-setup-lookup-retry')?.click();
		await expect.poll(() => byId('device-setup-model-select')).not.toBeNull();
		expect(notices()).toEqual([]);
		expect(devices.lookupDeviceSetup).toHaveBeenCalledTimes(3);
	});

	it('hides a lookup error while the DevEUI itself is incomplete', () => {
		flow.devEuiInput = '0013';
		flow.lookupError = { code: 'FORBIDDEN', message: null, reference: null, details: {} };
		render();

		expect(notices()).toEqual([]);
	});

	it('stops at a device another account owns, offering support', async () => {
		identified({ ownership: { status: 'other_account' } });

		expect(notices()).toEqual([
			{
				tone: 'danger',
				title: m.device_setup_owned_other_title(),
				body: m.device_setup_owned_other_body({ dev_eui: formatHexPairs(DEV_EUI) })
			}
		]);
		expect(byId('device-setup-identify-continue')?.disabled).toBe(true);
		expect(byId('device-setup-model-select')).toBeNull();

		const navigations = captureNavigations();
		try {
			byId('device-setup-owned-other-support')?.click();
			await expect.poll(() => navigations.urls).toEqual([supportHref(null, DEV_EUI)]);
		} finally {
			navigations.stop();
		}
	});

	it('links to a device that is already yours', () => {
		identified({
			ownership: {
				status: 'yours',
				device: { dev_eui: DEV_EUI, name: 'Hall', location_id: 12, location_name: 'Barn' }
			}
		});

		expect(notices()).toEqual([
			{
				tone: 'warning',
				title: m.device_setup_already_yours_title(),
				body: m.device_setup_already_yours_body({ name: 'Hall', location: 'Barn' })
			}
		]);
		const link = document.querySelector<HTMLAnchorElement>('.app-notice a');
		expect(link?.getAttribute('href')).toBe(`/locations/12/devices/${DEV_EUI}`);
		expect(link?.textContent?.trim()).toBe(`${m.device_setup_open_device({ name: 'Hall' })} →`);
		expect(byId('device-setup-identify-continue')?.disabled).toBe(true);
	});

	it('has no link for a device of yours without a location', () => {
		identified({
			ownership: {
				status: 'yours',
				device: { dev_eui: DEV_EUI, name: 'Hall', location_id: null, location_name: null }
			}
		});

		expect(notices()[0].body).toBe(
			m.device_setup_already_yours_body({ name: 'Hall', location: '—' })
		);
		expect(document.querySelector('.app-notice a')).toBeNull();
	});

	it('suggests models first and disables those the region cannot register', () => {
		identified();

		expect(modelOptions()).toEqual([
			{ label: 'Soil probe', disabled: false },
			{ label: 'Smoke detector', disabled: false },
			{ label: 'Air sensor', disabled: false },
			{ label: 'Water meter', disabled: true }
		]);
		expect(byId('device-setup-model-select')?.textContent).toContain('Smoke detector');
		expect(modelMessage()?.textContent).toBe(m.device_setup_model_recognized());

		chooseModel('Soil probe');
		expect(flow.deviceTypeId).toBe('22');
		expect(flow.modelTouched).toBe(true);
		expect(modelMessage()).toBeNull();
	});

	it('flags a missing or unsupported model', () => {
		identified({ model: { device_type_id: null, source: null, suggested_device_type_ids: [] } });

		expect(modelMessage()).toBeNull();
		byId('device-setup-identify-continue')?.click();
		flushSync();
		expect(flow.step).toBe('identify');
		expect(modelMessage()?.textContent).toBe(m.device_setup_model_required());

		flow.deviceTypeId = '31';
		flushSync();
		expect(modelMessage()?.textContent).toBe(m.device_setup_model_unsupported());
	});

	it('says the keys come from the inventory or the network when it needs none', () => {
		identified({ keys: 'inventory' });
		expect(document.querySelector('.key-status')?.textContent).toContain(
			m.device_setup_keys_inventory_title()
		);
		expect(document.querySelector('.key-status')?.textContent).toContain(
			m.device_setup_keys_inventory_body()
		);
		expect(byId('device-setup-join-eui-input')).toBeNull();

		flow.lookup = lookupResult({ keys: 'network' });
		flushSync();
		expect(document.querySelector('.key-status')?.textContent).toContain(
			m.device_setup_keys_network_title()
		);
		expect(document.querySelector('.key-status')?.textContent).toContain(
			m.device_setup_keys_network_body()
		);

		byId('device-setup-identify-continue')?.click();
		expect(flow.step).toBe('details');
	});

	it('asks for the keys when they are required, checking them once the user tried', () => {
		identified({ keys: 'required' });

		expect(document.querySelector('.key-status')).toBeNull();
		expect(text()).toContain(m.device_setup_keys_required_body());
		expect(byId<HTMLInputElement>('device-setup-join-eui-input')?.placeholder).toBe(
			'00 00 00 00 00 00 00 00'
		);
		expect(fieldHint('device-setup-app-key-input')).toBe(m.device_setup_app_key_hint());

		byId('device-setup-identify-continue')?.click();
		flushSync();
		expect(flow.step).toBe('identify');
		expect(fieldError('device-setup-join-eui-input')).toBe(m.device_setup_hex_empty());
		expect(fieldError('device-setup-app-key-input')).toBe(m.device_setup_hex_empty());

		type('device-setup-join-eui-input', '70 B3 D5 7E D0 00 00 00');
		type('device-setup-app-key-input', KEY.toLowerCase());
		expect(flow.joinEuiInput).toBe('70 B3 D5 7E D0 00 00 00');
		expect(fieldError('device-setup-app-key-input')).toBeNull();

		byId('device-setup-identify-continue')?.click();
		expect(flow.step).toBe('details');
	});

	it('explains why the network rejected or asked for keys', () => {
		const problems: [SetupFailure['code'], Record<string, unknown>, string][] = [
			['KEYS_DO_NOT_MATCH', {}, m.device_setup_keys_mismatch()],
			['KEYS_REQUIRED', { reason: 'verify' }, m.device_setup_keys_verify()],
			['KEYS_REQUIRED', {}, m.device_setup_keys_rejected()],
			['INVALID_KEYS', {}, m.device_setup_keys_rejected()]
		];
		identified({ keys: 'required' });

		for (const [code, details, message] of problems) {
			flow.failure = { code, message: null, reference: null, details };
			flushSync();
			const problem = document.querySelector('.app-notice--danger');
			expect(problem?.textContent?.trim(), code).toBe(message);
			expect(problem?.getAttribute('aria-live')).toBe('polite');
		}

		flow.failure = { code: 'NETWORK_UNAVAILABLE', message: null, reference: null, details: {} };
		flushSync();
		expect(document.querySelector('.app-notice--danger')).toBeNull();
	});

	it('uses a scanned label’s model, or names the code it does not know', () => {
		const label = parseDeviceQr(
			`app:24E124C0002A0001,dev:24E124126E270425,key:${KEY},type:TH`
		) as DeviceQrPayload;
		identified(
			{ model: { device_type_id: 1, source: 'prefix', suggested_device_type_ids: [1] } },
			label
		);
		expect(flow.deviceTypeId).toBe('2');
		expect(modelMessage()?.textContent).toBe(m.device_setup_model_from_label());
		view?.unmount();

		flow = new DeviceSetupFlow({ devices, locationId: 8, licenses: [] });
		identified(
			{ model: { device_type_id: null, source: null, suggested_device_type_ids: [] } },
			parseDeviceQr('dev:24E124126E270425,type:ZZ') as DeviceQrPayload
		);
		expect(modelMessage()?.textContent).toBe(m.device_setup_model_label_unknown({ code: 'ZZ' }));
	});

	it('sends a label with a private AppKey the inventory lacks to support', async () => {
		identified(
			{ dev_eui: '24E124126E270425', keys: 'required' },
			parseDeviceQr(
				'app:24E124C0002A0001,dev:24E124126E270425,key:XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX,type:TH'
			) as DeviceQrPayload
		);

		expect(notices()).toEqual([
			{
				tone: 'warning',
				title: m.device_setup_keys_masked_title(),
				body: m.device_setup_keys_masked_body()
			}
		]);
		expect(text()).not.toContain(m.device_setup_keys_required_body());
		expect(byId<HTMLInputElement>('device-setup-join-eui-input')?.value).toBe('24E124C0002A0001');

		const navigations = captureNavigations();
		try {
			byId('device-setup-keys-masked-support')?.click();
			await expect.poll(() => navigations.urls).toEqual([supportHref(null, '24E124126E270425')]);
		} finally {
			navigations.stop();
		}
	});
});

describe('IdentifyStep scanner', () => {
	/** The scanner's decoding worker: answers every photo with a CropWatch label. */
	class FakeWorker {
		static instances: FakeWorker[] = [];
		onmessage: ((event: { data: { id: number; text: string | null } }) => void) | null = null;
		onerror: (() => void) | null = null;
		readonly terminate = vi.fn();
		constructor() {
			FakeWorker.instances.push(this);
		}
		postMessage(request: { id: number; mode: string }) {
			const text =
				request.mode === 'photo'
					? `app:24E124C0002A0001,dev:24E124126E270425,key:${KEY},type:TH`
					: null;
			queueMicrotask(() => this.onmessage?.({ data: { id: request.id, text } }));
		}
	}

	beforeEach(() => {
		FakeWorker.instances = [];
		vi.stubGlobal('Worker', FakeWorker);
		vi.spyOn(navigator.mediaDevices, 'getUserMedia').mockRejectedValue(
			new DOMException('Permission denied', 'NotAllowedError')
		);
	});

	async function photoFile(): Promise<File> {
		const canvas = document.createElement('canvas');
		canvas.width = 8;
		canvas.height = 8;
		const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
		return new File([blob as Blob], 'label.png', { type: 'image/png' });
	}

	it('opens the scanner and fills the device from a scanned label', async () => {
		devices.lookupDeviceSetup.mockResolvedValue(
			lookupResult({ dev_eui: '24E124126E270425', keys: 'required' })
		);
		render();
		const dialog = document.querySelector('dialog');
		expect(dialog?.open).toBe(false);

		byId('device-setup-scan-button')?.click();
		flushSync();
		expect(dialog?.open).toBe(true);
		await expect.poll(() => text()).toContain(m.device_setup_scanner_denied());

		const input = document.querySelector<HTMLInputElement>('.scanner__photo-input');
		const transfer = new DataTransfer();
		transfer.items.add(await photoFile());
		if (!input) throw new Error('no photo input');
		input.files = transfer.files;
		input.dispatchEvent(new Event('change', { bubbles: true }));

		await expect.poll(() => flow.devEuiInput).toBe('24E124126E270425');
		expect(flow.joinEuiInput).toBe('24E124C0002A0001');
		expect(flow.appKeyInput).toBe(KEY);
		expect(flow.deviceTypeId).toBe('2');
		await expect.poll(() => dialog?.open).toBe(false);
		expect(byId<HTMLInputElement>('device-setup-dev-eui-input')?.value).toBe('24E124126E270425');
		await vi.waitFor(() =>
			expect(devices.lookupDeviceSetup).toHaveBeenCalledWith(
				{ dev_eui: '24E124126E270425', location_id: 8 },
				{ signal: expect.any(AbortSignal) }
			)
		);
	});
});
