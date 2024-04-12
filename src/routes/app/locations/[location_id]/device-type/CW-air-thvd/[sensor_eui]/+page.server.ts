import { supabase } from '$lib/supabaseClient';
import moment from 'moment';

export async function load({ params }) {

    // HERE DO A LOOKUP DEPENDING ON THE CO2 DATABASE LOCATION

    return {
        sensor: await supabase.from('cw_air_thvd')
        .select('*')
        .eq('dev_eui', params.sensor_eui)
        .gte('created_at', moment().subtract(1, 'days').toISOString())
        .order('created_at', { ascending: false })
    };
}