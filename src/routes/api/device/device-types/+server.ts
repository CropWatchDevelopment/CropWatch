import type { Tables } from "$lib/types/database.types";
import { error, redirect, type RequestHandler } from "@sveltejs/kit";

type cw_device_types = Tables<'cw_device_type'>;

export const GET: RequestHandler = async ({ url, params, locals: { supabase, safeGetSession } }) => {
    const session = await safeGetSession();
    if (!session.user) {
        return redirect(301, '/auth/unauthorized');
    }

    const deviceTypes = await supabase.from<cw_device_type>('cw_device_type').select('*').eq('isActive', true);

    if (!deviceTypes) {
        throw error(500, 'Error fetching device types');
    }

    return new Response(JSON.stringify(deviceTypes.data), {
        headers: {
            'Content-Type': 'application/json'
        }
    });
};