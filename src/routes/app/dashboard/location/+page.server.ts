import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export interface LocationWithDevices {
	location_id: number;
	name: string;
	description?: string | null;
	lat?: number | null;
	long?: number | null;
	owner_id?: string | null;
	created_at: string;
	map_zoom?: number | null;
	cw_devices?: DeviceBasic[];
}

export interface DeviceBasic {
	dev_eui: string;
	name: string;
	device_type?: string | null;
	lat?: number | null;
	long?: number | null;
	created_at: string;
}

export const load = (async (event) => {
	const { supabase, safeGetSession } = event.locals;
	const { session, user } = await safeGetSession();

	if (!session || !user) {
		throw redirect(303, '/auth/signin');
	}

	try {
		// Fetch all locations for the user
		const { data: locations, error } = await supabase
			.from('cw_locations')
			.select(
				`
        *,
        cw_devices(*)
      `
			)
			.eq('owner_id', user.id)
			.order('name');

		if (error) {
			console.error('Error fetching locations:', error);
			return {
				locations: []
			};
		}

		const normalizedLocations: LocationWithDevices[] = (locations ?? []).map((loc: any) => ({
			location_id: loc.location_id,
			name: loc.name,
			description: loc.description,
			lat: loc.lat,
			long: loc.long,
			owner_id: loc.owner_id,
			created_at: loc.created_at,
			map_zoom: loc.map_zoom,
			cw_devices: Array.isArray(loc.cw_devices)
				? loc.cw_devices.map((device: any) => ({
						dev_eui: device.dev_eui,
						name: device.name,
						device_type: device.device_type ?? null,
						lat: device.lat,
						long: device.long,
						created_at: device.created_at ?? ''
					}))
				: []
		}));

		return {
			locations: normalizedLocations
		};
	} catch (err) {
		console.error('Error in load function:', err);
		return {
			locations: [] as LocationWithDevices[]
		};
	}
}) satisfies PageServerLoad;
