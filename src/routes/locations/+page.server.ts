import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { session } = await locals.safeGetSession();

	if (!session) {
		throw redirect(303, '/auth');
	}

	const { supabase } = locals;

	// Fetch locations the user has access to (either as owner or via location_owners)
	// Get locations where user is owner
	const { data: ownedLocations, error: ownedError } = await supabase
		.from('cw_locations')
		.select(`
			location_id,
			name,
			description,
			lat,
			long,
			group,
			created_at,
			owner_id,
			owner:profiles!cw_locations_owner_id_fkey (
				id,
				full_name,
				email
			)
		`)
		.eq('owner_id', session.user.id);

	if (ownedError) {
		console.error('Error fetching owned locations:', ownedError);
	}

	// Get locations where user has been granted access via cw_location_owners
	const { data: sharedLocations, error: sharedError } = await supabase
		.from('cw_location_owners')
		.select(`
			location_id,
			permission_level,
			is_active,
			location:cw_locations (
				location_id,
				name,
				description,
				lat,
				long,
				group,
				created_at,
				owner_id,
				owner:profiles!cw_locations_owner_id_fkey (
					id,
					full_name,
					email
				)
			)
		`)
		.eq('user_id', session.user.id)
		.eq('is_active', true);

	if (sharedError) {
		console.error('Error fetching shared locations:', sharedError);
	}

	// Get device counts for all locations
	const locationIds = [
		...(ownedLocations?.map((l) => l.location_id) || []),
		...(sharedLocations?.map((l) => l.location_id) || [])
	];

	let deviceCounts: Record<number, number> = {};

	if (locationIds.length > 0) {
		const { data: devices, error: devicesError } = await supabase
			.from('cw_devices')
			.select('location_id')
			.in('location_id', locationIds);

		if (!devicesError && devices) {
			deviceCounts = devices.reduce(
				(acc, device) => {
					if (device.location_id) {
						acc[device.location_id] = (acc[device.location_id] || 0) + 1;
					}
					return acc;
				},
				{} as Record<number, number>
			);
		}
	}

	// Combine owned and shared locations, removing duplicates
	type LocationData = {
		location_id: number;
		name: string;
		description: string | null;
		lat: number | null;
		long: number | null;
		group: string;
		created_at: string;
		owner_id: string | null;
		owner_name: string | null;
		owner_email: string | null;
		device_count: number;
		is_owner: boolean;
		permission_level: number | null;
	};
	
	const locationsMap = new Map<number, LocationData>();

	// Add owned locations
	ownedLocations?.forEach((loc) => {
		// Supabase returns single relations as object, but TS may infer array
		const ownerData = loc.owner;
		const owner = Array.isArray(ownerData) ? ownerData[0] : ownerData;
		locationsMap.set(loc.location_id, {
			location_id: loc.location_id,
			name: loc.name,
			description: loc.description,
			lat: loc.lat,
			long: loc.long,
			group: loc.group ?? 'Ungrouped',
			created_at: loc.created_at,
			owner_id: loc.owner_id,
			owner_name: owner?.full_name || null,
			owner_email: owner?.email || null,
			device_count: deviceCounts[loc.location_id] || 0,
			is_owner: true,
			permission_level: null
		});
	});

	// Add shared locations (only if not already in map as owner)
	sharedLocations?.forEach((item) => {
		// Supabase returns single relations as object, but TS may infer array
		const locationData = item.location;
		const loc = Array.isArray(locationData) ? locationData[0] : locationData;

		if (loc && !locationsMap.has(loc.location_id)) {
			const ownerData = loc.owner;
			const owner = Array.isArray(ownerData) ? ownerData[0] : ownerData;
			locationsMap.set(loc.location_id, {
				location_id: loc.location_id,
				name: loc.name,
				description: loc.description,
				lat: loc.lat,
				long: loc.long,
				group: loc.group ?? 'Ungrouped',
				created_at: loc.created_at,
				owner_id: loc.owner_id,
				owner_name: owner?.full_name || null,
				owner_email: owner?.email || null,
				device_count: deviceCounts[loc.location_id] || 0,
				is_owner: false,
				permission_level: item.permission_level
			});
		}
	});

	const locations = Array.from(locationsMap.values()).sort((a, b) => {
		const groupA = (a.group ?? '').toLowerCase();
		const groupB = (b.group ?? '').toLowerCase();
		if (groupA !== groupB) return groupA.localeCompare(groupB);
		return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
	});

	return {
		session,
		locations
	};
};
