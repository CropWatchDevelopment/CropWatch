import { redirect } from "@sveltejs/kit";

/** @type {import('./$types').PageLoad} */
export async function load({ params, fetch, locals: { supabase, getSession } }) {
    let session = await getSession();
    if (!session || !session?.user) throw redirect(304, 'auth/login');

    const sensorDataRequest = await fetch(`/api/v1/devices/${params.dev_eui}/data?page=0&count=1`);
    const sensorData = await sensorDataRequest.json();

    const sensorTypeRequest = await fetch(`/api/v1/devices/${params.dev_eui}/type`);
    const sensorType = await sensorTypeRequest.json();

    return {
        data: sensorData,
        sensorType: sensorType,
    };
}