import { ApiService, ApiServiceError } from '$lib/api/api.service';
import { readApiErrorMessage } from '$lib/api/api-error';
import type {
	DeviceSetupErrorCode,
	DeviceSetupLookupResult,
	DeviceSetupRequest,
	DeviceSetupResult
} from '$lib/api/api.dtos';
import { checkAppKey, checkEui } from '$lib/devices/eui';
import type { DeviceQrPayload } from '$lib/devices/qr-payload';

export type SetupStep = 'identify' | 'details' | 'review' | 'registering' | 'done';

export interface DeviceTypeOption {
	label: string;
	value: string;
}

export interface LicenseOption {
	id: number;
	seatIndex: number;
}

/** A failed lookup or setup the UI can explain: API codes plus generic HTTP cases. */
export interface SetupFailure {
	code: DeviceSetupErrorCode | 'LICENSE_UNAVAILABLE' | 'FORBIDDEN' | 'RATE_LIMITED' | 'UNKNOWN';
	message: string | null;
	reference: string | null;
	details: Record<string, unknown>;
}

/** Codes that are fixed on the first step (by entering or correcting keys). */
const KEY_CODES = new Set<SetupFailure['code']>([
	'KEYS_REQUIRED',
	'INVALID_KEYS',
	'KEYS_DO_NOT_MATCH'
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null;

/**
 * Maps an API error to a SetupFailure. ApiService wraps the response body as
 * `{ url, payload }`, so the setup error (`{ code, message, reference }`) is
 * one level down.
 */
export function toSetupFailure(error: unknown): SetupFailure {
	if (!(error instanceof ApiServiceError)) {
		return { code: 'UNKNOWN', message: null, reference: null, details: {} };
	}
	const wrapper = isRecord(error.payload) ? error.payload : {};
	const body = isRecord(wrapper.payload) ? wrapper.payload : wrapper;
	const message = readApiErrorMessage(body, '') || null;

	if (typeof body.code === 'string') {
		return {
			code: body.code as DeviceSetupErrorCode,
			message,
			reference: typeof body.reference === 'string' ? body.reference : null,
			details: isRecord(body.details) ? body.details : {}
		};
	}

	const failure = (code: SetupFailure['code']): SetupFailure => ({
		code,
		message,
		reference: null,
		details: {}
	});
	// The license checks come from the billing service without a setup code.
	if (/licen/i.test(message ?? '') && [403, 404, 409].includes(error.status)) {
		return failure('LICENSE_UNAVAILABLE');
	}
	switch (error.status) {
		case 403:
		case 404:
			return failure('FORBIDDEN');
		case 429:
			return failure('RATE_LIMITED');
		case 503:
			return failure('NETWORK_UNAVAILABLE');
		default:
			return failure('UNKNOWN');
	}
}

/**
 * A latitude/longitude typed by a person: accepts a decimal comma, rejects
 * anything outside ±limit. Null when empty or invalid.
 */
export function parseCoordinate(raw: string, limit: 90 | 180): number | null {
	const text = raw.trim().replace(',', '.');
	if (!/^[-+]?\d{1,3}(\.\d+)?$/.test(text)) return null;
	const value = Number(text);
	return Number.isFinite(value) && Math.abs(value) <= limit ? value : null;
}

/**
 * State for the three-step setup wizard. One instance per page; the step
 * components read and write it directly.
 */
export class DeviceSetupFlow {
	step = $state<SetupStep>('identify');

	devEuiInput = $state('');
	joinEuiInput = $state('');
	appKeyInput = $state('');
	deviceTypeId = $state('');
	/** The user picked the model themselves; lookups stop overriding it. */
	modelTouched = $state(false);

	lookup = $state<DeviceSetupLookupResult | null>(null);
	lookingUp = $state(false);
	lookupError = $state<SetupFailure | null>(null);

	name = $state('');
	group = $state('');
	installedAt = $state('');
	usePreciseLocation = $state(false);
	lat = $state('');
	long = $state('');
	licenseId = $state('');

	/** Show field errors only after the user tried to continue. */
	attempted = $state(false);
	result = $state<DeviceSetupResult | null>(null);
	failure = $state<SetupFailure | null>(null);
	/** Set when the network asked for keys the lookup did not (e.g. to prove ownership). */
	keysRequestedByNetwork = $state(false);

	#abort: AbortController | null = null;

	constructor(
		private readonly ctx: {
			/** Read per request so a refreshed session token is always used. */
			getAuthToken: () => string | null;
			locationId: number;
			licenses: LicenseOption[];
		}
	) {
		this.licenseId = ctx.licenses[0] ? String(ctx.licenses[0].id) : '';
	}

	get devEui() {
		return checkEui(this.devEuiInput);
	}

	get joinEui() {
		return checkEui(this.joinEuiInput);
	}

	get appKey() {
		return checkAppKey(this.appKeyInput);
	}

	get latitude(): number | null {
		return parseCoordinate(this.lat, 90);
	}

	get longitude(): number | null {
		return parseCoordinate(this.long, 180);
	}

	/** The lookup that belongs to the DevEUI currently typed (not a stale one). */
	get currentLookup(): DeviceSetupLookupResult | null {
		return this.lookup && this.lookup.dev_eui === this.devEui.value ? this.lookup : null;
	}

	get keysNeeded(): boolean {
		const lookup = this.currentLookup;
		return lookup !== null && (lookup.keys === 'required' || this.keysRequestedByNetwork);
	}

	get blockedByOwnership(): boolean {
		const lookup = this.currentLookup;
		return lookup !== null && lookup.ownership.status !== 'available';
	}

	get modelSupported(): boolean {
		const lookup = this.currentLookup;
		return (
			!this.deviceTypeId ||
			!lookup ||
			lookup.supported_device_type_ids.includes(Number(this.deviceTypeId))
		);
	}

	get identifyComplete(): boolean {
		return (
			this.currentLookup !== null &&
			!this.blockedByOwnership &&
			this.deviceTypeId !== '' &&
			this.modelSupported &&
			(!this.keysNeeded || (this.joinEui.issue === null && this.appKey.issue === null))
		);
	}

	get coordinatesValid(): boolean {
		return !this.usePreciseLocation || (this.latitude !== null && this.longitude !== null);
	}

	get detailsComplete(): boolean {
		return this.name.trim().length > 0 && this.licenseId !== '' && this.coordinatesValid;
	}

	/** Moves between steps; an earlier error no longer applies once the user acts on it. */
	go(step: SetupStep): void {
		this.attempted = false;
		this.failure = null;
		this.step = step;
	}

	next(): void {
		this.attempted = true;
		if (this.step === 'identify' && this.identifyComplete) this.go('details');
		else if (this.step === 'details' && this.detailsComplete) this.go('review');
	}

	chooseModel(value: string): void {
		this.deviceTypeId = value;
		this.modelTouched = true;
	}

	applyQr(payload: DeviceQrPayload): void {
		// Keys from a previous device must never travel with a new DevEUI.
		if (payload.devEui !== this.devEui.value) {
			this.joinEuiInput = '';
			this.appKeyInput = '';
		}
		this.devEuiInput = payload.devEui;
		if (payload.joinEui) this.joinEuiInput = payload.joinEui;
		if (payload.appKey) this.appKeyInput = payload.appKey;
		// The identify step looks the new DevEUI up as soon as it is complete.
	}

	cancelLookup(): void {
		this.#abort?.abort();
		this.#abort = null;
		this.lookingUp = false;
	}

	async runLookup(): Promise<void> {
		const devEui = this.devEui;
		if (devEui.issue) return;

		this.#abort?.abort();
		const abort = new AbortController();
		this.#abort = abort;
		this.lookingUp = true;
		this.lookupError = null;

		try {
			const api = new ApiService({ authToken: this.ctx.getAuthToken() });
			const lookup = await api.lookupDeviceSetup(
				{ dev_eui: devEui.value, location_id: this.ctx.locationId },
				{ signal: abort.signal }
			);
			// Drop answers for a DevEUI the user has since changed.
			if (abort.signal.aborted || this.devEui.value !== devEui.value) return;
			this.lookup = lookup;
			this.keysRequestedByNetwork = false;
			const suggested = lookup.model.device_type_id;
			if (lookup.model.source === 'inventory' && suggested) {
				// CropWatch provisioned it: the model on file is authoritative.
				this.deviceTypeId = String(suggested);
			} else if (!this.modelTouched) {
				this.deviceTypeId = suggested ? String(suggested) : '';
			}
		} catch (error) {
			if (abort.signal.aborted) return;
			this.lookup = null;
			this.lookupError = toSetupFailure(error);
		} finally {
			if (this.#abort === abort) {
				this.lookingUp = false;
				this.#abort = null;
			}
		}
	}

	buildRequest(): DeviceSetupRequest {
		const precise = this.usePreciseLocation;
		return {
			dev_eui: this.devEui.value,
			location_id: this.ctx.locationId,
			device_type_id: Number(this.deviceTypeId),
			name: this.name.trim(),
			group: this.group.trim() || undefined,
			installed_at: this.installedAt || undefined,
			lat: precise ? (this.latitude ?? undefined) : undefined,
			long: precise ? (this.longitude ?? undefined) : undefined,
			license_id: this.licenseId ? Number(this.licenseId) : undefined,
			...(this.keysNeeded ? { join_eui: this.joinEui.value, app_key: this.appKey.value } : {})
		};
	}

	async register(): Promise<void> {
		this.failure = null;
		this.step = 'registering';
		try {
			const api = new ApiService({ authToken: this.ctx.getAuthToken() });
			this.result = await api.setupDevice(this.buildRequest());
			this.step = 'done';
		} catch (error) {
			const failure = toSetupFailure(error);
			// Key problems are fixed on the first step; everything else is
			// explained where the user pressed Register.
			if (KEY_CODES.has(failure.code)) {
				this.keysRequestedByNetwork = true;
				this.attempted = true;
				this.step = 'identify';
			} else {
				this.step = 'review';
			}
			this.failure = failure;
		}
	}

	/** Keeps the selected license valid when the list of free licenses changes. */
	syncLicenses(licenses: LicenseOption[]): void {
		if (!licenses.some((license) => String(license.id) === this.licenseId)) {
			this.licenseId = licenses[0] ? String(licenses[0].id) : '';
		}
	}

	/** Start over for the next device, keeping group and install date. */
	reset(licenses: LicenseOption[]): void {
		this.cancelLookup();
		this.devEuiInput = '';
		this.joinEuiInput = '';
		this.appKeyInput = '';
		this.deviceTypeId = '';
		this.modelTouched = false;
		this.lookup = null;
		this.lookupError = null;
		this.keysRequestedByNetwork = false;
		this.name = '';
		this.usePreciseLocation = false;
		this.lat = '';
		this.long = '';
		this.result = null;
		this.licenseId = licenses[0] ? String(licenses[0].id) : '';
		this.go('identify');
	}
}
