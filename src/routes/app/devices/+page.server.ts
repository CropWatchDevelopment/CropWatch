import { redirect } from '@sveltejs/kit';

export async function load({ fetch, locals: { supabase, getSession } }) {
    const session = await getSession();
    if (!session) throw redirect(304, '/auth/login');
    const user_id = session?.user.id;

    const deviceTableResponse = await fetch('/api/device-table', {method: 'GET'});
    const res = await deviceTableResponse.json();

    return {
        sensors: res,
    }
}
