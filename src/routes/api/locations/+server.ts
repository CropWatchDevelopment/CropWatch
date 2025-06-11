import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { container } from '$lib/server/ioc.config';
import { TYPES } from '$lib/server/ioc.types';
import { LocationService } from '$lib/services/LocationService';

export const GET: RequestHandler = async ({ locals }) => {
  try {
    // Get LocationService from IoC container
    const locationService = container.get<LocationService>(TYPES.LocationService);
    
    // Get all basic location data without devices
    const locations = await locationService.getAllLocations();
    
    // Add a deviceCount property to each location
    const enhancedLocations = await Promise.all(
      locations.map(async (location) => {
        try {
          // Instead of fetching all device data, just get the count
          const deviceCount = await locationService.getDeviceCountForLocation(location.location_id);
          
          return {
            ...location,
            deviceCount
          };
        } catch (error) {
          console.error(`Error getting device count for location ${location.location_id}:`, error);
          return {
            ...location,
            deviceCount: 0,
            error: 'Failed to get device count'
          };
        }
      })
    );
    
    return json(enhancedLocations);
  } catch (error) {
    console.error('Error fetching locations:', error);
    return json({ error: 'Failed to fetch location data' }, { status: 500 });
  }
};