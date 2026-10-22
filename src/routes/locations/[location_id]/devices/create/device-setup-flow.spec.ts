import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '$lib/api/api-error';
import type { DeviceSetupLookupResult, DeviceSetupResult } from '$lib/api/api.dtos';
import { parseDeviceQr, type DeviceQrPayload } from '$lib/devices/qr-payload';
import { createClientServices } from '$lib/services/client';
import { createFakeFetch, jsonResponse, testPublicConfig } from '$lib/testing/http';
import { createMockServices, type MockServices } from '$lib/testing/mock-services';
import { DeviceSetupFlow, parseCoordinate, toSetupFailure } from './device-setup-flow.svelte';

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

/** Exactly what the HTTP client throws: the body wrapped as { url, payload }. */
const apiError = (status: number, payload: unknown) =>
	new ApiError(status, 'Error', { url: 'https://api/v1/device-setup', payload });

const setupError = (status: number, code: string, details: Record<string, unknown> = {}) =>
	apiError(status, {
		statusCode: status,
		code,
		message: 'x',
		reference: 'CW-ABC123',
		details
	});

/** The device repository every flow in a test talks to. */
let devices: MockServices['devices'];

beforeEach(() => {
	devices = createMockServices().devices;
});

const newFlow = () =>
	new DeviceSetupFlow({
		devices,
		locationId: 8,
		licenses: [{ id: 14, seatIndex: 2 }]
	});

/** A flow whose DevEUI has been looked up. */
async function identified(overrides: Partial<DeviceSetupLookupResult> = {}) {
	devices.lookupDeviceSetup.mockResolvedValue(lookupResult(overrides));
	const flow = newFlow();
	flow.devEuiInput = '00:13:7a:10:00:04:41:df';
	await flow.runLookup();
	return flow;
}

afterEach(() => vi.restoreAllMocks());

describe('toSetupFailure', () => {
	it('reads the setup code, reference and details from the wrapped body', () => {
		expect(toSetupFailure(setupError(409, 'DEVICE_ALREADY_YOURS', { name: '2nd Floor' }))).toEqual({
			code: 'DEVICE_ALREADY_YOURS',
			message: 'x',
			reference: 'CW-ABC123',
			details: { name: '2nd Floor' }
		});
	});

	it('keeps 409 setup codes apart from billing conflicts', () => {
		expect(toSetupFailure(setupError(409, 'DEVICE_OWNED_BY_OTHER_ACCOUNT')).code).toBe(
			'DEVICE_OWNED_BY_OTHER_ACCOUNT'
		);
		expect(
			toSetupFailure(
				apiError(409, {
					statusCode: 409,
					message: 'License is already assigned. Move it or unassign it first.'
				})
			).code
		).toBe('LICENSE_UNAVAILABLE');
	});

	it('maps a missing license to LICENSE_UNAVAILABLE and other 404s to FORBIDDEN', () => {
		expect(toSetupFailure(apiError(404, { message: 'License not found' })).code).toBe(
			'LICENSE_UNAVAILABLE'
		);
		expect(toSetupFailure(apiError(404, { message: 'Location not found' })).code).toBe('FORBIDDEN');
	});

	it('maps rate limits and unknown errors', () => {
		expect(toSetupFailure(apiError(429, { message: 'Too Many Requests' })).code).toBe(
			'RATE_LIMITED'
		);
		expect(toSetupFailure(new Error('boom')).code).toBe('UNKNOWN');
	});

	it('maps a 503 without a setup code to NETWORK_UNAVAILABLE, keeping the message', () => {
		expect(toSetupFailure(apiError(503, { message: 'Service Unavailable' }))).toEqual({
			code: 'NETWORK_UNAVAILABLE',
			message: 'Service Unavailable',
			reference: null,
			details: {}
		});
	});

	it('treats a 403 about a licence as LICENSE_UNAVAILABLE and other statuses as UNKNOWN', () => {
		expect(toSetupFailure(apiError(403, { message: 'No free licence' })).code).toBe(
			'LICENSE_UNAVAILABLE'
		);
		expect(toSetupFailure(apiError(403, { message: 'Forbidden' })).code).toBe('FORBIDDEN');
		// The licence wording only counts for 403/404/409.
		expect(toSetupFailure(apiError(429, { message: 'License checks throttled' })).code).toBe(
			'RATE_LIMITED'
		);
		expect(toSetupFailure(apiError(500, { message: 'License service down' })).code).toBe('UNKNOWN');
	});

	it('ignores a reference or details of the wrong type', () => {
		expect(
			toSetupFailure(
				apiError(422, { code: 'INVALID_NAME', message: '', reference: 42, details: 'no' })
			)
		).toEqual({ code: 'INVALID_NAME', message: null, reference: null, details: {} });
	});

	it('reads a body that is not an object, or an error without an envelope', () => {
		// A plain-text error body: the envelope itself is read.
		expect(toSetupFailure(apiError(502, 'Bad Gateway'))).toEqual({
			code: 'UNKNOWN',
			message: 'Bad Gateway',
			reference: null,
			details: {}
		});
		expect(toSetupFailure(new ApiError(500, 'Error', null))).toEqual({
			code: 'UNKNOWN',
			message: null,
			reference: null,
			details: {}
		});
		// An unwrapped setup body still yields its code.
		expect(toSetupFailure(new ApiError(409, 'Error', { code: 'SETUP_IN_PROGRESS' })).code).toBe(
			'SETUP_IN_PROGRESS'
		);
	});
});

describe('parseCoordinate', () => {
	it('accepts decimal points and commas within range', () => {
		expect(parseCoordinate('35.6812', 90)).toBe(35.6812);
		expect(parseCoordinate(' 4,9 ', 90)).toBe(4.9);
		expect(parseCoordinate('-139.7671', 180)).toBe(-139.7671);
	});

	it('rejects out-of-range or malformed values', () => {
		expect(parseCoordinate('91', 90)).toBeNull();
		expect(parseCoordinate('35,68,1', 90)).toBeNull();
		expect(parseCoordinate('', 90)).toBeNull();
		expect(parseCoordinate('abc', 180)).toBeNull();
	});

	it('accepts a leading plus and the limits themselves', () => {
		expect(parseCoordinate('+12', 90)).toBe(12);
		expect(parseCoordinate('-90', 90)).toBe(-90);
		expect(parseCoordinate('180', 180)).toBe(180);
		expect(parseCoordinate('180.5', 180)).toBeNull();
		expect(parseCoordinate('1234', 180)).toBeNull();
	});
});

describe('DeviceSetupFlow', () => {
	it('suggests the model from the lookup and lets the user continue', async () => {
		const flow = await identified();
		expect(flow.deviceTypeId).toBe('10');
		expect(flow.identifyComplete).toBe(true);
		flow.next();
		expect(flow.step).toBe('details');
	});

	it('looks the DevEUI up at its location, cancellable', async () => {
		const flow = await identified();

		expect(devices.lookupDeviceSetup).toHaveBeenCalledWith(
			{ dev_eui: '00137A10000441DF', location_id: 8 },
			{ signal: expect.any(AbortSignal) }
		);
		expect(flow.lookingUp).toBe(false);
		expect(flow.lookupError).toBeNull();
	});

	it('replaces an untouched suggestion when the DevEUI changes', async () => {
		const flow = await identified();
		devices.lookupDeviceSetup.mockResolvedValue(
			lookupResult({
				dev_eui: '2CF7F1C04430017F',
				model: { device_type_id: 22, source: 'prefix', suggested_device_type_ids: [22] }
			})
		);
		flow.devEuiInput = '2CF7F1C04430017F';
		await flow.runLookup();
		expect(flow.deviceTypeId).toBe('22');
	});

	it('keeps a model the user chose', async () => {
		const flow = await identified();
		flow.chooseModel('22');
		devices.lookupDeviceSetup.mockResolvedValue(lookupResult({ dev_eui: '2CF7F1C04430017F' }));
		flow.devEuiInput = '2CF7F1C04430017F';
		await flow.runLookup();
		expect(flow.deviceTypeId).toBe('22');
	});

	it('clears an untouched model when the lookup suggests none', async () => {
		const flow = await identified();
		devices.lookupDeviceSetup.mockResolvedValue(
			lookupResult({
				dev_eui: '2CF7F1C04430017F',
				model: { device_type_id: null, source: null, suggested_device_type_ids: [] }
			})
		);
		flow.devEuiInput = '2CF7F1C04430017F';
		await flow.runLookup();
		expect(flow.deviceTypeId).toBe('');
		expect(flow.identifyComplete).toBe(false);
	});

	it('lets the inventory overrule a model the user chose', async () => {
		const flow = await identified();
		flow.chooseModel('22');
		devices.lookupDeviceSetup.mockResolvedValue(
			lookupResult({
				model: { device_type_id: 10, source: 'inventory', suggested_device_type_ids: [] }
			})
		);
		await flow.runLookup();
		expect(flow.deviceTypeId).toBe('10');
		expect(flow.modelTouched).toBe(true);
	});

	it('does not look up an incomplete DevEUI', async () => {
		const flow = newFlow();
		flow.devEuiInput = '00137A10';
		await flow.runLookup();

		expect(devices.lookupDeviceSetup).not.toHaveBeenCalled();
		expect(flow.lookingUp).toBe(false);
	});

	it('drops a lookup answer for a DevEUI the user has since changed', async () => {
		let resolveLookup: (value: DeviceSetupLookupResult) => void = () => undefined;
		devices.lookupDeviceSetup.mockReturnValue(new Promise((resolve) => (resolveLookup = resolve)));
		const flow = newFlow();
		flow.devEuiInput = '00137A10000441DF';
		const pending = flow.runLookup();
		flow.devEuiInput = '00137A10000441E0';
		resolveLookup(lookupResult());
		await pending;
		expect(flow.lookup).toBeNull();
		expect(flow.deviceTypeId).toBe('');
	});

	it('aborts a lookup that a newer one replaced, and ignores its answer', async () => {
		const resolvers: ((value: DeviceSetupLookupResult) => void)[] = [];
		devices.lookupDeviceSetup.mockImplementation(
			() => new Promise((resolve) => resolvers.push(resolve))
		);
		const flow = newFlow();
		flow.devEuiInput = '00137A10000441DF';
		const first = flow.runLookup();
		const second = flow.runLookup();
		const [, firstOptions] = devices.lookupDeviceSetup.mock.calls[0];
		expect(firstOptions?.signal?.aborted).toBe(true);
		expect(flow.lookingUp).toBe(true);

		resolvers[0](
			lookupResult({
				model: { device_type_id: 22, source: 'prefix', suggested_device_type_ids: [] }
			})
		);
		await first;
		// The replaced lookup neither applies its answer nor ends the newer one.
		expect(flow.lookup).toBeNull();
		expect(flow.lookingUp).toBe(true);

		resolvers[1](lookupResult());
		await second;
		expect(flow.deviceTypeId).toBe('10');
		expect(flow.lookingUp).toBe(false);
	});

	it('stays quiet when a cancelled lookup fails', async () => {
		let rejectLookup: (error: unknown) => void = () => undefined;
		devices.lookupDeviceSetup.mockReturnValue(new Promise((_, reject) => (rejectLookup = reject)));
		const flow = newFlow();
		flow.devEuiInput = '00137A10000441DF';
		const pending = flow.runLookup();
		expect(flow.lookingUp).toBe(true);

		flow.cancelLookup();
		expect(flow.lookingUp).toBe(false);
		expect(devices.lookupDeviceSetup.mock.calls[0][1]?.signal?.aborted).toBe(true);
		rejectLookup(new DOMException('Aborted', 'AbortError'));
		await pending;

		expect(flow.lookupError).toBeNull();
		expect(flow.lookingUp).toBe(false);
	});

	it('blocks devices that belong to someone', async () => {
		const flow = await identified({ ownership: { status: 'other_account' } });
		expect(flow.blockedByOwnership).toBe(true);
		flow.next();
		expect(flow.step).toBe('identify');
	});

	it('treats a lookup for another DevEUI as no lookup', async () => {
		const flow = await identified({ ownership: { status: 'other_account' } });
		flow.devEuiInput = '00137A10000441E0';

		expect(flow.currentLookup).toBeNull();
		expect(flow.blockedByOwnership).toBe(false);
		expect(flow.keysNeeded).toBe(false);
		expect(flow.modelSupported).toBe(true);
		expect(flow.identifyComplete).toBe(false);
	});

	it('requires a model the region supports', async () => {
		const flow = await identified();
		flow.chooseModel('31');

		expect(flow.modelSupported).toBe(false);
		expect(flow.identifyComplete).toBe(false);
		flow.next();
		expect(flow.step).toBe('identify');
		expect(flow.attempted).toBe(true);
	});

	it('requires valid keys only when they are needed, and sends them then', async () => {
		const flow = await identified({ keys: 'required' });
		expect(flow.identifyComplete).toBe(false);
		flow.joinEuiInput = '0000000000000001';
		flow.appKeyInput = '2b7e 1516 28ae d2a6 abf7 1588 09cf 4f3c';
		expect(flow.identifyComplete).toBe(true);
		expect(flow.buildRequest()).toMatchObject({
			join_eui: '0000000000000001',
			app_key: '2B7E151628AED2A6ABF7158809CF4F3C'
		});
	});

	it('never sends keys the lookup did not ask for', async () => {
		const flow = await identified({ keys: 'inventory' });
		flow.appKeyInput = '2B7E151628AED2A6ABF7158809CF4F3C';
		expect(flow.buildRequest()).not.toHaveProperty('app_key');
	});

	it('clears keys from a previous device when a new QR code is scanned', async () => {
		const flow = await identified({ keys: 'required' });
		flow.joinEuiInput = '0000000000000001';
		flow.appKeyInput = '2B7E151628AED2A6ABF7158809CF4F3C';
		flow.applyQr({ devEui: '2CF7F1C04430017F' });
		expect(flow.joinEuiInput).toBe('');
		expect(flow.appKeyInput).toBe('');
	});

	it('keeps typed keys when the scanned code is for the same device', async () => {
		const flow = await identified({ keys: 'required' });
		flow.joinEuiInput = '0000000000000001';
		flow.appKeyInput = '2B7E151628AED2A6ABF7158809CF4F3C';
		flow.applyQr({ devEui: '00137A10000441DF' });

		expect(flow.joinEuiInput).toBe('0000000000000001');
		expect(flow.appKeyInput).toBe('2B7E151628AED2A6ABF7158809CF4F3C');
		expect(flow.currentLabel).toEqual({ devEui: '00137A10000441DF' });
	});

	it('takes the keys and the model a code carries, unless the inventory knows the model', async () => {
		const flow = newFlow();
		flow.chooseModel('22');
		flow.applyQr({
			devEui: '00137A10000441DF',
			joinEui: '70B3D57ED0000000',
			appKey: '2B7E151628AED2A6ABF7158809CF4F3C',
			deviceTypeId: 2
		});
		expect(flow).toMatchObject({
			devEuiInput: '00137A10000441DF',
			joinEuiInput: '70B3D57ED0000000',
			appKeyInput: '2B7E151628AED2A6ABF7158809CF4F3C',
			deviceTypeId: '2',
			modelTouched: false
		});

		const stocked = await identified({
			model: { device_type_id: 10, source: 'inventory', suggested_device_type_ids: [] }
		});
		stocked.applyQr({ devEui: '00137A10000441DF', deviceTypeId: 2 });
		expect(stocked.deviceTypeId).toBe('10');
	});

	it('asks for keys the network requested even when the lookup did not', async () => {
		const flow = await identified({ keys: 'network' });
		expect(flow.keysNeeded).toBe(false);
		flow.keysRequestedByNetwork = true;
		expect(flow.keysNeeded).toBe(true);
		expect(flow.identifyComplete).toBe(false);
	});

	it('sends parsed coordinates only for a precise position', async () => {
		const flow = await identified();
		flow.lat = '35,6812';
		flow.long = '139.7671';
		expect(flow.buildRequest().lat).toBeUndefined();
		flow.usePreciseLocation = true;
		expect(flow.buildRequest()).toMatchObject({ lat: 35.6812, long: 139.7671 });
		flow.lat = '95';
		expect(flow.coordinatesValid).toBe(false);
	});

	it('builds the whole request from the trimmed fields', async () => {
		const flow = await identified();
		flow.name = '  FL1 Smoke Detector ';
		flow.group = ' Floor 1 ';
		flow.installedAt = '2026-10-01';
		flow.usePreciseLocation = true;
		flow.lat = '35.6812';
		flow.long = 'east';

		expect(flow.buildRequest()).toEqual({
			dev_eui: '00137A10000441DF',
			location_id: 8,
			device_type_id: 10,
			name: 'FL1 Smoke Detector',
			group: 'Floor 1',
			installed_at: '2026-10-01',
			lat: 35.6812,
			long: undefined,
			license_id: 14
		});

		flow.group = '  ';
		flow.installedAt = '';
		flow.licenseId = '';
		flow.lat = 'north';
		flow.long = '139.7671';
		expect(flow.buildRequest()).toMatchObject({
			group: undefined,
			installed_at: undefined,
			lat: undefined,
			long: 139.7671,
			license_id: undefined
		});
	});

	it('needs a name, a license and valid coordinates before the review', async () => {
		const flow = await identified();
		flow.next();
		expect(flow.step).toBe('details');
		expect(flow.attempted).toBe(false);

		flow.next();
		expect(flow.step).toBe('details');
		expect(flow.attempted).toBe(true);

		flow.name = 'FL1';
		flow.usePreciseLocation = true;
		flow.lat = '35.6812';
		expect(flow.detailsComplete).toBe(false);
		flow.long = '139.7671';
		expect(flow.detailsComplete).toBe(true);
		flow.licenseId = '';
		expect(flow.detailsComplete).toBe(false);
		flow.licenseId = '14';

		flow.next();
		expect(flow.step).toBe('review');
		expect(flow.attempted).toBe(false);

		// Next does nothing past the details step.
		flow.next();
		expect(flow.step).toBe('review');
		expect(flow.attempted).toBe(true);
	});

	it('finishes on success', async () => {
		const flow = await identified();
		flow.name = 'FL1 Smoke Detector';
		devices.setupDevice.mockResolvedValue({
			dev_eui: '00137A10000441DF',
			location_id: 8,
			name: 'FL1 Smoke Detector',
			steps: []
		});
		await flow.register();
		expect(flow.step).toBe('done');
		expect(flow.failure).toBeNull();
	});

	it('registers with the built request, showing progress meanwhile', async () => {
		const flow = await identified();
		flow.name = 'FL1';
		const result: DeviceSetupResult = {
			dev_eui: '00137A10000441DF',
			location_id: 8,
			name: 'FL1',
			steps: [{ key: 'availability', outcome: 'done' }]
		};
		let finish: (value: DeviceSetupResult) => void = () => undefined;
		devices.setupDevice.mockReturnValue(new Promise((resolve) => (finish = resolve)));

		const pending = flow.register();
		expect(flow.step).toBe('registering');
		expect(devices.setupDevice).toHaveBeenCalledWith(flow.buildRequest());

		finish(result);
		await pending;
		expect(flow.result).toEqual(result);
		expect(flow.step).toBe('done');
	});

	it('asks for keys on the first step when the network wants proof', async () => {
		const flow = await identified({ keys: 'inventory' });
		flow.name = 'FL1';
		devices.setupDevice.mockRejectedValue(setupError(422, 'KEYS_REQUIRED', { reason: 'verify' }));
		await flow.register();
		expect(flow.step).toBe('identify');
		expect(flow.keysNeeded).toBe(true);
		expect(flow.failure?.details.reason).toBe('verify');
	});

	it('returns to the first step when the AppKey does not match', async () => {
		const flow = await identified({ keys: 'required' });
		flow.name = 'FL1';
		devices.setupDevice.mockRejectedValue(setupError(422, 'KEYS_DO_NOT_MATCH'));
		await flow.register();
		expect(flow.step).toBe('identify');
		expect(flow.failure?.code).toBe('KEYS_DO_NOT_MATCH');
	});

	it('returns to the first step for invalid keys, showing the field errors', async () => {
		const flow = await identified({ keys: 'required' });
		flow.name = 'FL1';
		devices.setupDevice.mockRejectedValue(setupError(400, 'INVALID_KEYS'));
		await flow.register();

		expect(flow.step).toBe('identify');
		expect(flow.attempted).toBe(true);
		expect(flow.keysRequestedByNetwork).toBe(true);
		expect(flow.failure?.code).toBe('INVALID_KEYS');
	});

	it('explains other failures on the review step, with the support reference', async () => {
		const flow = await identified();
		flow.name = 'FL1';
		devices.setupDevice.mockRejectedValue(setupError(503, 'NETWORK_UNAVAILABLE'));
		await flow.register();
		expect(flow.step).toBe('review');
		expect(flow.failure).toMatchObject({ code: 'NETWORK_UNAVAILABLE', reference: 'CW-ABC123' });
	});

	it('clears an old error once the user moves on', async () => {
		const flow = await identified();
		flow.name = 'FL1';
		devices.setupDevice.mockRejectedValue(
			apiError(409, { message: 'License is already assigned.' })
		);
		await flow.register();
		expect(flow.failure?.code).toBe('LICENSE_UNAVAILABLE');
		flow.go('details');
		expect(flow.failure).toBeNull();
	});

	it('shows why a lookup failed', async () => {
		devices.lookupDeviceSetup.mockRejectedValue(apiError(403, { message: 'Forbidden' }));
		const flow = newFlow();
		flow.devEuiInput = '00137A10000441DF';
		await flow.runLookup();
		expect(flow.lookupError?.code).toBe('FORBIDDEN');
	});

	it('forgets the previous lookup when a lookup fails', async () => {
		const flow = await identified();
		devices.lookupDeviceSetup.mockRejectedValue(new TypeError('Failed to fetch'));
		await flow.runLookup();

		expect(flow.lookup).toBeNull();
		expect(flow.lookupError).toEqual({
			code: 'UNKNOWN',
			message: null,
			reference: null,
			details: {}
		});
		expect(flow.lookingUp).toBe(false);
	});

	it('keeps the selected license valid when the free licenses change', () => {
		const flow = newFlow();
		flow.syncLicenses([{ id: 15, seatIndex: 3 }]);
		expect(flow.licenseId).toBe('15');
		flow.syncLicenses([]);
		expect(flow.licenseId).toBe('');
	});

	it('keeps a selected license that is still free, and starts without one when none is', () => {
		const flow = newFlow();
		flow.syncLicenses([
			{ id: 9, seatIndex: 0 },
			{ id: 14, seatIndex: 2 }
		]);
		expect(flow.licenseId).toBe('14');

		const unlicensed = new DeviceSetupFlow({ devices, locationId: 8, licenses: [] });
		expect(unlicensed.licenseId).toBe('');
		expect(unlicensed.step).toBe('identify');
	});

	it('starts over for the next device, keeping the group and install date', async () => {
		const flow = await identified({ keys: 'required' });
		flow.applyQr({ devEui: '00137A10000441DF', joinEui: '70B3D57ED0000000' });
		flow.appKeyInput = '2B7E151628AED2A6ABF7158809CF4F3C';
		flow.chooseModel('22');
		flow.keysRequestedByNetwork = true;
		flow.name = 'FL1';
		flow.group = 'Floor 1';
		flow.installedAt = '2026-10-01';
		flow.usePreciseLocation = true;
		flow.lat = '35';
		flow.long = '139';
		flow.attempted = true;
		devices.setupDevice.mockResolvedValue({
			dev_eui: '00137A10000441DF',
			location_id: 8,
			name: 'FL1',
			steps: []
		});
		await flow.register();
		expect(flow.step).toBe('done');

		flow.reset([{ id: 21, seatIndex: 4 }]);

		expect(flow).toMatchObject({
			step: 'identify',
			devEuiInput: '',
			joinEuiInput: '',
			appKeyInput: '',
			deviceTypeId: '',
			modelTouched: false,
			scannedLabel: null,
			lookup: null,
			lookupError: null,
			keysRequestedByNetwork: false,
			name: '',
			group: 'Floor 1',
			installedAt: '2026-10-01',
			usePreciseLocation: false,
			lat: '',
			long: '',
			result: null,
			licenseId: '21',
			attempted: false,
			failure: null
		});

		flow.reset([]);
		expect(flow.licenseId).toBe('');
	});

	it('cancels a lookup still running when it starts over', async () => {
		devices.lookupDeviceSetup.mockReturnValue(new Promise(() => {}));
		const flow = newFlow();
		flow.devEuiInput = '00137A10000441DF';
		void flow.runLookup();
		expect(flow.lookingUp).toBe(true);

		flow.reset([]);

		expect(flow.lookingUp).toBe(false);
		expect(devices.lookupDeviceSetup.mock.calls[0][1]?.signal?.aborted).toBe(true);
	});
});

describe('DeviceSetupFlow with CropWatch labels', () => {
	const label = (key: string) =>
		parseDeviceQr(
			`app:24E124C0002A0001,dev:24E124126E270425,key:${key},type:TH`
		) as DeviceQrPayload;
	const KEY = '2B7E151628AED2A6ABF7158809CF4F3C';
	/** The lookup for the label's DevEUI: Milesight's prefix suggests the wrong model. */
	const labelLookup = (overrides: Partial<DeviceSetupLookupResult> = {}) =>
		devices.lookupDeviceSetup.mockResolvedValue(
			lookupResult({
				dev_eui: '24E124126E270425',
				model: { device_type_id: 1, source: 'prefix', suggested_device_type_ids: [1] },
				keys: 'required',
				supported_device_type_ids: [1, 2, 21],
				...overrides
			})
		);

	it('fills every field and keeps the label’s model over a prefix guess', async () => {
		labelLookup();
		const flow = newFlow();
		flow.applyQr(label(KEY));
		expect(flow.deviceTypeId).toBe('2');
		await flow.runLookup();
		expect(flow.deviceTypeId).toBe('2');
		expect(flow.identifyComplete).toBe(true);
		expect(flow.buildRequest()).toMatchObject({
			dev_eui: '24E124126E270425',
			device_type_id: 2,
			join_eui: '24E124C0002A0001',
			app_key: KEY
		});
	});

	it('lets CropWatch’s inventory overrule the label’s model', async () => {
		labelLookup({
			model: { device_type_id: 21, source: 'inventory', suggested_device_type_ids: [] },
			keys: 'inventory'
		});
		const flow = newFlow();
		flow.applyQr(label(KEY));
		await flow.runLookup();
		expect(flow.deviceTypeId).toBe('21');
	});

	it('takes a private AppKey from the inventory, and asks for it when it isn’t there', async () => {
		labelLookup({ keys: 'inventory' });
		const stocked = newFlow();
		stocked.applyQr(label('X'.repeat(32)));
		await stocked.runLookup();
		expect(stocked.currentLabel?.appKeyMasked).toBe(true);
		expect(stocked.keysNeeded).toBe(false);
		expect(stocked.identifyComplete).toBe(true);
		expect(stocked.buildRequest()).not.toHaveProperty('app_key');

		labelLookup({ keys: 'required' });
		const missing = newFlow();
		missing.applyQr(label('X'.repeat(32)));
		await missing.runLookup();
		expect(missing.keysNeeded).toBe(true);
		expect(missing.joinEuiInput).toBe('24E124C0002A0001');
		expect(missing.appKeyInput).toBe('');
		expect(missing.identifyComplete).toBe(false);
		missing.appKeyInput = KEY;
		expect(missing.identifyComplete).toBe(true);
	});

	it('forgets the label once another DevEUI is typed', async () => {
		const flow = newFlow();
		flow.applyQr(label(KEY));
		flow.devEuiInput = '00137A10000441DF';
		expect(flow.currentLabel).toBeNull();
		devices.lookupDeviceSetup.mockResolvedValue(lookupResult());
		await flow.runLookup();
		expect(flow.deviceTypeId).toBe('10');
	});
});

/**
 * The flow over the real browser services and a fake network: the exact
 * lookup/setup requests, and the API's error envelope.
 */
describe('DeviceSetupFlow over HTTP', () => {
	let session: string | undefined;

	function httpFlow(responder: Parameters<typeof createFakeFetch>[0]) {
		const fake = createFakeFetch(responder);
		vi.stubGlobal('fetch', fake.fetch);
		const services = createClientServices({
			config: testPublicConfig(),
			authToken: () => session
		});
		const flow = new DeviceSetupFlow({
			devices: services.devices,
			locationId: 8,
			licenses: [{ id: 14, seatIndex: 2 }]
		});
		return { flow, fake };
	}

	beforeEach(() => {
		session = 'jwt-token';
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('posts the lookup and the setup as the current session', async () => {
		const { flow, fake } = httpFlow((request) =>
			request.path === '/device-setup/lookup'
				? jsonResponse(lookupResult())
				: jsonResponse({ dev_eui: '00137A10000441DF', location_id: 8, name: 'FL1', steps: [] })
		);
		flow.devEuiInput = '00 13 7A 10 00 04 41 DF';
		await flow.runLookup();
		flow.name = 'FL1';
		session = 'refreshed-token';
		await flow.register();

		expect(fake.requests.map(({ path, method, body }) => ({ path, method, body }))).toEqual([
			{
				path: '/device-setup/lookup',
				method: 'POST',
				body: { dev_eui: '00137A10000441DF', location_id: 8 }
			},
			{
				path: '/device-setup',
				method: 'POST',
				body: {
					dev_eui: '00137A10000441DF',
					location_id: 8,
					device_type_id: 10,
					name: 'FL1',
					license_id: 14
				}
			}
		]);
		expect(fake.requests[0].signal).toBeInstanceOf(AbortSignal);
		expect(fake.requests.map((request) => request.headers.get('authorization'))).toEqual([
			'Bearer jwt-token',
			'Bearer refreshed-token'
		]);
		expect(flow.step).toBe('done');
	});

	it('sends no Authorization header without a session', async () => {
		session = undefined;
		const { flow, fake } = httpFlow(() => jsonResponse(lookupResult()));
		flow.devEuiInput = '00137A10000441DF';
		await flow.runLookup();

		expect(fake.onlyRequest().headers.get('authorization')).toBeNull();
		expect(flow.lookup).toEqual(lookupResult());
	});

	it('reads the setup error from the response body', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		const { flow } = httpFlow((request) =>
			request.path === '/device-setup/lookup'
				? jsonResponse(lookupResult())
				: jsonResponse(
						{
							statusCode: 409,
							code: 'DEVICE_OWNED_BY_OTHER_ACCOUNT',
							message: 'Owned elsewhere',
							reference: 'CW-REF-1',
							details: { region: 'as1' }
						},
						{ status: 409, statusText: 'Conflict' }
					)
		);
		flow.devEuiInput = '00137A10000441DF';
		await flow.runLookup();
		flow.name = 'FL1';
		await flow.register();

		expect(flow.step).toBe('review');
		expect(flow.failure).toEqual({
			code: 'DEVICE_OWNED_BY_OTHER_ACCOUNT',
			message: 'Owned elsewhere',
			reference: 'CW-REF-1',
			details: { region: 'as1' }
		});
	});

	it('maps a billing 404 without a setup code from the response body', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		const { flow } = httpFlow(() =>
			jsonResponse({ statusCode: 404, message: 'License not found' }, { status: 404 })
		);
		flow.devEuiInput = '00137A10000441DF';
		await flow.runLookup();

		expect(flow.lookupError).toEqual({
			code: 'LICENSE_UNAVAILABLE',
			message: 'License not found',
			reference: null,
			details: {}
		});
	});
});
