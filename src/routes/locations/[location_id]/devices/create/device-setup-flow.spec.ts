import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiService, ApiServiceError } from '$lib/api/api.service';
import type { DeviceSetupLookupResult } from '$lib/api/api.dtos';
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

/** Exactly what ApiService.request() throws: the body wrapped as { url, payload }. */
const apiError = (status: number, payload: unknown) =>
	new ApiServiceError(status, 'Error', { url: 'https://api/v1/device-setup', payload });

const setupError = (status: number, code: string, details: Record<string, unknown> = {}) =>
	apiError(status, {
		statusCode: status,
		code,
		message: 'x',
		reference: 'CW-ABC123',
		details
	});

const newFlow = () =>
	new DeviceSetupFlow({
		getAuthToken: () => 'token',
		locationId: 8,
		licenses: [{ id: 14, seatIndex: 2 }]
	});

/** A flow whose DevEUI has been looked up. */
async function identified(overrides: Partial<DeviceSetupLookupResult> = {}) {
	vi.spyOn(ApiService.prototype, 'lookupDeviceSetup').mockResolvedValue(lookupResult(overrides));
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
});

describe('DeviceSetupFlow', () => {
	it('suggests the model from the lookup and lets the user continue', async () => {
		const flow = await identified();
		expect(flow.deviceTypeId).toBe('10');
		expect(flow.identifyComplete).toBe(true);
		flow.next();
		expect(flow.step).toBe('details');
	});

	it('replaces an untouched suggestion when the DevEUI changes', async () => {
		const flow = await identified();
		vi.spyOn(ApiService.prototype, 'lookupDeviceSetup').mockResolvedValue(
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
		vi.spyOn(ApiService.prototype, 'lookupDeviceSetup').mockResolvedValue(
			lookupResult({ dev_eui: '2CF7F1C04430017F' })
		);
		flow.devEuiInput = '2CF7F1C04430017F';
		await flow.runLookup();
		expect(flow.deviceTypeId).toBe('22');
	});

	it('drops a lookup answer for a DevEUI the user has since changed', async () => {
		let resolveLookup: (value: DeviceSetupLookupResult) => void = () => undefined;
		vi.spyOn(ApiService.prototype, 'lookupDeviceSetup').mockReturnValue(
			new Promise((resolve) => (resolveLookup = resolve))
		);
		const flow = newFlow();
		flow.devEuiInput = '00137A10000441DF';
		const pending = flow.runLookup();
		flow.devEuiInput = '00137A10000441E0';
		resolveLookup(lookupResult());
		await pending;
		expect(flow.lookup).toBeNull();
		expect(flow.deviceTypeId).toBe('');
	});

	it('blocks devices that belong to someone', async () => {
		const flow = await identified({ ownership: { status: 'other_account' } });
		expect(flow.blockedByOwnership).toBe(true);
		flow.next();
		expect(flow.step).toBe('identify');
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

	it('finishes on success', async () => {
		const flow = await identified();
		flow.name = 'FL1 Smoke Detector';
		vi.spyOn(ApiService.prototype, 'setupDevice').mockResolvedValue({
			dev_eui: '00137A10000441DF',
			location_id: 8,
			name: 'FL1 Smoke Detector',
			steps: []
		});
		await flow.register();
		expect(flow.step).toBe('done');
		expect(flow.failure).toBeNull();
	});

	it('asks for keys on the first step when the network wants proof', async () => {
		const flow = await identified({ keys: 'inventory' });
		flow.name = 'FL1';
		vi.spyOn(ApiService.prototype, 'setupDevice').mockRejectedValue(
			setupError(422, 'KEYS_REQUIRED', { reason: 'verify' })
		);
		await flow.register();
		expect(flow.step).toBe('identify');
		expect(flow.keysNeeded).toBe(true);
		expect(flow.failure?.details.reason).toBe('verify');
	});

	it('returns to the first step when the AppKey does not match', async () => {
		const flow = await identified({ keys: 'required' });
		flow.name = 'FL1';
		vi.spyOn(ApiService.prototype, 'setupDevice').mockRejectedValue(
			setupError(422, 'KEYS_DO_NOT_MATCH')
		);
		await flow.register();
		expect(flow.step).toBe('identify');
		expect(flow.failure?.code).toBe('KEYS_DO_NOT_MATCH');
	});

	it('explains other failures on the review step, with the support reference', async () => {
		const flow = await identified();
		flow.name = 'FL1';
		vi.spyOn(ApiService.prototype, 'setupDevice').mockRejectedValue(
			setupError(503, 'NETWORK_UNAVAILABLE')
		);
		await flow.register();
		expect(flow.step).toBe('review');
		expect(flow.failure).toMatchObject({ code: 'NETWORK_UNAVAILABLE', reference: 'CW-ABC123' });
	});

	it('clears an old error once the user moves on', async () => {
		const flow = await identified();
		flow.name = 'FL1';
		vi.spyOn(ApiService.prototype, 'setupDevice').mockRejectedValue(
			apiError(409, { message: 'License is already assigned.' })
		);
		await flow.register();
		expect(flow.failure?.code).toBe('LICENSE_UNAVAILABLE');
		flow.go('details');
		expect(flow.failure).toBeNull();
	});

	it('shows why a lookup failed', async () => {
		vi.spyOn(ApiService.prototype, 'lookupDeviceSetup').mockRejectedValue(
			apiError(403, { message: 'Forbidden' })
		);
		const flow = newFlow();
		flow.devEuiInput = '00137A10000441DF';
		await flow.runLookup();
		expect(flow.lookupError?.code).toBe('FORBIDDEN');
	});

	it('keeps the selected license valid when the free licenses change', () => {
		const flow = newFlow();
		flow.syncLicenses([{ id: 15, seatIndex: 3 }]);
		expect(flow.licenseId).toBe('15');
		flow.syncLicenses([]);
		expect(flow.licenseId).toBe('');
	});
});
