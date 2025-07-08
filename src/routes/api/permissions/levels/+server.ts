import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	try {
		// Check if the user is authenticated
		const {
			data: { user }
		} = await locals.supabase.auth.getUser();
		if (!user) {
			return json({ error: 'Authentication required' }, { status: 401 });
		}

		// Fetch permission levels from the database
		const { data, error } = await locals.supabase
			.from('cw_permission_level_types')
			.select('*')
			.order('permission_level_id', { ascending: true });

		if (error) {
			console.error('Error fetching permission levels:', error);
			return json({ error: 'Failed to fetch permission levels' }, { status: 500 });
		}

		return json(data);
	} catch (error) {
		console.error('Error fetching permission levels:', error);
		return json({ error: 'Failed to fetch permission levels' }, { status: 500 });
	}
};
