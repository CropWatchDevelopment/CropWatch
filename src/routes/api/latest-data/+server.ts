import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { json, redirect } from '@sveltejs/kit'

export async function GET({ url, locals: { supabase, getSession } }: { response: any, locals: { supabase: SupabaseClient, getSession: () => Promise<Session | null> } }) {
    const session = await getSession();
    if (!session) throw redirect(304, '/auth/login');
    const user_id = session?.user.id;

    let dev_eui = url.searchParams.get('dev_eui');
    let store = url.searchParams.get('store');

    const sensors = await getAllSensorsForUser(supabase, user_id, dev_eui, store);
    if(sensors.dev_eui == dev_eui) {

        return json(sensors);
        
    }

    return json(null);
}

async function getAllSensorsForUser(supabase: SupabaseClient, user_id: string, dev_eui: string, store: string) {
    if(store === 'cw_pulse') return [];
    try {
        const { data, error } = await supabase.from('cw_device_owners').select(`*, cw_devices(*, ${store}(*))`).eq('user_id', user_id).eq('dev_eui', dev_eui).maybeSingle();
        if (!data) {
            console.log(error);
            return [];
        } else {
            return data;
        }
    } catch (error) {
        return [];
    }
}

async function getDataForSensor(supabase: SupabaseClient, data_table: string, dev_eui: string) {
    const { data, error } = await supabase
    .from(data_table)
    .select('*')
    .eq('dev_eui', dev_eui)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
    if (!data) {
        console.log(error);
        return [];
    } else {
        return data;
    }
}
