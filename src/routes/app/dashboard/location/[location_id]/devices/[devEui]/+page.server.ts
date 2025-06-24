import { error, redirect } from '@sveltejs/kit';
import { container } from '$lib/server/ioc.config';
import { TYPES } from '$lib/server/ioc.types';
import type { PageServerLoad } from './$types';
import { SessionService } from '$lib/services/SessionService';
import { ErrorHandlingService } from '$lib/errors/ErrorHandlingService';
import { DeviceRepository } from '$lib/repositories/DeviceRepository';
import { DeviceService } from '$lib/services/DeviceService';
import { DeviceDataService } from '$lib/services/DeviceDataService';
import { url } from '@layerstack/utils/routing';
import { DateTime } from 'luxon';

export const load: PageServerLoad = async ({
	url,
	params,
	locals: { safeGetSession, supabase }
}) => {
	const { devEui } = params;
	const sessionService = new SessionService(supabase);
	const sessionResult = await sessionService.getSafeSession();

	// If no session exists, redirect to login
	if (!sessionResult || !sessionResult.user) {
		throw redirect(302, '/auth/login');
	}

	try {
		// Get the error handler from the container
		const errorHandler = container.get<ErrorHandlingService>(TYPES.ErrorHandlingService);
		const deviceDataService = await new DeviceDataService(supabase);
		const deviceRepository = new DeviceRepository(supabase, errorHandler);
		const deviceService = new DeviceService(deviceRepository);

		const startParam = url.searchParams.get('start');
		const endParam = url.searchParams.get('end');

		let startDate: Date;
		let endDate: Date;

		// logic stays the same

		if (!startParam || !endParam) {
			startDate = DateTime.now().minus({ days: 7 }).startOf('day').toJSDate();
			endDate = DateTime.now().endOf('day').toJSDate();
		} else {
			startDate = DateTime.fromISO(startParam).startOf('day').toJSDate();
			endDate = DateTime.fromISO(endParam).endOf('day').toJSDate();
		}

		// Get the latest data
		const latestData = await deviceDataService.getLatestDeviceData(devEui);
		if (!latestData) {
			throw error(404, 'Device data not found');
		}

		let historicalData = await deviceDataService.getDeviceDataByDateRange(
			devEui,
			startDate,
			endDate
		);

		// get the device itsself
		const device = await deviceService.getDeviceWithTypeByEui(devEui);
		if (!device) {
			throw error(404, 'Device not found');
		}

		return {
			device,
			latestData,
			historicalData,
			dataType: device.cw_device_type.data_table_v2
		};
	} catch (err) {
		console.error(`Error loading device details for ${devEui}:`, err);
		throw error(500, 'Failed to load device details');
	}
};
