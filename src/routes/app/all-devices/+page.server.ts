import { redirect } from "@sveltejs/kit";

export const load = async ({ params, fetch, locals: { supabase, safeGetSession } }) => {
    const session = await safeGetSession();
    if (!session || !session.user) {
        return redirect(303, '/auth/login?redirect=/app&reason=unauthenticated');
    }

    const { data: devices, error } = await supabase
        .from('cw_devices')
        .select('*')
        .eq('user_id', session.user.id);
    if (error) {
        console.error('Error fetching devices:', error);
        return { devices: [] };
    }
    const result = {
        devices: devices.map(device => ({
            id: device.id,
            name: device.name,
            location_id: device.location_id,
            dev_eui: device.dev_eui,
        }))
    };
    return result;
}