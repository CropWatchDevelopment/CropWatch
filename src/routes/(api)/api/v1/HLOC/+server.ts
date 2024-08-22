import { error, redirect, type RequestHandler } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ request, params, locals: { supabase, safeGetSession } }) => {
    const session = await safeGetSession();
    if (!session.user) {
        throw redirect(303, '/auth/unauthorized');
    }

    const data = await request.json();

    const devEui = data.dev_eui;
    if (!devEui) {
        throw error(400, 'dev_eui is required');
    }

    const start_time = data.start_time;
    if (!start_time) {
        throw error(400, 'start_time is required');
    }
    const end_time = data.end_time;
    if (!end_time) {
        throw error(400, 'end_time is required');
    }
    const time_interval = data.time_interval;
    if (!time_interval) {
        throw error(400, 'time_interval is required');
    }
    const table_name = data.table_name;
    if (!table_name) {
        throw error(400, 'table_name is required');
    }

    const {data: response, error} = await supabase.rpc('get_hloc_data', {
        start_time: new Date(start_time).toISOString(),
        end_time: new Date(end_time).toISOString(),
        time_interval: time_interval,
        table_name: table_name,
        device_eui: devEui
    }).select();

    if (error) {
        throw error(500, 'Error fetching data');
    }

    
    return new Response(JSON.stringify(response), {
        headers: {
            'Content-Type': 'application/json'
        }
    });
}