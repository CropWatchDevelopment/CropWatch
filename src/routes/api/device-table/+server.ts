import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { json, redirect } from '@sveltejs/kit'
import moment from 'moment';

export async function GET({ locals: { supabase, getSession } }: { locals: { supabase: SupabaseClient, getSession: () => Promise<Session | null> } }) {
    const session = await getSession();
    if (!session) throw redirect(304, '/auth/login');
    const user_id = session?.user.id;

    const sensors = await getAllSensorsForUser(supabase, user_id);
    // for (let i = 0; i < sensors.length; i++) {
    //     const data_table = sensors[i].cw_devices.cw_device_type.data_table;
    //     if (data_table) {
    //         const dev_data = await getDataForSensor(supabase, data_table, sensors[i].cw_devices.dev_eui);
    //         sensors[i].data = Object.assign({}, sensors[i], dev_data);
    //     }
    // }

    // Transform the data for Grid.js
    // const transformedData = sensors.map(sensor => {
    //     // Extracting the sensor's name
    //     const name = sensor.cw_devices.name;

    //     // Extracting the created_at timestamp from sensor data if available, otherwise from the device type
    //     const lastSeen = sensor.data?.created_at ?? sensor.cw_devices.cw_device_type.created_at;

    //     const devEui = sensor.cw_devices.dev_eui;

    //     const Location = sensor.cw_devices?.cw_device_locations;

    //     const model = sensor.cw_devices.cw_device_type.id;

    //     // Extract additional sensor data, e.g., temperature, and format it
    //     const primaryData = sensor.data[sensor.cw_devices.cw_device_type.primary_data] ?
    //         `${sensor.data[sensor.cw_devices.cw_device_type.primary_data]}${sensor.cw_devices.cw_device_type.primary_data_notation}` :
    //         'N/A';

    //     // Here, you can add more sensor data as needed
    //     // const otherSensorData = ...

    //     let active = '⚪';
    //     if (sensor.cw_devices.upload_interval > 0) {
    //         if (moment(lastSeen).add(sensor.cw_devices.upload_interval, 'minutes').isAfter(moment().utc())) {
    //             active = '🟢';
    //         } else {
    //             active = '🔴';
    //         }
    //     }

    //     const url = sensor.cw_devices.cw_device_type.device_app;

    //     const locationName = Location?.cw_locations?.name ?? 'N/A';

    //     return { active, name, locationName, Location, devEui, lastSeen, model, primaryData, url };
    // });

    // return json(transformedData);
    return json(sensors)
}

async function getAllSensorsForUser(supabase: SupabaseClient, user_id: string) {
    try {
        const { data, error } = await supabase.from('cw_device_owners').select('*, cw_devices(*, cw_device_locations(id, cw_locations(*)), cw_device_type(*))').eq('user_id', user_id);
        if (!data) {
            console.error('getAllSensorsForUser', error);
            return [];
        } else {
            return data;
        }
    } catch (error) {
        console.error('getAllSensorsForUser', error);
        return [];
    }
}

async function getDataForSensor(supabase: SupabaseClient, data_table: string, dev_eui: string) {
    try {
        const { data, error } = await supabase.from(data_table).select('*').eq('dev_eui', dev_eui).order('created_at', { ascending: false }).limit(1).maybeSingle();
        if (!data) {
            console.error('getDataForSensor', error);
            return [];
        } else {
            return data;
        }
    } catch (error) {
        return [];
    }
}
