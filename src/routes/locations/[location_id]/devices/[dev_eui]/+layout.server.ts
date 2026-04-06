import { ApiService } from '$lib/api/api.service';
import type { LayoutServerLoad } from './$types';

/**
 * Device-level layout data loader.
 *
 * Resolves the device's metadata (including which data table it belongs to)
 * and exposes it to every child route (+page, settings, etc.) via `parent()`.
 *
 * The `dataTable` string (e.g. 'cw_air_data', 'cw_traffic2') drives which
 * display component the dispatcher page renders.
 */
export const load: LayoutServerLoad = async ({ params, locals }) => {
	const authToken = locals.jwtString ?? null;
	const userId = locals.jwt?.sub ?? null;
	const { dev_eui, location_id } = params;

	if (!authToken || !dev_eui) {
		return {
			devEui: dev_eui ?? '',
			locationId: location_id ?? '',
			device: null,
			dataTable: null as string | null,
			permissionLevel: 4
		};
	}

	const api = new ApiService({ fetchFn: fetch, authToken });

	try {
		const locationId = Number.parseInt(location_id, 10);
		const [device, location] = await Promise.all([
			api.getDevice(dev_eui),
			Number.isFinite(locationId) ? api.getLocation(locationId).catch(() => null) : Promise.resolve(null)
		]);

		const owners = Array.isArray(location?.cw_location_owners) ? location.cw_location_owners : [];
		const currentOwner = userId ? owners.find((o) => o.user_id === userId) : null;
		const permissionLevel = Number(currentOwner?.permission_level) || 4;

		// The API response includes a `data_table` field (string) that identifies
		// which Supabase table this device stores telemetry in. Fall back to null
		// so the dispatcher uses DefaultDisplay.
		const deviceDataTable = device.cw_device_type.data_table_v2;

		return {
			devEui: dev_eui,
			locationId: location_id,
			device,
            dataTable: deviceDataTable,
			permissionLevel
		};
	} catch (err) {
		console.error(`[layout] Failed to load device ${dev_eui}:`, err);
		return {
			devEui: dev_eui,
			locationId: location_id,
			device: null,
			dataTable: null as string | null,
			permissionLevel: 4
		};
	}
};
