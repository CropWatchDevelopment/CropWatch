
/** @type {import('./$types').PageLoad} */
export async function load({ params, locals: { supabase, getSession } }) {
    let session = await getSession();
    let {data, error} = await supabase.from('cw_location_owners').select(`cw_locations(*)`).eq('user_id', session?.user.id)
    console.log(data, error)
    return {
            locations: data,
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




/*
RLS:

CREATE POLICY user_owns_location
ON public.cw_locations
FOR SELECT
USING (
    EXISTS (
        SELECT 1
        FROM public.cw_location_owners
        WHERE
            public.cw_location_owners.location_id = public.cw_locations.location_id
            AND public.cw_location_owners.user_id = auth.uid() -- Replace `current_user_id()` with your method of obtaining the current user's ID, often `auth.uid()`
            AND public.cw_location_owners.is_active = true
    )
);





*/