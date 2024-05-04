import { redirect } from "@sveltejs/kit";

/** @type {import('./$types').PageLoad} */
export async function load({ params, fetch, locals: { supabase, safeGetSession } }) {
    let session = await safeGetSession();
    if (!session || !session?.user) throw redirect(304, 'auth/login');

    const permissionsRequest = await fetch(`/api/v1/devices/${params.dev_eui}/permissions`);
    const permissionsData = await permissionsRequest.json();

    return {
        userPermissions: permissionsData,
    };
}