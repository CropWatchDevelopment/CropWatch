import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * Delete a device by its DevEUI.
 * Only the device owner (permission_level 4) can delete a device.
 */
export const DELETE: RequestHandler = async ({ params, locals }) => {
	// Verify authentication
	const { session, user } = await locals.safeGetSession();
	if (!session || !user) {
		return json({ success: false, error: 'Unauthorized' }, { status: 401 });
	}

	const supabase = locals.supabase;
	const devEui = params.dev_eui;

	// Validate input
	if (!devEui || typeof devEui !== 'string') {
		return json({ success: false, error: 'Device EUI is required' }, { status: 400 });
	}

	try {
		// Check if device exists, and you are its owner
		const { data: device, error: deviceError } = await supabase
			.from('cw_devices')
			.select('dev_eui, name, location_id, user_id')
			.eq('dev_eui', devEui)
            .eq('user_id', user.id) // Ensure user is the owner
			.maybeSingle();

		if (deviceError) {
			console.error('Database error fetching device:', deviceError);
			return json({ 
				success: false, 
				error: 'Failed to fetch device.' 
			}, { status: 500 });
		}

		if (!device) {
			return json({ 
				success: false, 
				error: 'Device not found, or you do not have permission to delete it.' 
			}, { status: 404 });
		}

		// Delete device owners first (foreign key constraint)
		const { error: ownersDeleteError } = await supabase
			.from('cw_device_owners')
			.delete()
			.eq('dev_eui', devEui);

		if (ownersDeleteError) {
			console.error('Error deleting device owners:', ownersDeleteError);
			return json({ 
				success: false, 
				error: 'Failed to delete device permissions.' 
			}, { status: 500 });
		}

		// Delete the device
		const { error: deleteError } = await supabase
			.from('cw_devices')
			.delete()
			.eq('dev_eui', devEui);

		if (deleteError) {
			console.error('Error deleting device:', deleteError);
			return json({ 
				success: false, 
				error: 'Failed to delete device.' 
			}, { status: 500 });
		}

		// return json({ 
		// 	success: true, 
		// 	message: 'Device deleted successfully.',
		// 	device: {
		// 		devEui: device.dev_eui,
		// 		name: device.name
		// 	}
		// }, { status: 200 });
        return redirect(`/locations/location/${device.location_id}/devices`, 303);

	} catch (error) {
		console.error('Error deleting device:', error);
		return json({ 
			success: false, 
			error: 'An unexpected error occurred.' 
		}, { status: 500 });
	}
};
