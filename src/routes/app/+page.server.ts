import { redirect } from "@sveltejs/kit";


/** @type {import('./$types').PageLoad} */
export async function load({ params, fetch, locals: { supabase, safeGetSession } }) {
    let session = await safeGetSession();
    console.log(session)
    if (!session) throw redirect(304, '/auth/login');
    const user_id = session?.user.id;

    // console.log(data, error)
    // const locationsRequest = await fetch(`/api/v1/dashboard`);
    const locationsRequest = await fetch(`/api/v1/locations`);
    const locationsData = await locationsRequest.json();
    const locations = await updateLocations(locationsData, supabase, user_id);

    for(var location of locations){
        location.weatherJSON = await getWeatherAPIData(location.cw_locations.latitude, location.cw_locations.longitude);
    }

    return {
        locations: locations,
        // weatherJSON: await getWeatherAPIData(),
        // sensor: await supabase.from('cw_ss_tmepnpk').select('*').eq('dev_eui', params.sensor_eui).order('created_at', { ascending: false }).limit(100),
    };
}

async function updateLocations(locations, supabase, user_id) {
    for (var location of locations) {
        const weatherJSON = await getWeatherAPIData(location.lat, location.lng);
        location.weatherJSON = weatherJSON
    }
    return locations
}

async function getWeatherAPIData(lat: number, lng: number) {
    try {
        const weatherRequest = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,is_day,rain,cloud_cover,surface_pressure,wind_speed_10m,wind_direction_10m&hourly=temperature_2m&daily=uv_index_max`,
        );
        const weatherJSON = await weatherRequest.json();
        const result = convertApiResponseToResultIncludingLux(weatherJSON);
        return result;
    } catch (error) {

    }
}


function convertApiResponseToResultIncludingLux(apiResponse) {
    // Helper function to convert wind direction from degrees to cardinal directions
    const degreesToDirection = (deg: number) => {
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
    const cloudCoverToLux = (cloudCover: number) => {
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



// /*
// RLS:

// CREATE POLICY user_owns_location
// ON public.cw_locations
// FOR SELECT
// USING (
//     EXISTS (
//         SELECT 1
//         FROM public.cw_location_owners
//         WHERE
//             public.cw_location_owners.location_id = public.cw_locations.location_id
//             AND public.cw_location_owners.user_id = auth.uid() -- Replace `current_user_id()` with your method of obtaining the current user's ID, often `auth.uid()`
//             AND public.cw_location_owners.is_active = true
//     )
// );





// */