import type { LayoutServerLoad } from './$types';
import { ErrorHandlingService } from '$lib/errors/ErrorHandlingService';
import { DeviceService } from '$lib/services/DeviceService';
import { DeviceRepository } from '$lib/repositories/DeviceRepository';

/**
 * Load device details for a specific location and device EUI.
 * User session and `locationId` are already validated in the layout server load.
 */
export const load = (async ({ params, locals: { supabase } }) => {
	const { devEui } = params;

	if (!devEui) {
		throw new Error('Missing required parameters: location_id or devEui');
	}

	// Get error handler from container
	const errorHandler = new ErrorHandlingService();
	const deviceRepository = new DeviceRepository(supabase, errorHandler);
	const deviceService = new DeviceService(deviceRepository);

	const device = await deviceService.getDeviceWithTypeByEui(devEui);

	return {
		devEui,
		device,
		dataType: device?.cw_device_type?.data_table_v2 as string
	};
}) satisfies LayoutServerLoad;
