import { dev } from "$app/environment";
import { redirect, type RequestHandler } from "@sveltejs/kit";
import moment from 'moment';

export const GET: RequestHandler = async ({ url, locals: { supabase, safeGetSession } }) => {
    const { session } = await safeGetSession();
    if (!session) {
      throw redirect(303, '/auth/unauthorized');
    }
    
    const query = new URLSearchParams(url.search);
    const dev_eui = query.get('dev_eui');
    const from = moment.utc(query.get('from') ?? moment.utc().subtract(1, 'day').toISOString()).toISOString();
    const to = moment.utc(query.get('to') ?? new Date()).toISOString();
    const startingPage = query.get('pageNumber') || 0;
    const itemsPerPage = query.get('itemsPerPage') || 10;

    if(dev_eui === null || dev_eui === undefined) {
        return new Response(JSON.stringify({ error: "No device EUI provided" }), { status: 400 });
    }

    const { data, error } = await supabase
            .from(query.get('deviceType'))
            .select('*')
            .eq('dev_eui', dev_eui)
            .gte('created_at', from)
            .lte('created_at', to)
            .range(startingPage, itemsPerPage)
            .order('created_at', { ascending: false })
            ;
    return new Response(JSON.stringify(data) ?? error, { status: 200 });
}