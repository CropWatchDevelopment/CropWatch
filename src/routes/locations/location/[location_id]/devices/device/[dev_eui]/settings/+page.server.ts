import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { fetchDeviceHistory } from '$lib/data/SourceOfTruth.svelte';

export const load: PageServerLoad = async ({ params, locals }) => {
	const { session } = await locals.safeGetSession?.();

	if (!session) {
		throw redirect(303, '/auth');
	}

	const tokens = {
		access_token: session.access_token,
		refresh_token: session.refresh_token
	};

	const { points } = await fetchDeviceHistory({
		devEui: params.dev_eui,
		limit: 2000,
		hoursBack: 24,
		session: tokens
	});

	const { data: deviceOwners, error: deviceOwnersError } = await locals.supabase
		.from('cw_device_owners')
		.select('user_id, permission_level, profiles:user_id (id, full_name, email, avatar_url)')
		.eq('dev_eui', params.dev_eui);

	if (deviceOwnersError) {
		console.error('Error fetching device owners:', deviceOwnersError);
	}

	const { data: device, error: deviceError } = await locals.supabase
		.from('cw_devices')
		.select('dev_eui, name, location_id, type, serial_number, sensor_serial, tti_name, installed_at')
		.eq('dev_eui', params.dev_eui)
		.single();

	if (deviceError) {
		console.error('Error fetching device:', deviceError);
	}

	return {
		initialHistory: points
			? points.map((p) => ({
						timestamp: p.timestamp,
						primary: p.primary,
						secondary: p.secondary
				  }))
			: [],
		deviceOwners: deviceOwners ?? [],
		device: device ?? null,
		session
	};
};
