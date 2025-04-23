import { redirect } from "@sveltejs/kit";

export const load = async ({ fetch, locals: { supabase, safeGetSession } }) => {
    const session = await safeGetSession();
    if (!session) {
        return redirect(303, '/auth/login?redirect=/app&reason=unauthenticated');
    }

    const { data: privateGateways, error: privateGatewaysErrors } = await supabase
        .from('cw_gateways')
        .select(`*, cw_gateways_owners!inner(*)`)
        .eq('is_public', false);
    const { data: publicGateways, error: publicGatewaysErrors } = await supabase
        .from('cw_gateways')
        .select(`*`)
        .eq('is_public', true);

    return {
        privateGateways: privateGateways ?? [],
        publicGateways: publicGateways ?? [],
        privateGatewaysErrors,
        publicGatewaysErrors
    };
}
