import { ApiService, ApiServiceError } from '$lib/api/api.service';
import { readApiErrorMessage } from '$lib/api/api-error';
import { normalizeTtiDeviceId } from '$lib/devices/tti-device-id';
import { m } from '$lib/paraglide/messages.js';
import { fail, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import {
	buildLocationOwnerIdentityMap,
	buildSensorCertificateRows,
	normalizeDeviceOwners,
	readDeviceFormValues,
	readDeviceOwnerPermissionValues,
	str,
	validateDeviceFormValues,
	validateDeviceOwnerPermissionValues,
	type NormalizedDeviceOwner,
	type SensorCertificateRow
} from './device-settings.server';

export const load: PageServerLoad = async ({ fetch, params, parent }) => {
	const parentData = await parent();
	const authToken = parentData.authToken ?? null;
	const devEui = String(params.dev_eui ?? '').trim();
	const locationId = Number.parseInt(params.location_id ?? '', 10);

	if (!authToken || !devEui) {
		return {
			devEui,
			deviceName: '',
			deviceGroup: '',
			ttiName: '',
			deviceGroups: [] as string[],
			sensorCertificates: [] as SensorCertificateRow[],
			deviceOwners: [] as NormalizedDeviceOwner[]
		};
	}

	const api = new ApiService({ fetchFn: fetch, authToken });
	const device = parentData.device;

	const [deviceGroups, location, locations] = await Promise.all([
		api.getDeviceGroups().catch(() => []),
		Number.isFinite(locationId)
			? api.getLocation(locationId).catch(() => null)
			: Promise.resolve(null),
		api.getLocations().catch(() => [])
	]);

	const locationOwnerIdentities = buildLocationOwnerIdentityMap(location);

	return {
		devEui,
		deviceName: device?.name || devEui.toUpperCase(),
		location_id: device?.location_id,
		deviceGroup: device?.group || '',
		ttiName: normalizeTtiDeviceId(str(device?.tti_name)),
		deviceGroups,
		locations,
		sensorCertificates: buildSensorCertificateRows(device),
		deviceOwners: normalizeDeviceOwners(device, locationOwnerIdentities)
	};
};

export const actions: Actions = {
	updateDevice: async ({ request, locals, fetch, params }) => {
		const authToken = locals.jwtString ?? null;
		const devEui = String(params.dev_eui ?? '').trim();

		if (!authToken) {
			return fail(401, {
				action: 'updateDevice',
				message: m.devices_update_requires_login()
			});
		}

		if (!devEui) {
			return fail(400, {
				action: 'updateDevice',
				message: m.devices_invalid_device_id()
			});
		}

		const values = readDeviceFormValues(await request.formData());
		const fieldErrors = validateDeviceFormValues(values);

		if (Object.keys(fieldErrors).length > 0) {
			return fail(400, {
				action: 'updateDevice',
				message: m.validation_correct_highlighted_fields(),
				values,
				fieldErrors
			});
		}

		const api = new ApiService({
			fetchFn: fetch,
			authToken
		});

		try {
			await api.updateDevice(devEui, {
				name: values.name,
				group: values.group || null,
				location_id: values.location_id,
				tti_name: values.tti_name || null
			});
		} catch (error) {
			return fail(error instanceof ApiServiceError ? error.status : 502, {
				action: 'updateDevice',
				message: readApiErrorMessage(
					error instanceof ApiServiceError ? error.payload : error,
					m.devices_settings_update_rejected()
				),
				values,
				fieldErrors
			});
		}

		return {
			action: 'updateDevice',
			success: true,
			message: m.devices_settings_updated()
		};
	},
	updateDeviceOwnerPermission: async ({ request, locals, fetch, params }) => {
		const authToken = locals.jwtString ?? null;
		const devEui = String(params.dev_eui ?? '').trim();

		if (!authToken) {
			return fail(401, {
				action: 'updateDeviceOwnerPermission',
				message: m.devices_update_owner_permission_requires_login()
			});
		}

		if (!devEui) {
			return fail(400, {
				action: 'updateDeviceOwnerPermission',
				message: m.devices_invalid_device_id()
			});
		}

		const values = readDeviceOwnerPermissionValues(await request.formData());
		const { fieldErrors, permissionLevel } = validateDeviceOwnerPermissionValues(values);
		const ownerKey = values.ownerKey || values.targetUserEmail;

		if (Object.keys(fieldErrors).length > 0) {
			return fail(400, {
				action: 'updateDeviceOwnerPermission',
				ownerKey,
				message: m.validation_correct_highlighted_fields(),
				values,
				fieldErrors
			});
		}

		const api = new ApiService({
			fetchFn: fetch,
			authToken
		});

		try {
			await api.updateDevicePermissionLevel(devEui, {
				targetUserEmail: values.targetUserEmail,
				permissionLevel
			});
		} catch (error) {
			return fail(error instanceof ApiServiceError ? error.status : 502, {
				action: 'updateDeviceOwnerPermission',
				ownerKey,
				message: readApiErrorMessage(
					error instanceof ApiServiceError ? error.payload : error,
					m.devices_permission_update_rejected()
				),
				values,
				fieldErrors
			});
		}

		return {
			action: 'updateDeviceOwnerPermission',
			ownerKey,
			success: true,
			message: m.devices_permission_updated_for_email({ email: values.targetUserEmail })
		};
	}
};
