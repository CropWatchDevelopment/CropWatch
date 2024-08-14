import CwLocationOwnersRepository from '$lib/repositories/CwLocationOwnersRepository';
import CwProfileRepository from '$lib/repositories/CwProfilesRepository';
import CwLocationOwnersService from '$lib/services/CwLocationOwnersService';
import CwProfileService from '$lib/services/CwProfileService';
import type { Tables } from '$lib/types/supabaseSchema';
import { error, redirect, type RequestHandler } from '@sveltejs/kit';

type CwLocations = Tables<'cw_locations'>;

export const GET: RequestHandler = async ({ url, params, locals: { supabase, safeGetSession } }) => {
    const session = await safeGetSession();
    if (!session.user) {
        return redirect(301, '/auth/unauthorized');
    }

    const location_id: number = +(params.location_id ?? -1);
    if (location_id === -1) {
        throw error(400, 'Location ID is not supported');
    }

    const cwLocationOwnersService = new CwLocationOwnersService(supabase);
    const cwProfileService = new CwProfileService(supabase);
    const locationOwners = await cwLocationOwnersService.getAll(location_id);

    if (!locationOwners) {
        throw error(400, 'Error looking up Location by ID');
    }

    for(let locationOwner of locationOwners) {
        let profile = await cwProfileService.getById(locationOwner.user_id);
        locationOwner['profile'] = profile;
    }

    return new Response(JSON.stringify(locationOwners), {
        headers: {
            'Content-Type': 'application/json'
        }
    });

}