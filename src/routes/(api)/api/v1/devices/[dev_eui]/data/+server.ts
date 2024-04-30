import { redirect, type RequestHandler } from "@sveltejs/kit";

export const GET: RequestHandler = async ({ url, params, locals: { supabase, safeGetSession } }) => {
  const { session } = await safeGetSession();
  if (!session) {
    throw redirect(303, '/auth/unauthorized');
  }

  const dev_eui = params.dev_eui;
  const query = new URLSearchParams(url.search);
  const startingPage = query.get('page') || 0;
  const itemsPerPage = query.get('count') || 10;

  if (!dev_eui) {
    return new Response(
      JSON.stringify({ error: 'dev_eui is required' }),
      {
        status: 400,
      });
  }

  let deviceType = await getDeviceDataTable(dev_eui, session, supabase);

  const { data, error } = await supabase
    .from(deviceType.data_table)
    .select('*')
    .eq('dev_eui', dev_eui)
    .order('created_at', { ascending: true })
    .range(+startingPage, +itemsPerPage)
    .limit(1)
    .single();

  if (data) {
    data.primaryData = deviceType.primary_data;
    data.secondaryData = deviceType.secondary_data;
    data.primary_data_notation = deviceType.primary_data_notation;
    data.secondary_data_notation = deviceType.secondary_data_notation;
  }

  return new Response(
    JSON.stringify(data) ||
    error,
    {
      status: error ? 500 : 200,
      statusText: 'OK',
      headers: {
        'Content-Type': 'application/json',
      }
    });
}

async function getDeviceDataTable(dev_eui: string, session: any, supabase: any) {
  try {
    const { data, error } = await supabase
      .from('cw_device_owners')
      .select('*, cw_devices(*, cw_device_type(*))')
      .eq('user_id', session.user.id)
      .eq('dev_eui', dev_eui)
      .limit(1)
      .single()
      ;
    if (error) {
      return null;
    } else {
      return data.cw_devices.cw_device_type;
    }
  } catch (error) {
    return new Response(
      JSON.stringify(error),
      {
        status: 500,
        statusText: 'Server Error',
        headers: {
          'Content-Type': 'application/json',
        }
      });
  }
}