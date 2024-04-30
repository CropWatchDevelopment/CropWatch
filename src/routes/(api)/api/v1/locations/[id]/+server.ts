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