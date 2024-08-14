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

export const POST: RequestHandler = async ({ request, params, locals: { supabase, safeGetSession } }) => {
    const session = await safeGetSession();
    if (!session.user) {
        return redirect(301, '/auth/unauthorized');
    }

    const location_id: number = +(params.location_id ?? -1);
    if (location_id === -1) {
        throw error(400, 'Location ID is not supported');
    }

    const data = await request.json();

    const email = data.email;
    if (!email) {
        throw error(400, 'Email in request not found');
    }

    const permission_level = data.permissionLevel;
    if (!permission_level) {
        throw error(400, 'Permission Level in request not found');
    }

    const cwProfileService = new CwProfileService(supabase);
    const profile = await cwProfileService.getByEmail(email.toLowerCase())
    if (!profile) {
        throw error(404, 'Profile not found');
    }

    const cwLocationOwnersService = new CwLocationOwnersService(supabase);
    const result = await cwLocationOwnersService.add({
        permission_level: +permission_level,
        is_active: true,
        user_id: profile?.id,
        location_id: location_id,
    });

    if (!result) {
        throw error(500, 'Failed to create Permission');
    }

    result['profile'] = profile;

    return new Response(JSON.stringify(result), {
        headers: {
            'Content-Type': 'application/json'
        }
    });
}

export const DELETE: RequestHandler = async ({ url, params, locals: { supabase, safeGetSession } }) => {
    const session = await safeGetSession();
    if (!session.user) {
        return redirect(301, '/auth/unauthorized');
    }

    const location_id: number = +(params.location_id ?? -1);
    if (location_id === -1) {
        throw error(400, 'Location ID is not supported');
    }
    const permission_id = url.searchParams.get('id');
    if (!permission_id) {
        throw error(400, 'Location ID is not supported');
    }

    const cwLocationOwnersService = new CwLocationOwnersService(supabase);

    const result = await cwLocationOwnersService.remove(+permission_id);

    if (!result) {
        throw error(500, 'Permission Delete Failed');
    }

    return new Response(JSON.stringify(result), {
        headers: {
            'Content-Type': 'application/json'
        }
    });
}