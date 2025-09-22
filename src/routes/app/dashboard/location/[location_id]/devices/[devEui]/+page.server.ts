import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { DeviceDataService } from '$lib/services/DeviceDataService';
import { DateTime } from 'luxon';

/**
 * Load the latest and historical device data for a specific device EUI.
 * User session, `devEui` and `locationId` are already validated in the layout server load.
 */
export const load: PageServerLoad = async ({ url, params, locals: { supabase } }) => {
	const { devEui } = params;

	try {
		const deviceDataService = new DeviceDataService(supabase);

		const startParam = url.searchParams.get('start');
		const endParam = url.searchParams.get('end');
		const timezoneParam = url.searchParams.get('timezone') || 'UTC';
		let startDate: Date, endDate: Date;
		if (!startParam || !endParam) {
			startDate = DateTime.now().minus({ days: 1 }).startOf('day').toJSDate();
			endDate = DateTime.now().endOf('day').toJSDate();
		} else {
			startDate = DateTime.fromISO(startParam).startOf('day').toJSDate();
			endDate = DateTime.fromISO(endParam).endOf('day').toJSDate();
		}

		// Don’t `await` the promise, stream the data instead
		const latestData = deviceDataService.getLatestDeviceData(devEui);
		const historicalData = deviceDataService.getDeviceDataByDateRange(
			devEui,
			startDate,
			endDate,
			timezoneParam
		);

		return {
			latestData, // streamed
			historicalData // streamed
		};
	} catch (err) {
		console.error(`Error loading device details for ${devEui}:`, err);
		throw error(500, 'Failed to load device details');
	}
};
