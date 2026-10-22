import type { DeleteDeviceResultDto } from '$lib/api/api.dtos';
import { apiErrorMessage, apiErrorStatus } from '$lib/api/api-error';
import { normalizeTtiDeviceId } from '$lib/devices/tti-device-id';
import { m } from '$lib/paraglide/messages.js';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	buildLocationOwnerIdentityMap,
	buildSensorCertificateRows,
	deviceSupportsSensorCertificate,
	normalizeDeviceOwners,
	readDeviceFormValues,
	readDeviceOwnerPermissionValues,
	str,
	validateDeviceFormValues,
	validateDeviceOwnerPermissionValues,
	type NormalizedDeviceOwner,
	type SensorCertificateRow
} from './device-settings.server';
import { checkDeleteConfirmation } from './delete-confirmation';

type DeviceLicenseSummary = { id: number; seatIndex: number; manual: boolean };

export const load: PageServerLoad = async ({ locals, params, parent }) => {
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
			sensorCertificates: [] as SensorCertificateRow[],
			supportsSensorCertificates: false,
			deviceOwners: [] as NormalizedDeviceOwner[],
			license: null as DeviceLicenseSummary | null,
			deviceOwnerId: null as string | null,
			deviceOrgId: null as string | null
		};
	}

	const { services } = locals;
	const device = parentData.device;

	const [location, locations, licenses] = await Promise.all([
		Number.isFinite(locationId)
			? services.locations.getLocation(locationId).catch(() => null)
			: Promise.resolve(null),
		services.locations.getLocations().catch(() => []),
		services.billing.getLicenses().catch(() => [])
	]);

	const licenseRow = licenses.find((l) => l.devEui?.toLowerCase() === devEui.toLowerCase());
	const license: DeviceLicenseSummary | null = licenseRow
		? { id: licenseRow.id, seatIndex: licenseRow.seatIndex, manual: licenseRow.manual }
		: null;

	const locationOwnerIdentities = buildLocationOwnerIdentityMap(location);

	return {
		devEui,
		deviceName: device?.name || devEui.toUpperCase(),
		location_id: device?.location_id,
		deviceGroup: device?.group || '',
		ttiName: normalizeTtiDeviceId(str(device?.tti_name)),
		locations,
		sensorCertificates: buildSensorCertificateRows(device, services.libellus.configurationProblem),
		supportsSensorCertificates: deviceSupportsSensorCertificate(device),
		deviceOwners: normalizeDeviceOwners(device, locationOwnerIdentities),
		license,
		// For the delete card's visibility (mirrors the API's device.delete rule).
		deviceOwnerId: typeof device?.user_id === 'string' ? device.user_id : null,
		deviceOrgId: typeof device?.org_id === 'string' ? device.org_id : null
	};
};

export const actions: Actions = {
	updateDevice: async ({ request, locals, params }) => {
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

		try {
			await locals.services.devices.updateDevice(devEui, {
				name: values.name,
				group: values.group || null,
				location_id: values.location_id,
				tti_name: values.tti_name || null
			});
		} catch (error) {
			return fail(apiErrorStatus(error, 502), {
				action: 'updateDevice',
				message: apiErrorMessage(error, m.devices_settings_update_rejected()),
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
	updateDeviceOwnerPermission: async ({ request, locals, params }) => {
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

		try {
			await locals.services.devices.updateDevicePermissionLevel(devEui, {
				targetUserEmail: values.targetUserEmail,
				permissionLevel
			});
		} catch (error) {
			return fail(apiErrorStatus(error, 502), {
				action: 'updateDeviceOwnerPermission',
				ownerKey,
				message: apiErrorMessage(error, m.devices_permission_update_rejected()),
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
	},
	unassignLicense: async ({ request, locals }) => {
		const authToken = locals.jwtString ?? null;

		if (!authToken) {
			return fail(401, {
				action: 'unassignLicense',
				message: m.devices_update_requires_login()
			});
		}

		const formData = await request.formData();
		// Digits only: parseInt would read '12abc' (or '12.5') as license 12.
		const licenseIdText = str(formData.get('licenseId'));
		const licenseId = /^\d+$/.test(licenseIdText) ? Number(licenseIdText) : Number.NaN;
		if (!Number.isSafeInteger(licenseId) || licenseId < 1) {
			return fail(400, { action: 'unassignLicense', message: m.generic_error() });
		}

		try {
			await locals.services.billing.unassignLicense(licenseId);
		} catch (error) {
			return fail(apiErrorStatus(error, 502), {
				action: 'unassignLicense',
				message: apiErrorMessage(error, m.generic_error())
			});
		}

		return {
			action: 'unassignLicense',
			success: true,
			message: m.devices_license_unassigned_toast()
		};
	},
	deleteDevice: async ({ request, locals, params }) => {
		const authToken = locals.jwtString ?? null;
		const devEui = String(params.dev_eui ?? '').trim();
		const locationId = String(params.location_id ?? '').trim();

		if (!authToken) {
			return fail(401, {
				action: 'deleteDevice',
				message: m.devices_update_requires_login()
			});
		}

		if (!devEui) {
			return fail(400, {
				action: 'deleteDevice',
				message: m.devices_invalid_device_id()
			});
		}

		// Server-side half of the danger-zone confirmation: the typed DevEUI and
		// the "I understand" box, so a crafted request cannot skip either.
		const confirmationIssue = checkDeleteConfirmation(devEui, await request.formData());
		if (confirmationIssue) {
			return fail(400, {
				action: 'deleteDevice',
				message:
					confirmationIssue === 'devEuiMismatch'
						? m.devices_delete_confirm_mismatch()
						: m.devices_delete_acknowledge_required()
			});
		}

		let result: DeleteDeviceResultDto;
		try {
			result = await locals.services.devices.deleteDevice(devEui);
		} catch (error) {
			return fail(apiErrorStatus(error, 502), {
				action: 'deleteDevice',
				message: apiErrorMessage(error, m.devices_delete_rejected())
			});
		}

		// The API purges data in time-boxed chunks; the card re-submits until
		// `complete`, so this failure is the "keep going" signal, not an error.
		if (!result?.complete) {
			return fail(409, {
				action: 'deleteDevice',
				inProgress: true,
				purgedRows: result?.purgedRows ?? 0,
				message: m.devices_delete_in_progress()
			});
		}

		// Back to the device's location, or to the list when the URL names none.
		redirect(303, locationId ? `/locations/${encodeURIComponent(locationId)}` : '/locations');
	}
};
