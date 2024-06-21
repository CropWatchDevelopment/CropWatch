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
        .eq('dev_eui', dev_eui)
        .eq('user_id', session.user.id)
        .limit(1)
        .single();

    return new Response(
        JSON.stringify(data) ||
        error,
        {
            status: error ? 500 : 200,
        });
}