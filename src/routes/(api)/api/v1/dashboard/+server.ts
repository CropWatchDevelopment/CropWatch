import { redirect, type RequestHandler } from "@sveltejs/kit";
import moment from "moment";

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
                const secondaryData = dil.cw_devices.cw_device_type.secondary_data;

                const queryString = `created_at, ${primaryData}${(secondaryData != null && secondaryData != '') ? ',' + secondaryData : ''}`;
                const { data, error } = await supabase
                    .from(data_table)
                    .select(queryString)
                    .eq('dev_eui', dil.cw_devices.dev_eui)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();

                if (error) {
                    console.error(error);
                    continue;
                }
                if (data) {
                    dil.cw_devices.primary_data = data[primaryData];
                    dil.cw_devices.primary_data_notation = dil.cw_devices.cw_device_type.primary_data_notation;
                    dil.cw_devices.secondary_data = data[secondaryData];
                    dil.cw_devices.secondary_data_notation = dil.cw_devices.cw_device_type.secondary_data_notation;
                    dil.cw_devices.isPastDue = (dil.cw_devices.upload_interval && moment().diff(moment(data.created_at), 'minutes') > dil.cw_devices.upload_interval) ? false : true;
                }

                dashboardResponse.push({
                    lastReceived: data.created_at,
                    sensorName: dil.cw_devices.name,
                    devices: devicesInLocation,
                    locationName: locationItem.cw_locations.name,
                    lat: locationItem.cw_locations.latitude,
                    lng: locationItem.cw_locations.longitude,

                });
            }
        }

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
