import { error, json } from '@sveltejs/kit';
import { container } from '$lib/server/ioc.config';
import { TYPES } from '$lib/server/ioc.types';
import type { IAirDataService } from '$lib/interfaces/IAirDataService';
import type { ISoilDataService } from '$lib/interfaces/ISoilDataService';
import type { IDeviceService } from '$lib/interfaces/IDeviceService';
import type { IDeviceDataService } from '$lib/interfaces/IDeviceDataService';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, url, locals: { safeGetSession} }) => {
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
    const deviceService = container.get<IDeviceService>(TYPES.DeviceService);
    const airDataService = container.get<IAirDataService>(TYPES.AirDataService);
    const soilDataService = container.get<ISoilDataService>(TYPES.SoilDataService);
    const deviceDataService = container.get<IDeviceDataService>(TYPES.DeviceDataService);

    // Get the device with its type info
    const device = await deviceService.getDeviceWithTypeByEui(devEui);
    
    if (!device) {
      throw error(404, 'Device not found');
    }

    // First, try to determine if this is an air data or soil data device based on latest data
    let latestData = null;
    
    // Try to get data dynamically based on device type
    if (device.cw_device_type && device.cw_device_type.data_table_v2) {
      try {
        latestData = await deviceDataService.getLatestDeviceData(devEui, device.cw_device_type);
      } catch (dataError) {
        console.error(`Error fetching dynamic data for device ${devEui}:`, dataError);
        // Will fall back to specific services below
      }
    }

    // Fall back to specific services if dynamic approach fails
    if (!latestData) {
      const latestAirData = await airDataService.getLatestAirDataByDevice(devEui);
      const latestSoilData = await soilDataService.getLatestSoilDataByDevice(devEui);
      latestData = latestAirData || latestSoilData || null;
    }

    // Determine data type (air or soil)
    const isAirData = latestData && 'temperature_c' in latestData && ('humidity' in latestData || 'co2' in latestData);
    const isSoilData = latestData && 'moisture' in latestData;
    
    // Fetch historical data based on type
    let historicalData = [];
    
    if (isAirData) {
      historicalData = await airDataService.getAirDataByDateRange(devEui, startDate, endDate);
    } else if (isSoilData) {
      historicalData = await soilDataService.getSoilDataByDateRange(devEui, startDate, endDate);
    } else {
      // If we can't determine, try both
      try {
        historicalData = await airDataService.getAirDataByDateRange(devEui, startDate, endDate);
        
        if (!historicalData || historicalData.length === 0) {
          historicalData = await soilDataService.getSoilDataByDateRange(devEui, startDate, endDate);
        }
      } catch (err) {
        console.error(`Error fetching historical data for device ${devEui}:`, err);
        historicalData = [];
      }
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