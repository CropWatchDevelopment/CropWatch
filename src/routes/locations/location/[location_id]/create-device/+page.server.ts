import type { PageServerLoad, Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, locals, parent }) => {
	const { session, user } = await locals.safeGetSession();
	if (!session || !user) {
		throw redirect(303, '/auth');
	}

	// Get parent data to satisfy PageData requirements
	const parentData = await parent();

	const locationId = parseInt(params.location_id);

	// Fetch device types for the dropdown (including TTI_application_id for verification)
	const { data: deviceTypes, error: deviceTypesError } = await locals.supabase
		.from('cw_device_type')
		.select('id, name, manufacturer, model, TTI_application_id')
		.eq('isActive', true)
		.order('name');

	if (deviceTypesError) {
		console.error('Error fetching device types:', deviceTypesError);
	}

	// Fetch location info
	const { data: location, error: locationError } = await locals.supabase
		.from('cw_locations')
		.select('location_id, name, owner_id')
		.eq('location_id', locationId)
		.single();

	if (locationError || !location) {
		console.error('Error fetching location:', locationError);
		throw redirect(303, '/locations');
	}

	// Fetch location users (for applying permissions)
	const { data: locationUsers, error: locationUsersError } = await locals.supabase
		.from('cw_location_owners')
		.select(`
			id,
			user_id,
			permission_level,
			is_active,
			profiles:user_id (
				id,
				full_name,
				email
			)
		`)
		.eq('location_id', locationId)
		.eq('is_active', true);

	if (locationUsersError) {
		console.error('Error fetching location users:', locationUsersError);
	}

	return {
		...parentData,
		session,
		deviceTypes: deviceTypes ?? [],
		location,
		locationUsers: locationUsers ?? [],
		userId: user.id
	};
};

export const actions: Actions = {
	default: async ({ request, params, locals }) => {
		const { session, user } = await locals.safeGetSession();
		if (!session || !user) {
			return fail(401, { error: 'Unauthorized' });
		}

		const locationId = parseInt(params.location_id);
		const formData = await request.formData();

		const devEui = formData.get('dev_eui')?.toString().trim();
		const name = formData.get('name')?.toString().trim();
		const deviceType = formData.get('device_type')?.toString();
		const serialNumber = formData.get('serial_number')?.toString().trim() || null;
		const sensorSerial = formData.get('sensor_serial')?.toString().trim() || null;
		const ttiName = formData.get('tti_name')?.toString().trim() || null;
		const applyLocationPermissions = formData.get('apply_location_permissions') === 'true';

		// Validation
		if (!devEui) {
			return fail(400, { error: 'Device EUI is required', devEui, name, deviceType });
		}

		if (!name) {
			return fail(400, { error: 'Device name is required', devEui, name, deviceType });
		}

		// Check if device already exists
		const { data: existingDevice } = await locals.supabase
			.from('cw_devices')
			.select('dev_eui')
			.eq('dev_eui', devEui)
			.single();

		if (existingDevice) {
			return fail(400, { error: 'A device with this EUI already exists', devEui, name, deviceType });
		}

		// Create the device
		const { data: newDevice, error: deviceError } = await locals.supabase
			.from('cw_devices')
			.insert({
				dev_eui: devEui,
				name: name,
				type: deviceType ? parseInt(deviceType) : null,
				location_id: locationId,
				user_id: user.id,
				serial_number: serialNumber,
				sensor_serial: sensorSerial,
				tti_name: ttiName,
				installed_at: new Date().toISOString()
			})
			.select()
			.single();

		if (deviceError) {
			console.error('Error creating device:', deviceError);
			return fail(500, { error: 'Failed to create device. Please try again.', devEui, name, deviceType });
		}

		// Get the location owner
		const { data: location } = await locals.supabase
			.from('cw_locations')
			.select('owner_id')
			.eq('location_id', locationId)
			.single();

		if (applyLocationPermissions) {
			// Fetch all active location users and apply their permissions to this device
			const { data: locationUsers } = await locals.supabase
				.from('cw_location_owners')
				.select('user_id, permission_level')
				.eq('location_id', locationId)
				.eq('is_active', true);

			if (locationUsers && locationUsers.length > 0) {
				const deviceOwnerRecords = locationUsers.map((locUser) => ({
					dev_eui: devEui,
					user_id: locUser.user_id,
					permission_level: locUser.permission_level ?? 1
				}));

				const { error: ownersError } = await locals.supabase
					.from('cw_device_owners')
					.insert(deviceOwnerRecords);

				if (ownersError) {
					console.error('Error adding device owners:', ownersError);
					// Don't fail the whole operation, device is created
				}
			}
		} else {
			// Only add the location owner (or current user if no location owner)
			const ownerId = location?.owner_id || user.id;

			const { error: ownerError } = await locals.supabase
				.from('cw_device_owners')
				.insert({
					dev_eui: devEui,
					user_id: ownerId,
					permission_level: 1 // Admin permission for owner
				});

			if (ownerError) {
				console.error('Error adding device owner:', ownerError);
			}

			// If current user is not the location owner, add them too but with viewer permission (disabled by default)
			if (ownerId !== user.id) {
				// The current user created the device, so add them as owner as well
				const { error: creatorError } = await locals.supabase
					.from('cw_device_owners')
					.insert({
						dev_eui: devEui,
						user_id: user.id,
						permission_level: 4 // Admin since they created it
					});

				if (creatorError) {
					console.error('Error adding device creator as owner:', creatorError);
				}
			}
		}

		// Redirect to the new device page
		throw redirect(303, `/locations/location/${locationId}/devices/device/${devEui}`);
	}
};
