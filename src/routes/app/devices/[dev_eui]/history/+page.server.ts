import { redirect } from "@sveltejs/kit";

/** @type {import('./$types').PageLoad} */
export async function load({ params, fetch, locals: { supabase, getSession } }) {
    let session = await getSession();
    if (!session || !session?.user) throw redirect(304, 'auth/login');

    const sensorDataRequest = await fetch(`/api/v1/devices/${params.dev_eui}/data/latest`);
    const sensorData = await sensorDataRequest.json();

    return {
        sensorData: sensorData,
    };
}