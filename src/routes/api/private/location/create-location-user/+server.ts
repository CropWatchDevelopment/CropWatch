import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * CREATE a location user.
 */
export const POST: RequestHandler = async ({ request, params, locals }) => {
	// Verify authentication
	const { session, user } = await locals.safeGetSession();
	if (!session || !user) {
		return json({ success: false, error: 'Unauthorized' }, { status: 401 });
	}

	const supabase = locals.supabase;

	const body = await request.json();
	const location_id: number = +body.location_id;
	const userToAdd: string = body.user_id;
	const permissionLevel: number = +body.permission_level;
	const applyToDevices: boolean = body.apply_to_devices === true;

	// Validate input
	if (!location_id || typeof location_id !== 'number') {
		return json({ success: false, error: 'Location ID is required' }, { status: 400 });
	}

	if (!userToAdd || typeof userToAdd !== 'string') {
		return json({ success: false, error: 'User ID to add is required' }, { status: 400 });
	}

	if (!permissionLevel || typeof permissionLevel !== 'number') {
		return json({ success: false, error: 'Permission level is required' }, { status: 400 });
	}

	if (body.apply_to_devices === undefined || typeof applyToDevices !== 'boolean') {
		return json({ success: false, error: 'Apply to devices flag is required' }, { status: 400 });
	}

	try {
		// Ensure the requested location exists
		const { data: location, error: locationError } = await supabase
			.from('cw_locations')
			.select('location_id, owner_id')
			.eq('location_id', location_id)
			.maybeSingle();

		if (locationError) {
			console.error('Database error fetching location:', locationError);
			return json({ success: false, error: 'Failed to fetch location.' }, { status: 500 });
		}

		if (!location) {
			return json({ success: false, error: 'Location not found.' }, { status: 404 });
		}

		const isLocationOwner = location.owner_id === user.id;

		if (!isLocationOwner) {
			// Allow location admins (permission level <= 2) to invite additional users
			const { data: locationUser, error: locationUserError } = await supabase
				.from('cw_location_owners')
				.select('permission_level')
				.eq('location_id', location_id)
				.eq('user_id', user.id)
				.maybeSingle();

			if (locationUserError) {
				console.error('Database error fetching location permissions:', locationUserError);
				return json({ success: false, error: 'Failed to fetch location permissions.' }, { status: 500 });
			}

			const permissionValue = locationUser?.permission_level;
			const hasSufficientPermission =
				typeof permissionValue === 'number' && permissionValue <= 2;

			if (!hasSufficientPermission) {
				return json({ success: false, error: 'Forbidden' }, { status: 403 });
			}
		}

		// Add the user to the location with the specified permission level
		const { data: insertResult, error: insertError } = await supabase
			.from('cw_location_owners')
			.insert({
				location_id,
				user_id: userToAdd,
				permission_level: permissionLevel,
				admin_user_id: user.id
			});
		console.log('Insert result:', insertResult);

		if (insertError) {
			console.error('Database error adding location user:', insertError);
			return json({
				success: false,
				error: 'Failed to add user to location.'
			}, { status: 500 });
		}

		/*
		No matter what, we want to pull all devices from the location. IF the user selected to update
		to apply permission to all location's devices, then set that permission to all of the devices as well.
		IF NOT, then set all devices in this location to have no permission for this user.
		*/
		const { data: locationDevices, error: locationDevicesError } = await supabase
			.from('cw_devices')
			.select('dev_eui')
			.eq('location_id', location_id);

		if (locationDevicesError) {
			console.error('Database error fetching location devices:', locationDevicesError);
			return json({
				success: false,
				error: 'Failed to fetch location devices.'
			}, { status: 500 });
		}

		for (const device of locationDevices) {
			const { data: deviceOwnerResult, error: deviceOwnerError } = await supabase
				.from('cw_device_owners')
				.upsert({
					dev_eui: device.dev_eui,
					user_id: userToAdd,
					permission_level: applyToDevices ? permissionLevel : 4 // 4 = no access
				}, { onConflict: 'dev_eui, user_id' });

			if (deviceOwnerError) {
				console.error('Database error updating device owner permission:', deviceOwnerError);
				return json({
					success: false,
					error: 'Failed to update device owner permission.'
				}, { status: 500 });
			}
		}

		return json({
			success: true,
			message: 'User added to location successfully.'
		}, { status: 200 });

	} catch (error) {
		console.error('Error adding location user:', error);
		return json({ success: false, error: 'Internal server error' }, { status: 500 });
	}

};
