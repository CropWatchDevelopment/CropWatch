import { PermissionNameToNumber } from "$lib/utilities/permissionNumberToName";
import { redirect, type RequestHandler } from "@sveltejs/kit";

export const GET: RequestHandler = async ({ url, params, locals: { supabase, getSession } }) => {
    const session = await getSession();
    if (!session) {
        throw redirect(303, '/auth/unauthorized');
    }

    const locationId = params.location_id;

    if (!locationId) {
        return new Response(
            JSON.stringify({ error: 'Location ID is required' }),
            {
                status: 400,
            });
    }

    const { data, error } = await supabase
        .from('cw_location_owners')
        .select('*, profiles(email)')
        .eq('location_id', locationId);

    return new Response(
        JSON.stringify(data),
        {
            status: error ? 500 : 200,
        });
}

export const POST: RequestHandler = async ({ url, params, request, locals: { supabase, getSession } }) => {
    const session = await getSession();
    if (!session) {
        throw redirect(303, '/auth/unauthorized');
    }
    const formData = await request.formData();

    const { data: userProfile, error: userProfileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', formData.get('email'))
        .limit(1)
        .single();

    if (userProfileError) {
        return new Response(
            userProfileError,
            {
                statusText: 'User Email not found in profiles',
                status: 404,
            });
    }

    const { data: location_Data, error: location_error } = await supabase
        .from('cw_locations')
        .select('location_id')
        .eq('location_id', formData.get('location_id'))
        .single();
    if(location_error) {
        return new Response(
            location_error,
            {
                statusText: 'Location ID not found in cw_locations',
                status: 403,
            });
    }

    const dbItem = {
        user_id: userProfile.id,
        location_id: formData.get('location_id'),
        permission_level: formData.get('permission_level'),
        is_active: true,
    }

    const { data, error } = await supabase
        .from('cw_location_owners')
        .insert(dbItem)
        .select()
        .single();
    if(data) {
        data.profiles = {
            email: formData.get('email'),
        }
    }

    return new Response(
        JSON.stringify(data),
        {
            status: data ? 200 : 500,
            statusText: data ? 'OK' : 'Internal Server Error',
        });
}

export const DELETE: RequestHandler = async ({ request, url, locals: { supabase, getSession } }) => {
    const session = await getSession();
    if (!session) {
        throw redirect(303, '/auth/unauthorized');
    }

    // Get The Item we hop to delete
    const { data: targetRow, error: targetRowError } = await supabase
        .from('cw_location_owners')
        .select('*')
        .eq('id', url.searchParams.get('id'))
        .limit(1)
        .single();
    if (targetRowError) {
        return new Response(
            targetRowError,
            {
                statusText: 'Permission not found',
                status: 404,
            });
    }
    // If we have the target, make sure the corisponding locations is owned by US
    const { data: locationData, error: locationError } = await supabase
        .from('cw_locations')
        .select('owner_id')
        .eq('location_id', targetRow.location_id)
        .limit(1)
        .single();

    if (locationError) {
        return new Response(
            locationError,
            {
                statusText: 'Location not found',
                status: 404,
            });
    }

    // make sure you are the owner of that location
    if (locationData.owner_id !== session.user.id) {
        return new Response(
            JSON.stringify({ error: 'Not the owner of this location' }),
            {
                status: 403,
            });
    }


    const { data, error } = await supabase
        .from('cw_location_owners')
        .delete()
        .eq('id', targetRow.id)
        .select();

    return new Response(
        data ?? error,
        {
            status: data ? 200 : 500,
            statusText: data ? 'OK' : 'Internal Server Error',
        });
}