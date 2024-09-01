import CwDeviceTypeService from "$lib/services/CwDeviceTypeService";
import type { Tables } from "$lib/types/supabaseSchema";
import { redirect, type RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ locals: { supabase, safeGetSession } }) => {
    const session = await safeGetSession();
    if (!session.user) {
        throw redirect(303, '/auth/unauthorized');
    }

    const cwDeviceTypeService = new CwDeviceTypeService(supabase);
    const deviceTypes: Tables<'cw_device_type'>[] = await cwDeviceTypeService.getAll();

    if (!deviceTypes) {
        throw new Error('Error fetching device types');
    }

    return new Response(JSON.stringify(deviceTypes), {
        headers: {
            'Content-Type': 'application/json'
        }
    });
}