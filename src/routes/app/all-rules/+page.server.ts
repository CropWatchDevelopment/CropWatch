import { redirect } from "@sveltejs/kit";

export const load = async ({ params, fetch, locals: { supabase, safeGetSession } }) => {
    const session = await safeGetSession();
    if (!session || !session.user) {
        return redirect(303, '/auth/login?redirect=/app&reason=unauthenticated');
    }

    // const { data: devices, error } = await supabase
    //     .from('cw_devices')
    //     .select(`
    //         *,
    //         cw_locations(*),
    //         cw_rules!inner(*, cw_rule_criteria(*))
    //     `)
    //     .eq('user_id', session.user.id);
    
    const { data: devices, error } = await supabase
        .from('cw_devices')
        .select(`
            *,
            cw_locations(*),
            cw_rules!inner(*, cw_rule_criteria(*))
        `)
        .eq('cw_rules.profile_id', session.user.id);
    if (error) {
        console.error('Error fetching devices:', error);
        return { devices: [] };
    }
    const result = {
        devicesAndRules: devices,
    };
    return result;
}