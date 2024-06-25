import { redirect, type RequestHandler } from "@sveltejs/kit";

export const GET: RequestHandler = async ({ url, params, locals: { supabase, getSession } }) => {
  const session = await getSession();
  if (!session) {
    throw redirect(303, '/auth/unauthorized');
  }

  const dev_eui = params.dev_eui;

  if (!dev_eui) {
    return new Response(
      JSON.stringify({ error: 'dev_eui is required' }),
      {
        status: 400,
      });
  }

  let baseQuery = supabase
    .from('cw_devices')
    .select('name, cw_device_type(data_table, name)')
    .eq('dev_eui', dev_eui)
    .limit(1)
    .single();
    const { data, error } = await baseQuery;

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        }
      });
  }

  return new Response(
    JSON.stringify(data || { error: 'No data found' }),
    {
      status: data ? 200 : 404,
      headers: {
        'Content-Type': 'application/json',
      }
    });
}