import type { SupabaseClient } from "@supabase/supabase-js";
import { redirect } from "@sveltejs/kit";

/** @type {import('./$types').PageLoad} */
export async function load({ params, locals: { supabase, getSession } }) {
    const session = await getSession();
    if (!session) throw redirect(304, '/auth/login');
    const user_id = session?.user.id;


    return {
        location: await checkLocationOwner(supabase, +params.location_id, user_id),
        streamed: {
            sensors: load_AllSensors(supabase, +params.location_id),
        },
        weatherJSON: await getWeatherAPIData(),
    };
}

async function checkLocationOwner(supabase: SupabaseClient, id: number, user_id: string) {
    const { data, error } = await supabase
        .from('cw_locations')
        .select('*, cw_location_owners(id, user_id), cw_device_locations(*, cw_devices(*, cw_ss_tmepnpk(soil_moisture, soil_temperatureC)))')
        .eq('cw_location_owners.user_id', user_id)
        .eq('location_id', id)
        .single();

    if (error) {
        console.error(error);
        throw redirect(304, '/auth/login');
    }
    return data;
}

async function load_AllSensors(supabase: SupabaseClient, location_id: number) {
    const { data, error } = await supabase
        .from('cw_device_locations')
        .select('*, cw_devices(*, cw_ss_tmepnpk(*), cw_air_thvd(*), seeed_co2_lorawan_uplinks(*))')
        .eq('location_id', location_id)
        .order('created_at', { referencedTable: 'cw_devices.seeed_co2_lorawan_uplinks', ascending: false })
        .limit(1, { referencedTable: 'cw_devices.cw_ss_tmepnpk' })
        .limit(1, { referencedTable: 'cw_devices.seeed_co2_lorawan_uplinks' })
        .limit(1, { referencedTable: 'cw_devices.cw_air_thvd' })
        ;
    return data;
}

async function getWeatherAPIData() {
    try {
        const weatherRequest = await fetch(
            'https://api.open-meteo.com/v1/forecast?latitude=52.52&longitude=13.41&current=temperature_2m,relative_humidity_2m,is_day,rain,cloud_cover,surface_pressure,wind_speed_10m,wind_direction_10m&hourly=temperature_2m&daily=uv_index_max'
        );
        const weatherJSON = await weatherRequest.json();
        const result = convertApiResponseToResultIncludingLux(weatherJSON);
        return result;
    } catch (error) {

    }
}

function convertApiResponseToResultIncludingLux(apiResponse) {
    // Helper function to convert wind direction from degrees to cardinal directions
    const degreesToDirection = deg => {
        if (deg >= 337.5 || deg < 22.5) {
            return 'N';
        } else if (deg >= 22.5 && deg < 67.5) {
            return 'NE';
        } else if (deg >= 67.5 && deg < 112.5) {
            return 'E';
        } else if (deg >= 112.5 && deg < 157.5) {
            return 'SE';
        } else if (deg >= 157.5 && deg < 202.5) {
            return 'S';
        } else if (deg >= 202.5 && deg < 247.5) {
            return 'SW';
        } else if (deg >= 247.5 && deg < 292.5) {
            return 'W';
        } else if (deg >= 292.5 && deg < 337.5) {
            return 'NW';
        } else {
            return 'N/A'; // In case of any unexpected value
        }
    };

    // Assuming a basic conversion for cloud cover to lux as a placeholder
    // Note: This is a simplistic approach and not scientifically accurate
    const cloudCoverToLux = cloudCover => {
        // Assuming a maximum lux of 100,000 for clear sky conditions and subtracting based on cloud cover percentage
        return Math.max(0, 100000 - (cloudCover * 1000));
    };

    // Extracting necessary data from the API response
    const result = {
        temperature: apiResponse.current.temperature_2m || 0,
        humidity: apiResponse.current.relative_humidity_2m || 0,
        lux: apiResponse.current.cloud_cover !== undefined ? cloudCoverToLux(apiResponse.current.cloud_cover) : 0,
        uv: 0, // Assuming not available from the API
        pressure: apiResponse.current.surface_pressure || 0,
        windSpeed: apiResponse.current.wind_speed_10m || 0,
        windDirection: apiResponse.current.wind_direction_10m ? degreesToDirection(apiResponse.current.wind_direction_10m) : 'N/A',
        rainfall: apiResponse.current.rain || 0
    };

    return result;
}