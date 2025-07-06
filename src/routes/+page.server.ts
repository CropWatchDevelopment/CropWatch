import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	// Check if there are any devices in the database
	const { data: devices, error } = await supabase.from('CW_DEVICES').select('id').limit(1);

	if (error) {
		console.error('Error checking devices:', error);
		return {
			hasDevices: false
		};
	}

	return {
		hasDevices: devices && devices.length > 0
	};
};
