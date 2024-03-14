import type { SupabaseClient } from '@supabase/supabase-js';
import { redirect } from '@sveltejs/kit';

export async function load({ params, locals: { supabase, getSession } }) {
    const session = await getSession();
    if (!session) throw redirect(304, '/auth/login');
    const user_id = session?.user.id;
    
    const sensors = await getAllSensorsForUser(supabase, user_id);
    for(let i = 0; i < sensors.length; i++) {
        const data_table = sensors[i].cw_devices.cw_device_type.data_table;
        if (data_table) {
            sensors[i].cw_devices['data'] = await getDataForSensor(supabase, data_table);
        }
    }

    return {
        sensors: sensors,
    };
}

async function getAllSensorsForUser(supabase: SupabaseClient, user_id: string) {
    const { data, error } = await supabase.from('cw_device_owners').select('*, cw_devices(*, cw_device_type(*))').eq('user_id', user_id);
    if (!data) {
        console.log(error);
        return [];
    } else {
        return data;
    }
}

async function getDataForSensor(supabase: SupabaseClient, data_table: string) {
    const { data, error } = await supabase.from(data_table).select('*').order('created_at', {ascending: false}).limit(1).single();
    if (!data) {
        console.log(error);
        return [];
    } else {
        return data;
    }
}