import type { SupabaseClient } from '@supabase/supabase-js';
import { redirect } from '@sveltejs/kit';
import moment from 'moment';

export async function load({ params, locals: { supabase, getSession } }) {
    const session = await getSession();
    if (!session) throw redirect(304, '/auth/login');
    const user_id = session?.user.id;

    const sensors = await getAllSensorsForUser(supabase, user_id);
    for (let i = 0; i < sensors.length; i++) {
        const data_table = sensors[i].cw_devices.cw_device_type.data_table;
        if (data_table) {
            const dev_data = await getDataForSensor(supabase, data_table);
            sensors[i].data = Object.assign({}, sensors[i], dev_data);
        }
    }
    console.log(sensors);

    // Transform the data for Grid.js
    const transformedData = sensors.map(sensor => {
        // Extracting the sensor's name
        const name = sensor.cw_devices.name;

        // Extracting the created_at timestamp from sensor data if available, otherwise from the device type
        const lastSeen = sensor.data?.created_at ?? sensor.cw_devices.cw_device_type.created_at;

        // Extract additional sensor data, e.g., temperature, and format it
        const primaryData = 2; //sensor.data[sensor.cw_devices.cw_device_type.primary_data] ? sensor.data[sensor.cw_devices.cw_device_type.primary_data] : 'N/A';

        // Here, you can add more sensor data as needed
        // const otherSensorData = ...

        let active = '⚪';
        if (sensor.cw_devices.upload_interval > 0) {
            if (moment(lastSeen).isBefore(moment().utc().add(sensor.cw_devices.upload_interval, 'minutes'))) {
                active = '🟢';
            } else {
                active = '🔴';
            }
        }

        const url = sensor.cw_devices.cw_device_type.device_app;

        return { active, name, lastSeen, primaryData, url, /*, otherSensorData */ };
    });

    return {
        sensors: transformedData,
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
    const { data, error } = await supabase.from(data_table).select('*').order('created_at', { ascending: false }).limit(1).single();
    if (!data) {
        console.log(error);
        return [];
    } else {
        return data;
    }
}