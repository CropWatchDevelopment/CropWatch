import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { SessionService } from '$lib/services/SessionService';

export const load: PageServerLoad = async ({ locals }) => {
	// Create a new SessionService instance with the per-request Supabase client
	const sessionService = new SessionService(locals.supabase);
	const sessionResult = await sessionService.getSafeSession();

	const { user } = sessionResult;
	if (!sessionResult || !sessionResult.user) {
		throw redirect(302, '/auth/login');
	}

	const { data: locations, error } = await locals.supabase.from('cw_locations').select(`
      *,
	  cw_devices(*, cw_device_type(*))
    `);

	for (const location of locations || []) {
		if (location.cw_devices) {
			for (const device of location.cw_devices) {
				const { data: latestData } = await locals.supabase
					.from(device.cw_device_type?.data_table_v2 || 'cw_data')
					.select('*')
					.eq('dev_eui', device.dev_eui)
					.order('created_at', { ascending: false })
					.limit(1)
					.single();

				(device as any).latestData = latestData || null;
			}
		}
	}

	if (error) {
		console.error('Error fetching locations:', error);
		throw new Error('Failed to load locations');
	}

	// Return user data to the page
	return {
		locations,
		user: {
			id: user.id,
			email: user.email,
			name: user.user_metadata?.name || user.email?.split('@')[0] || 'User'
		}
	};
};
