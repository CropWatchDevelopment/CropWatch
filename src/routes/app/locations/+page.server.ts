
/** @type {import('./$types').PageLoad} */
export async function load({ params, locals: { supabase, getSession } }) {
    let session = await getSession();
    return {
            locations: await supabase.from('cw_location_owners').select(`*, cw_locations(*)`).eq('user_id', session?.user.id),
            weatherJSON: await getWeatherAPIData(),
    };
}

async function getWeatherAPIData() {
    const weatherRequest = await fetch(
        'https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=32.1359004857804&lon=131.39106608149575'
    );
    const weatherJSON = weatherRequest.json();
    return weatherJSON;
}