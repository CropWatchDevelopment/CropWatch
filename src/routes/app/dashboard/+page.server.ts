import { supabase } from '$lib/supabaseClient';
import { redirect } from '@sveltejs/kit';

export async function load({ params, locals: { supabase, getSession } }) {
    const session = await getSession();
    if (!session) throw redirect(304, '/auth/login');
    const user_id = session?.user.id;
    console.log(user_id)
    
    return {
        sensors: await supabase.from('cw_device_owners').select('*, cw_devices(*)').eq('user_id', user_id),
    };
}