import { redirect } from "@sveltejs/kit";

/** @type {import('./$types').PageLoad} */
export async function load({ params, fetch, locals: { supabase, safeGetSession } }) {
    let session = await safeGetSession();
    console.log(session)
    if (!session) throw redirect(304, '/auth/login');
    const user_id = session?.user.id;

    const sensorDataRequest = await fetch(`/api/v1/devices/${params.dev_eui}/data`);
    const sensorData = await sensorDataRequest.json();

    const sensorTypeRequest = await fetch(`/api/v1/devices/${params.dev_eui}/type`);
    const sensorType = await sensorTypeRequest.json();

    return {
        data: sensorData,
        sensorType: sensorType,
    };
}