import 'reflect-metadata';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { DeviceType } from '$lib/models/Device';
import { container } from '$lib/server/ioc.config';
import { ErrorHandlingService } from '$lib/errors/ErrorHandlingService';
import { DeviceRepository } from '$lib/repositories/DeviceRepository';
import { DeviceDataRepository } from '$lib/repositories/DeviceDataRepository';
import { AirDataRepository } from '$lib/repositories/AirDataRepository';
import { DeviceService } from '$lib/services/DeviceService';
import { AirDataService } from '$lib/services/AirDataService';
import { DeviceDataService } from '$lib/services/DeviceDataService';

export const GET: RequestHandler = async ({ params, locals }) => {
  try {
    const locationId = parseInt(params.locationId);

    if (isNaN(locationId)) {
      return json({ error: 'Invalid location ID' }, { status: 400 });
    }

    // Get error handler from container
    const errorHandler = container.get<ErrorHandlingService>(ErrorHandlingService);
    
    // Create repositories with per-request Supabase client
    const deviceRepo = new DeviceRepository(locals.supabase, errorHandler);
    const airDataRepo = new AirDataRepository(locals.supabase, errorHandler);
    const deviceDataRepo = new DeviceDataRepository(locals.supabase, errorHandler);
    
    // Create services with repositories
    const deviceService = new DeviceService(deviceRepo);
    const airDataService = new AirDataService(airDataRepo);
    const deviceDataService = new DeviceDataService(deviceRepo, deviceDataRepo);

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
          if (deviceType && deviceType.data_table_v2) {
            try {
              latestData = await deviceDataService.getLatestDeviceData(device.dev_eui);
            } catch (dataError) {
              console.error(`Error fetching dynamic data for device ${device.dev_eui}:`, dataError);
              // Fall back to specific services if dynamic approach fails
              latestData = null;
            }
          }

          // Fallback to specific services if dynamic approach fails or returns no data
          // This maintains backward compatibility
          if (!latestData) {
            // Get latest air data for this device, if available
            const latestAirData = await airDataService.getLatestAirDataByDevice(device.dev_eui);
            
            // Set latestData to whichever data is available
            latestData = latestAirData || null;
          }
          
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