import { redirect } from '@sveltejs/kit';

export async function load({ fetch, locals: { supabase, getSession } }) {
    const session = await getSession();
    if (!session) throw redirect(304, '/auth/login');
    const user_id = session?.user.id;

    // const deviceTableResponse = await fetch('/api/device-table', {method: 'GET'});
    // const devices = await deviceTableResponse.json();

    // let online: number[] = devices.filter(x => x.active == '🟢') ?? [];
    // let offline: number[] = devices.filter(x => x.active == '🔴') ?? [];

    return {
        sensors: [], // devices,
        online: [],
        offline: [],

    }
}
