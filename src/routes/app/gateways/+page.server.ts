import { redirect } from "@sveltejs/kit";

/** @type {import('./$types').PageLoad} */
export async function load({ params, fetch, locals: { supabase, getSession } }) {
    let session = await getSession();
    if (!session || !session?.user) throw redirect(304, 'auth/login');

    const gatewaysRequest = await fetch(`/api/v1/gateways`);
    if (gatewaysRequest.ok) {
        const gatewaysData = await gatewaysRequest.json();
        
        return {
            gateways: gatewaysData,
        };
    }

    return {
        gateways: [],
    };
}