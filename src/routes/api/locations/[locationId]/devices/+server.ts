import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { DeviceType } from '$lib/models/Device';
import { ErrorHandlingService } from '$lib/errors/ErrorHandlingService';
import { DeviceRepository } from '$lib/repositories/DeviceRepository';
import { DeviceService } from '$lib/services/DeviceService';
import { DeviceDataService } from '$lib/services/DeviceDataService';

export const GET: RequestHandler = async ({ params, locals }) => {
	try {
		const locationId = parseInt(params.locationId);

		if (isNaN(locationId)) {
			return json({ error: 'Invalid location ID' }, { status: 400 });
		}

		// Get error handler
		const errorHandler = new ErrorHandlingService();

		// Create repositories with per-request Supabase client
		const deviceRepo = new DeviceRepository(locals.supabase, errorHandler);
		// Create services with repositories
		const deviceService = new DeviceService(deviceRepo);
		const deviceDataService = new DeviceDataService(locals.supabase, errorHandler);

		// Get devices for this location - now includes device type info directly
		const devices = await deviceService.getDevicesByLocation(locationId);

		// Process devices in parallel with Promise.all for better performance
		const devicesWithData = await Promise.all(
			devices.map(async (device) => {
				try {
					// Cast device to access the nested device type data from the joined query
					const deviceWithJoins = device as any;
					// Extract device type from the joined data
					const deviceType = deviceWithJoins.cw_device_type as DeviceType;

					let latestData = null;

					// Dynamically get latest data based on device type's data_table_v2 value
					latestData = await deviceDataService.getLatestDeviceData(device.dev_eui);

					return {
						...device,
						deviceType: deviceType,
						latestData
					};
				} catch (error) {
					console.error(`Error processing device ${device.dev_eui}:`, error);
					return {
						...device,
						error: error instanceof Error ? error.message : 'Failed to fetch device data',
						latestData: null
					};
				}
			})
		);

		return json(devicesWithData);
	} catch (error) {
		console.error(`Error fetching devices for location ${params.locationId}:`, error);
		return json({ error: 'Failed to fetch devices' }, { status: 500 });
	}
};
