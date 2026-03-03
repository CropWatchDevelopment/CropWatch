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
	const { dev_eui, location_id } = params;

	if (!authToken || !dev_eui) {
		return {
			devEui: dev_eui ?? '',
			locationId: location_id ?? '',
			device: null,
			dataTable: null as string | null
		};
	}

	const api = new ApiService({ fetchFn: fetch, authToken });

	try {
		const device = await api.getDevice(dev_eui);

		// The API response includes a `data_table` field (string) that identifies
		// which Supabase table this device stores telemetry in. Fall back to null
		// so the dispatcher uses DefaultDisplay.
		const deviceDataTable = device.cw_device_type.data_table_v2;

		return {
			devEui: dev_eui,
			locationId: location_id,
			device,
            dataTable: deviceDataTable
		};
	} catch (err) {
		console.error(`[layout] Failed to load device ${dev_eui}:`, err);
		return {
			devEui: dev_eui,
			locationId: location_id,
			device: null,
			dataTable: null as string | null
		};
	}
};
