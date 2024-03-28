import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { json, redirect, type RequestEvent } from '@sveltejs/kit'
import moment from 'moment';

export async function GET({ response, url, locals: { supabase, getSession } }: { response: any, locals: { supabase: SupabaseClient, getSession: () => Promise<Session | null> } }) {
    const session = await getSession();
    if (!session) throw redirect(304, '/auth/login');
    const user_id = session?.user.id;

    let dev_eui = url.searchParams.get('dev_eui');
    let from = url.searchParams.get('from');
    let to = url.searchParams.get('to');

    const sensors = await getAllSensorsForUser(supabase, user_id, dev_eui);
    if(sensors.dev_eui == dev_eui) {

        const csvData = await getDataForSensor(supabase, 'seeed_co2_lorawan_uplinks', dev_eui, from, to);
        console.log(csvData);
        if (csvData) {
            const csvResponse = new Response(csvData, {
                headers: {
                    'Content-Type': 'text/csv',
                },
            });
            return csvResponse;
        }
        
    }

    return false;
}

async function getAllSensorsForUser(supabase: SupabaseClient, user_id: string, dev_eui: string) {
    const { data, error } = await supabase.from('cw_device_owners').select('*, cw_devices(*)').eq('user_id', user_id).eq('dev_eui', dev_eui).maybeSingle();
    console.log('getAllSensorsForUser', data, error)
    if (!data) {
        console.log(error);
        return [];
    } else {
        return data;
    }
}

async function getDataForSensor(supabase: SupabaseClient, data_table: string, dev_eui: string, from: Date, to: Date) {
    const { data, error } = await supabase
    .from(data_table)
    .select('*')
    .eq('dev_eui', dev_eui)
    .order('created_at', { ascending: false })
    .gte('created_at', moment(from).utc().toDate().toISOString())
    .lt('created_at', moment(to).utc().toDate().toISOString())
    .csv();
    if (!data) {
        console.log(error);
        return [];
    } else {
        return data;
    }
}
