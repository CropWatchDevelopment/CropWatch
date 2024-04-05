import type { SupabaseClient } from "@supabase/supabase-js";
import { redirect } from "@sveltejs/kit";

/** @type {import('./$types').PageLoad} */
export async function load({ params, locals: { supabase, getSession } }) {
    const session = await getSession();
    if (!session) throw redirect(304, '/auth/login');
    const user_id = session?.user.id;

    const { data, error } = await supabase.from('cw_rules').select('*').eq('profile_id', user_id);

    if (error) {
        console.error(error);
        throw error(500, { message: 'Internal Server Error' });
    }

    return {
        rules: data,
    };
}