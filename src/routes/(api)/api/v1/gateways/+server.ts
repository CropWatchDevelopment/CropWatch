import { redirect, type RequestHandler } from "@sveltejs/kit";

export const GET: RequestHandler = async ({ locals: { supabase } }) => {
    const { data, error } = await supabase
        .from('cw_gateways')
        .select('id, created_at, updated_at, isOnline, gateway_id');
    return new Response(
        data ? JSON.stringify(data) : null,
        {
          status: error ? 500 : 200,
          statusText: error ? error.message : 'OK',
          headers: {
            'Content-Type': 'application/json',
          }
        });
};