import type { PageServerLoad, Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals, parent }) => {
	const { session, user } = await locals.safeGetSession();
	if (!session || !user) {
		throw redirect(303, '/auth');
	}

	// Get parent data to satisfy PageData requirements
	const parentData = await parent();

	return {
		...parentData,
		session,
		userId: user.id
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const { session, user } = await locals.safeGetSession();
		if (!session || !user) {
			return fail(401, { error: 'Unauthorized' });
		}

		const formData = await request.formData();

		const name = formData.get('name')?.toString().trim();
		const description = formData.get('description')?.toString().trim() || null;
		const lat = formData.get('lat')?.toString().trim();
		const long = formData.get('long')?.toString().trim();

		// Validation
		if (!name) {
			return fail(400, { error: 'Location name is required', name, description, lat, long });
		}

		// Parse coordinates if provided
		let latitude: number | null = null;
		let longitude: number | null = null;

		if (lat) {
			latitude = parseFloat(lat);
			if (isNaN(latitude) || latitude < -90 || latitude > 90) {
				return fail(400, { error: 'Invalid latitude. Must be between -90 and 90.', name, description, lat, long });
			}
		}

		if (long) {
			longitude = parseFloat(long);
			if (isNaN(longitude) || longitude < -180 || longitude > 180) {
				return fail(400, { error: 'Invalid longitude. Must be between -180 and 180.', name, description, lat, long });
			}
		}

		// Create the location
		const { data: newLocation, error: locationError } = await locals.supabase
			.from('cw_locations')
			.insert({
				name: name,
				description: description,
				lat: latitude,
				long: longitude,
				owner_id: user.id
			})
			.select('location_id')
			.single();

		if (locationError) {
			console.error('Error creating location:', locationError);
			return fail(500, { error: 'Failed to create location. Please try again.', name, description, lat, long });
		}

		// Redirect to the new location page
		throw redirect(303, `/locations/location/${newLocation.location_id}`);
	}
};
