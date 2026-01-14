import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * Check if a device with the given DevEUI already exists in the database.
 * Used to prevent duplicate device registrations.
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	// Verify authentication
	const { session, user } = await locals.safeGetSession();
	if (!session || !user) {
		return json({ success: false, error: 'Unauthorized' }, { status: 401 });
	}

	const supabase = locals.supabase;

	try {
		const { devEui } = await request.json();

		// Validate input
		if (!devEui || typeof devEui !== 'string') {
			return json({ success: false, error: 'DevEUI is required' }, { status: 400 });
		}

		// Clean and validate DevEUI format (16 hex characters)
		const cleanDevEui = devEui.replace(/\s/g, '').toUpperCase();
		if (!/^[A-Fa-f0-9]{16}$/.test(cleanDevEui)) {
			return json({ 
				success: false, 
				error: 'Invalid DevEUI format. Must be 16 hexadecimal characters.' 
			}, { status: 400 });
		}

		// Check if device exists in database (case-insensitive)
		const { data: existingDevice, error } = await supabase
			.from('cw_devices')
			.select('dev_eui')
			.eq('dev_eui', cleanDevEui)
			.maybeSingle();

		if (error) {
			console.error('Database error checking device:', error);
			return json({ 
				success: false, 
				error: 'Failed to check device registration.' 
			}, { status: 500 });
		}

		if (existingDevice) {
			return json({
				success: true, 
				exists: true,
				device: {
					devEui: existingDevice.dev_eui,
				},
				message: 'This device is already registered in CropWatch.'
			}, { status: 200 });
		}

		// Device not found - available for registration
		return json({ 
			success: true, 
			exists: false,
			message: 'Device is available for registration.'
		}, { status: 200 });

	} catch (error) {
		console.error('Error checking device existence:', error);
		return json({ 
			success: false, 
			error: 'An unexpected error occurred.' 
		}, { status: 500 });
	}
};
