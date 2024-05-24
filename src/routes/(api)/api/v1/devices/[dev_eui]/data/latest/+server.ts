import { SensorDtoSelector } from "$lib/sensor-dto/sensorDtoSelector";
import { redirect, type RequestHandler } from "@sveltejs/kit";

export const GET: RequestHandler = async ({ url, params, locals: { supabase, safeGetSession } }) => {
    try {
        const { session } = await safeGetSession();
        if (!session) {
            throw redirect(303, '/auth/unauthorized');
        }

        const dev_eui = params.dev_eui;

        if (!dev_eui) {
            return new Response(
                JSON.stringify({ error: 'dev_eui is required' }),
                {
                    status: 400,
                    headers: {
                        'Content-Type': 'application/json',
                    }
                }
            );
        }

        let deviceType = await getDeviceDataTable(dev_eui, session, supabase);
        if (!deviceType) {
            return new Response(
                JSON.stringify({ error: 'Device type not found' }),
                {
                    status: 404,
                    headers: {
                        'Content-Type': 'application/json',
                    }
                }
            );
        }

        let { data, error } = await supabase
            .from(deviceType.data_table)
            .select('*')
            .eq('dev_eui', dev_eui)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (error) {
            return new Response(
                null,
                {
                    status: 500,
                    headers: {
                        'Content-Type': 'application/json',
                    }
                }
            );
        }

        if (!data) {
            return new Response(
                JSON.stringify({ error: 'No data found' }),
                {
                    status: 404,
                    headers: {
                        'Content-Type': 'application/json',
                    }
                }
            );
        }

        const formatted = SensorDtoSelector(deviceType.data_table, data);
        const formattedData = {
            ...formatted,
        };

        return new Response(
            JSON.stringify(formattedData),
            {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                }
            }
        );

    } catch (error) {
        console.error('Error in GET handler:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                }
            }
        );
    }
};

async function getDeviceDataTable(dev_eui, session, supabase) {
    try {
        const { data, error } = await supabase
            .from('cw_device_owners')
            .select('*, cw_devices(*, cw_device_type(*))')
            .eq('user_id', session.user.id)
            .eq('dev_eui', dev_eui)
            .limit(1)
            .single();
        if (error) {
            throw new Error(error.message);
        }
        return data.cw_devices.cw_device_type;
    } catch (error) {
        if (error.name === 'AbortError') {
            console.error('Request timed out');
        } else {
            console.error('Error fetching weather data:', error);
        }
        return null;
    }
}
