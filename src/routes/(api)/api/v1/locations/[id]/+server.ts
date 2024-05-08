import { redirect, type RequestHandler } from "@sveltejs/kit";

export const GET: RequestHandler = async ({ url, params, locals: { supabase, safeGetSession } }) => {
    const { session } = await safeGetSession();
    if (!session) {
        throw redirect(303, '/auth/unauthorized');
    }

    const locationId = +(params.id ?? 0);
    if (locationId === 0) {
        return new Response(
            JSON.stringify({ error: 'location_id is required' }),
            {
                status: 400,
            });
    }
    const { data, error } = await supabase
        .from('cw_location_owners')
        .select('*, cw_locations(*)')
        .eq('location_id', locationId)
        .eq('user_id', session.user.id)
        .limit(1)
        .single();
    return new Response(
        JSON.stringify(data) ||
        JSON.stringify(error),
        {
            status: data ? 200 : 404,
            headers: {
                'Content-Type': 'application/json',
            }
        });
}

export const PUT: RequestHandler = async ({ params, request, locals: { supabase, safeGetSession } }) => {
    const { session } = await safeGetSession();
    if (!session) {
        throw redirect(303, '/auth/unauthorized');
    }

    const body = new URLSearchParams(await request.json());
    const name = body.get('name');


    if (!name) {
        return new Response(
            JSON.stringify({ error: 'name is required' }),
            {
                status: 400,
            });
    }

    const locationId = +(params.id ?? 0);
    if (locationId === 0) {
        return new Response(
            JSON.stringify({ error: 'location_id is required' }),
            {
                status: 400,
            });
    }
    const { data, error } = await supabase
        .from('cw_location_owners')
        .select('*, cw_locations(*)')
        .eq('location_id', locationId)
        .eq('user_id', session.user.id)
        .limit(1)
        .single();

    if (error) {
        return new Response(
            JSON.stringify(error),
            {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                }
            });
    }

    const { data: updatedData, error: updateError } = await supabase
    .from('cw_locations')
    .update({'name': name})
    .eq('location_id', data.cw_locations.location_id)
    .select()
    .single();

    return new Response(
        JSON.stringify(updatedData) ||
        JSON.stringify(updateError),
        {
            status: updatedData ? 200 : 500,
            statusText: updatedData ? 'OK' : updateError,
            headers: {
                'Content-Type': 'application/json',
            }
        });
}