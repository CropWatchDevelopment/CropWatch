import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	const { count, error } = await supabase
		.from('cw_devices')
		.select('dev_eui', { count: 'exact', head: true });

	if (error) {
		console.error('Error checking devices:', error);
		return { hasDevices: false };
	}

	return { hasDevices: Boolean(count && count > 0) };
};
