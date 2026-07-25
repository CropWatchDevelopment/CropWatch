import { ApiService, ApiServiceError } from '$lib/api/api.service';
import { isValidTtiDeviceId, normalizeTtiDeviceId } from '$lib/devices/tti-device-id';
import type { CreateDeviceRequest } from '$lib/api/api.dtos';
import { m } from '$lib/paraglide/messages.js';
import { fail, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

type DeviceTypeOption = {
	label: string;
	value: string;
};

type CreateDeviceFormValues = {
	dev_eui: string;
	name: string;
	type: string;
	group: string;
	location_id: string;
	lat: string;
	long: string;
	installed_at: string;
	tti_name: string;
	license_id: string;
};

type AvailableLicense = {
	id: number;
	seatIndex: number;
};

const readString = (value: FormDataEntryValue | null): string =>
	typeof value === 'string' ? value.trim() : '';

const readOptionalNumber = (value: string): number | undefined => {
	if (!value) return undefined;

	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : undefined;
};

const readOptionalInteger = (value: string): number | undefined => {
	if (!value) return undefined;

	const parsed = Number.parseInt(value, 10);
	return Number.isFinite(parsed) ? parsed : undefined;
};

const readOptionalText = (value: string): string | undefined => (value ? value : undefined);

const normalizeDevEui = (value: string): string =>
	value
		.replace(/[^0-9a-fA-F]/g, '')
		.toUpperCase()
		.slice(0, 16);

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null;

function mapDeviceTypeOptions(payload: unknown): DeviceTypeOption[] {
	if (!Array.isArray(payload)) return [];

	return payload.flatMap((entry) => {
		if (!isRecord(entry)) return [];

		const name = entry.name;
		const id = entry.id;

		if (typeof name !== 'string' || (!Number.isFinite(id) && typeof id !== 'string')) {
			return [];
		}

		return [
			{
				label: name,
				value: String(id)
			}
		];
	});
}

function readApiMessage(error: unknown, fallback: string): string {
	if (error instanceof ApiServiceError) {
		const payload = error.payload as { payload?: { message?: unknown } } | null;
		const message = payload?.payload?.message;

		if (typeof message === 'string' && message.trim()) {
			return message.trim();
		}

		if (Array.isArray(message)) {
			const text = message
				.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
				.join(', ');
			if (text) return text;
		}
	}

	if (error instanceof Error && error.message.trim()) {
		return error.message.trim();
	}

	return fallback;
}

function readFormValues(formData: FormData, locationId: string): CreateDeviceFormValues {
	return {
		dev_eui: readString(formData.get('dev_eui')),
		name: readString(formData.get('name')),
		type: readString(formData.get('type')),
		group: readString(formData.get('group')),
		location_id: readString(formData.get('location_id')) || locationId,
		lat: readString(formData.get('lat')),
		long: readString(formData.get('long')),
		installed_at: readString(formData.get('installed_at')),
		tti_name: normalizeTtiDeviceId(readString(formData.get('tti_name'))),
		license_id: readString(formData.get('license_id'))
	};
}

// Every new device must consume an unassigned license seat (the TTI device
// quota paywall). Staff-owned flows that bypass this page are unaffected.
const toAvailableLicenses = (licenses: { id: number; seatIndex: number; status: string }[]) =>
	licenses
		.filter((license) => license.status !== 'assigned')
		.map(({ id, seatIndex }): AvailableLicense => ({ id, seatIndex }));

export const load: PageServerLoad = async ({ params, fetch, locals }) => {
	const locationId = String(params.location_id ?? '').trim();

	const authToken = locals.jwtString ?? null;
	if (!authToken) {
		return fail(401, { error: m.auth_not_authenticated() });
	}

	const apiService = new ApiService({
		fetchFn: fetch,
		authToken
	});

	// Licenses fail closed: if the billing API is unreachable the page shows
	// the "no available licenses" gate rather than allowing an unpaid create.
	const [deviceTypeOptions, locationName, availableLicenses] = await Promise.all([
		apiService
			.getDeviceTypes()
			.then(mapDeviceTypeOptions)
			.catch(() => []),
		apiService
			.getLocation(locationId)
			.then((location) => location.name ?? '')
			.catch(() => ''),
		apiService
			.getLicenses()
			.then(toAvailableLicenses)
			.catch(() => [])
	]);

	return {
		locationId,
		locationName,
		deviceTypeOptions,
		availableLicenses
	};
};

export const actions: Actions = {
	default: async ({ request, locals, params, fetch }) => {
		const authToken = locals.jwtString ?? null;
		if (!authToken) {
			return fail(401, { error: m.auth_not_authenticated() });
		}

		const values = readFormValues(
			await request.formData(),
			String(params.location_id ?? '').trim()
		);
		if (!values.dev_eui) {
			return fail(400, { error: m.devices_dev_eui_required(), ...values });
		}

		const normalizedDevEui = normalizeDevEui(values.dev_eui);
		if (normalizedDevEui.length !== 16) {
			return fail(400, {
				error: m.devices_dev_eui_invalid(),
				...values
			});
		}

		if (!values.name) {
			return fail(400, { error: m.devices_device_name_required(), ...values });
		}

		const typeId = readOptionalInteger(values.type);
		if (!typeId) {
			return fail(400, { error: m.devices_device_type_required(), ...values });
		}

		const locationId = readOptionalInteger(values.location_id);
		if (!locationId) {
			return fail(400, { error: m.devices_location_id_required(), ...values });
		}

		if (values.tti_name && !isValidTtiDeviceId(values.tti_name)) {
			return fail(400, {
				error: m.devices_tti_device_id_invalid(),
				...values
			});
		}

		const licenseId = readOptionalInteger(values.license_id);
		if (!licenseId) {
			return fail(400, { error: m.devices_license_required(), ...values });
		}

		const payload: CreateDeviceRequest = {
			dev_eui: normalizedDevEui,
			type: typeId,
			name: values.name,
			group: readOptionalText(values.group),
			location_id: locationId,
			lat: readOptionalNumber(values.lat),
			long: readOptionalNumber(values.long),
			installed_at: readOptionalText(values.installed_at),
			tti_name: readOptionalText(values.tti_name),
			license_id: licenseId
		};

		const api = new ApiService({
			fetchFn: fetch,
			authToken
		});

		// Re-check the license server-side before touching the TTI quota — the
		// submitted id must still be an unassigned seat owned by this user.
		try {
			const licenses = await api.getLicenses();
			const license = licenses.find((entry) => entry.id === licenseId);
			if (!license || license.status === 'assigned') {
				return fail(400, { error: m.devices_license_unavailable(), ...values });
			}
		} catch {
			return fail(400, { error: m.devices_license_unavailable(), ...values });
		}

		try {
			// Create consumes the selected seat atomically (license_id in the payload —
			// the API validates it and assigns it to the new device).
			await api.createDevice(normalizedDevEui, payload);
		} catch (error) {
			const message = readApiMessage(error, m.devices_create_failed());
			const status = error instanceof ApiServiceError ? error.status : 500;

			return fail(status, {
				error: message,
				...values
			});
		}

		try {
			// The same docs expose follow-up local metadata updates on PATCH /v1/devices/{dev_eui}.
			await api.updateDevice(normalizedDevEui, {
				name: values.name,
				group: readOptionalText(values.group),
				location_id: locationId,
				tti_name: readOptionalText(values.tti_name)
			});

			return {
				success: true,
				dev_eui: normalizedDevEui
			};
		} catch (error) {
			const message = readApiMessage(error, m.devices_create_failed());
			const status = error instanceof ApiServiceError ? error.status : 500;

			return fail(status, {
				error: message,
				...values
			});
		}
	}
};
