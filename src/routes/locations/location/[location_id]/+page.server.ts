import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params, depends }) => {
    depends('location:permissions');
    const { session } = await locals.safeGetSession();

    if (!session) {
        throw redirect(303, '/auth');
    }

    const { supabase } = locals;

    // fetch this specific location data based on the location_id in the url
    const { data: locations, error: locationsError } = await supabase
        .from('cw_locations')
        .select(`
            location_id,
            name,
            description,
            lat,
            long,
            created_at,
            owner_id,
            owner:profiles!cw_locations_owner_id_fkey (
                id,
                full_name,
                email
            )
        `)
        .eq('owner_id', session.user.id)
        .eq('location_id', parseInt(params.location_id))
        .single();
    
    const { data: locationPermissions, error: locationPermissionsError } = await supabase
        .from('cw_location_owners')
        .select('profiles:user_id (id, full_name, email), user_id, permission_level, is_active')
        .eq('location_id', parseInt(params.location_id))
        .eq('is_active', true);

    if (locationsError) {
        console.error('Error fetching locations:', locationsError);
    }

    return {
        session,
        location: locations || null,
        locationPermissions: locationPermissions || []
    };

};