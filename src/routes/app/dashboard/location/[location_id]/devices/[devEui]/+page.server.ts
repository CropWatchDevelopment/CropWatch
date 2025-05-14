import { error, redirect } from '@sveltejs/kit';
import { container } from '$lib/server/ioc.config';
import { TYPES } from '$lib/server/ioc.types';
import type { PageServerLoad } from './$types';
import { SessionService } from '$lib/services/SessionService';
import { ErrorHandlingService } from '$lib/errors/ErrorHandlingService';
import { DeviceRepository } from '$lib/repositories/DeviceRepository';
import { AirDataRepository } from '$lib/repositories/AirDataRepository';
import { SoilDataRepository } from '$lib/repositories/SoilDataRepository';
import { DeviceService } from '$lib/services/DeviceService';
import { AirDataService } from '$lib/services/AirDataService';
import { SoilDataService } from '$lib/services/SoilDataService';
import { DeviceDataService } from '$lib/services/DeviceDataService';

export const load: PageServerLoad = async ({ params, locals }) => {
    const { devEui } = params;
    const sessionService = new SessionService(locals.supabase);
    const sessionResult = await sessionService.getSafeSession();
      
    // If no session exists, redirect to login
    if (!sessionResult || !sessionResult.user) {
        throw redirect(302, '/auth/login');
    }

    try {
        // Get the error handler from the container
        const errorHandler = container.get<ErrorHandlingService>(TYPES.ErrorHandlingService);
        
        // Create repositories with per-request Supabase client
        const deviceRepo = new DeviceRepository(locals.supabase, errorHandler);
        const airDataRepo = new AirDataRepository(locals.supabase, errorHandler);
        const soilDataRepo = new SoilDataRepository(locals.supabase, errorHandler);
        
        // Create services with repositories
        const deviceService = new DeviceService(deviceRepo);
        const airDataService = new AirDataService(airDataRepo);
        const soilDataService = new SoilDataService(soilDataRepo);
        const deviceDataService = new DeviceDataService(locals.supabase);

        // Get the device with its type info
        const device = await deviceService.getDeviceWithTypeByEui(devEui);

        if (!device) {
            throw error(404, 'Device not found');
        }

        // Get latest sensor data
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

        // Fall back to specific services if dynamic approach fails or returns no data
        if (!latestData) {
            const latestAirData = await airDataService.getLatestAirDataByDevice(devEui);
            const latestSoilData = await soilDataService.getLatestSoilDataByDevice(devEui);
            latestData = latestAirData || latestSoilData || null;
        }

        // Determine data type (air or soil) for fetching historical data
        const isAirData = latestData && 'temperature_c' in latestData && ('humidity' in latestData || 'co2' in latestData);
        const isSoilData = latestData && 'moisture' in latestData;

        // Set default date range for historical data (last 7 days)
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);

        // Load historical data for the last 7 days
        let historicalData = [];
        if (isAirData) {
            historicalData = await airDataService.getAirDataByDateRange(devEui, startDate, endDate);
        } else if (isSoilData) {
            historicalData = await soilDataService.getSoilDataByDateRange(devEui, startDate, endDate);
        }

        return {
            device,
            latestData,
            historicalData,
            dataType: isAirData ? 'air' : (isSoilData ? 'soil' : 'unknown')
        };
    } catch (err) {
        console.error(`Error loading device details for ${devEui}:`, err);
        throw error(500, 'Failed to load device details');
    }
};