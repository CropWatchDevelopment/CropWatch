import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { SessionService } from '$lib/services/SessionService';

interface LocationWithDevices {
	location_id: number;
	name: string;
	description: string | null;
	lat: number | null;
	long: number | null;
	created_at: string;
	map_zoom: number | null;
	owner_id: string | null;
	cw_devices: any[];
}

export const load: PageServerLoad = async ({ locals }) => {
	const sessionService = new SessionService(locals.supabase);
	const sessionResult = await sessionService.getSafeSession();

	if (!sessionResult || !sessionResult.user) {
		throw redirect(302, '/auth/login');
	}

	const { user } = sessionResult;

	// Collect device identifiers the user has access to (owned + shared)
	const { data: ownedDeviceRows, error: ownedDeviceError } = await locals.supabase
		.from('cw_devices')
		.select('dev_eui, location_id')
		.eq('user_id', user.id);

	if (ownedDeviceError) {
		console.error('Failed to load owned devices for dashboard:', ownedDeviceError);
	}

	const { data: sharedDeviceRows, error: sharedDeviceError } = await locals.supabase
		.from('cw_device_owners')
		.select('cw_devices(dev_eui, location_id)')
		.eq('user_id', user.id)
		.lte('permission_level', 3);

	if (sharedDeviceError) {
		console.error('Failed to load shared devices for dashboard:', sharedDeviceError);
	}

	const deviceEuis = new Set<string>();
	const deviceLocationLookup = new Map<string, number | null>();

	(ownedDeviceRows || []).forEach((device) => {
		deviceEuis.add(device.dev_eui);
		deviceLocationLookup.set(device.dev_eui, device.location_id ?? null);
	});

	(sharedDeviceRows || []).forEach((row: any) => {
		const sharedDevice = row.cw_devices;
		if (sharedDevice?.dev_eui) {
			deviceEuis.add(sharedDevice.dev_eui);
			deviceLocationLookup.set(sharedDevice.dev_eui, sharedDevice.location_id ?? null);
		}
	});

	const { data: ownedLocations, error: ownedLocationsError } = await locals.supabase
		.from('cw_locations')
		.select('*')
		.eq('owner_id', user.id)
		.order('name');

	if (ownedLocationsError) {
		console.error('Failed to load owned locations for dashboard:', ownedLocationsError);
	}

	const { data: sharedLocationsRows, error: sharedLocationsError } = await locals.supabase
		.from('cw_location_owners')
		.select('cw_locations(*)')
		.eq('user_id', user.id)
		.eq('is_active', true);

	if (sharedLocationsError) {
		console.error('Failed to load shared locations for dashboard:', sharedLocationsError);
	}

	const locationsMap = new Map<number, LocationWithDevices>();

	(ownedLocations || []).forEach((location) => {
		locationsMap.set(location.location_id, {
			...location,
			cw_devices: []
		});
	});

	(sharedLocationsRows || []).forEach((row: any) => {
		const location = row.cw_locations;
		if (location && !locationsMap.has(location.location_id)) {
			locationsMap.set(location.location_id, {
				...location,
				cw_devices: []
			});
		}
	});

	const deviceList = Array.from(deviceEuis);
	let devices: any[] = [];

	if (deviceList.length > 0) {
		const { data: deviceRows, error: deviceDetailsError } = await locals.supabase
			.from('cw_devices')
			.select(
				`
        *,
        cw_device_type(*),
        cw_locations(*)
      `
			)
			.in('dev_eui', deviceList)
			.order('name');

		if (deviceDetailsError) {
			console.error('Failed to load device details for dashboard:', deviceDetailsError);
		}

		devices = deviceRows || [];

		devices.forEach((device) => {
			const locationId = device.location_id ?? deviceLocationLookup.get(device.dev_eui) ?? null;
			if (locationId != null && locationsMap.has(locationId)) {
				const locationEntry = locationsMap.get(locationId)!;
				locationEntry.cw_devices.push(device);
			}
		});
	}

	// Create an "Unassigned" bucket for devices without a location
	const unassignedDevices = devices.filter((device) => {
		const locationId = device.location_id ?? deviceLocationLookup.get(device.dev_eui) ?? null;
		return locationId == null;
	});

	if (unassignedDevices.length > 0) {
		locationsMap.set(-1, {
			location_id: -1,
			name: 'Unassigned Devices',
			description: 'Devices not currently assigned to a location',
			lat: null,
			long: null,
			created_at: new Date(0).toISOString(),
			map_zoom: null,
			owner_id: user.id,
			cw_devices: unassignedDevices
		});
	}

	const locations = Array.from(locationsMap.values()).map((location) => ({
		...location,
		cw_devices: location.cw_devices || []
	}));

	return {
		user: {
			id: user.id,
			email: user.email,
			name: user.user_metadata?.name || user.email?.split('@')[0] || 'User'
		},
		devices,
		locations
	};
};
