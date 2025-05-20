import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { DeviceDataService } from '$lib/services/DeviceDataService';

export const GET: RequestHandler = async ({ params, url, locals: { safeGetSession, supabase } }) => {
  const { devEui } = params;
  const { session, user } = await safeGetSession();
  if (!session) {
    console.error('Session is null on device data API for device:', devEui);

  }

  try {
    // Get query parameters for date range
    const startDateParam = url.searchParams.get('start');
    const endDateParam = url.searchParams.get('end');

    if (!startDateParam || !endDateParam) {
      throw error(400, 'Start and end dates are required');
    }

    const startDate = new Date(startDateParam);
    const endDate = new Date(endDateParam);

    // Validate dates
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw error(400, 'Invalid date format');
    }

    // Add one day to end date to include the full day in the results
    endDate.setDate(endDate.getDate() + 1);

    // Get services from the container
    const deviceDataService = new DeviceDataService(supabase);

    // First, try to determine if this is an air data or soil data device based on latest data
    let latestData = null;

    // Try to get data dynamically based on device type

    try {
      latestData = await deviceDataService.getLatestDeviceData(devEui);
      if (!latestData || latestData.length === 0) {
        throw new Error('No data found for the specified date range');
      }
    } catch (dataError) {
      console.error(`Error fetching dynamic data for device ${devEui}:`, dataError);
      // Will fall back to specific services below
    }


    let historicalData = [];
    try {
      historicalData = await deviceDataService.getDeviceDataByDateRange(devEui, startDate, endDate);
      if (!historicalData || historicalData.length === 0) {
        throw new Error('No historical data found for the specified date range');
      }

    } catch (err) {
      console.error(`Error fetching historical data for device ${devEui}:`, err);
      historicalData = [];
    }

    // Return the JSON response directly
    return json(historicalData);
  } catch (err) {
    console.error(`Error in device data API for ${devEui}:`, err);

    if (err instanceof Error) {
      throw error(500, err.message);
    } else {
      throw error(500, 'Unknown error occurred');
    }
  }
};