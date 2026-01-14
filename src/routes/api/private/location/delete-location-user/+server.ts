import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * Delete a device by its DevEUI.
 * Only the device owner (permission_level 4) can delete a device.
 */
export const DELETE: RequestHandler = async ({ request, params, locals }) => {
	// Verify authentication
	const { session, user } = await locals.safeGetSession();
	if (!session || !user) {
		return json({ success: false, error: 'Unauthorized' }, { status: 401 });
	}

	const supabase = locals.supabase;

    const body = await request.json();
    const location_id: number = +body.location_id;
    const userToDelete: string = body.user_id;
    

	// Validate input
	if (!location_id || typeof location_id !== 'number') {
		return json({ success: false, error: 'Location ID is required' }, { status: 400 });
	}

    if (!userToDelete || typeof userToDelete !== 'string') {
        return json({ success: false, error: 'User ID to delete is required' }, { status: 400 });
    }

	try {
		// Check if the location exists, and that you are infact the owner or a user with permission to delete users
		const { data: location, error: locationError } = await supabase
			.from('cw_locations')
			.select('*')
			.eq('location_id', location_id)
			.maybeSingle();

		if (locationError) {
			console.error('Database error fetching location:', locationError);
			return json({ 
				success: false, 
				error: 'Failed to fetch location.' 
			}, { status: 500 });
		}

		if (!location) {
			return json({ 
				success: false, 
				error: 'Location not found, or you do not have permission to delete it.' 
			}, { status: 404 });
		}

        if (location.owner_id !== user.id) {
            // Check if the user has permission to delete users
            const { data: permissionData, error: permissionError } = await supabase
                .from('cw_location_owners')
                .select('permission_level')
                .eq('location_id', location_id)
                .eq('user_id', user.id)
                .eq('is_active', true)
                .maybeSingle();

            if (permissionError) {
                console.error('Database error fetching permissions:', permissionError);
                return json({ 
                    success: false, 
                    error: 'Failed to fetch user permissions.' 
                }, { status: 500 });
            }

            if (!permissionData || permissionData.permission_level < 3) {
                return json({ 
                    success: false, 
                    error: 'You do not have permission to delete users from this location.' 
                }, { status: 403 });
            }
        }

        // If we got here, we can delete the location user safely!
		// Delete device owners first (foreign key constraint)
		const { error: ownersDeleteError } = await supabase
			.from('cw_location_owners')
			.delete()
			.eq('user_id', userToDelete);

		if (ownersDeleteError) {
			console.error('Error deleting device owners:', ownersDeleteError);
			return json({ 
				success: false, 
				error: 'Failed to delete device permissions.' 
			}, { status: 500 });
		}

        return json({ success: true, message: 'Location user deleted successfully.' }, { status: 200 });

	} catch (error) {
		console.error('Error deleting device:', error);
		return json({ 
			success: false, 
			error: 'An unexpected error occurred.' 
		}, { status: 500 });
	}
};
