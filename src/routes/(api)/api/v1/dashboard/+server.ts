import { redirect, type RequestHandler } from "@sveltejs/kit";

export const GET: RequestHandler = async ({ url, fetch, locals: { supabase, safeGetSession } }) => {
    const { session } = await safeGetSession();
    if (!session) {
        throw redirect(303, '/auth/unauthorized');
    }

    const { data, error } = await supabase
        .from('cw_location_owners')
        .select('*, cw_locations(*, cw_device_locations(*, cw_devices(*, cw_device_type(*))))')
        .eq('user_id', session.user.id)

    if (data) {
        let dashboardResponse: any[] = [];
        // data.forEach(async locationItem => {
        for (let locationItem of data) {
            const devicesInLocation = locationItem.cw_locations.cw_device_locations;
            for (let dil of devicesInLocation) {
                const data_table = dil.cw_devices.cw_device_type.data_table;
                const primaryData = dil.cw_devices.cw_device_type.primary_data;

                const { data, error } = await supabase
                    .from(data_table)
                    .select(`created_at, ${primaryData}`)
                    .limit(1)
                    .single();

                dashboardResponse.push({
                    lastReceived: data.created_at,
                    sensorName: dil.cw_devices.name,
                    sensorPrimaryData: data,
                    sensorSecondaryData: null,
                    locationName: locationItem.cw_locations.name,
                })

                console.log(data, error);
            }
        }
        console.log(dashboardResponse)
        return new Response(JSON.stringify(dashboardResponse),
            {
                status: 200,
                statusText: 'OK',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
    }
}
