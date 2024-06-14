import { PermissionNameToNumber } from "$lib/utilities/permissionNumberToName";
import { redirect, type RequestHandler } from "@sveltejs/kit";

export const GET: RequestHandler = async ({ url, params, locals: { supabase, getSession } }) => {
    const session = await getSession();
    if (!session) {
        throw redirect(303, '/auth/unauthorized');
    }

    const dev_eui = params.dev_eui;

    if (!dev_eui) {
        return new Response(
            JSON.stringify({ error: 'dev_eui is required' }),
            {
                status: 400,
            });
    }

    const { data, error } = await supabase
        .from('cw_device_owners')
        .select('*, profiles(email)')
        .eq('dev_eui', dev_eui);

    return new Response(
        JSON.stringify(data) ||
        error,
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

    const dbItem = {
        user_id: userProfile.id,
        dev_eui: formData.get('dev_eui'),
        permission_level: formData.get('permission_level'),
    }

    const { data, error } = await supabase
        .from('cw_device_owners')
        .insert(dbItem)
        .select()
        .single();
    if(data) {
        data.profiles = {
            email: formData.get('email'),
        }
    }

    return new Response(
        JSON.stringify(data) ?? JSON.stringify(error),
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

    const { data: targetRow, error: targetRowError } = await supabase
        .from('cw_device_owners')
        .select('*')
        .eq('id', url.searchParams.get('id'))
        .limit(1)
        .single();
    if (targetRowError) {
        return new Response(
            targetRowError,
            {
                statusText: 'User not found',
                status: 404,
            });
    }

    if (targetRow.user_id === session.user.id) {
        return new Response(
            JSON.stringify({ error: 'You cannot delete your own permission' }),
            {
                status: 403,
                statusText: 'Forbidden',
            });
    }


    const { data, error } = await supabase
        .from('cw_device_owners')
        .delete()
        .eq('id', url.searchParams.get('id'))
        .select();

    return new Response(
        data ?? error,
        {
            status: data ? 200 : 500,
            statusText: data ? 'OK' : 'Internal Server Error',
        });
}