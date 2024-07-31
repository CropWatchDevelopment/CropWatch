import { redirect, type RequestHandler } from "@sveltejs/kit";
import moment from "moment";

export const GET: RequestHandler = async ({ url, params, locals: { supabase, getSession } }) => {
  const session = await getSession();
  if (!session) {
    throw redirect(303, '/auth/unauthorized');
  }

  const dev_eui = params.dev_eui;
  const query = new URLSearchParams(url.search);
  const startingPage = parseInt(query.get('page') || '0');
  const itemsPerPage = parseInt(query.get('count') || '144');
  const from = query.get('from');
  const to = query.get('to');
  const dataPoints = query.get('data-points');
  const noLimit = query.get('noLimit') === '1';  // Ensure noLimit is parsed correctly
  const csv = query.get('csv');

  if (!dev_eui) {
    return new Response(
      JSON.stringify({ error: 'dev_eui is required' }),
      {
        status: 400,
      });
  }

  let deviceType = await getDeviceDataTable(dev_eui, session, supabase);
  let baseQuery = supabase
    .from(deviceType.data_table)
    .select(dataPoints ?? '*')
    .eq('dev_eui', dev_eui)
    .order('created_at', { ascending: false })

  if (from) {
    baseQuery = baseQuery.gte('created_at', moment(from).utc().toISOString());
  }
  if (to) {
    baseQuery = baseQuery.lte('created_at', moment(to).utc().toISOString());
  }

  if (!noLimit) {
    baseQuery.range(startingPage, startingPage + itemsPerPage - 1);
  }

  // Conditionally apply `.single()` if itemsPerPage is 1
  let finalQuery = itemsPerPage === 1 ? baseQuery.maybeSingle() : baseQuery;

  finalQuery = csv ? finalQuery.csv() : finalQuery;

  const { data, error } = await finalQuery;

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 404,
        headers: {
          'Content-Type': csv ? 'application/csv' : 'application/json',
        }
      });
  }

  if (data && !csv) {
    data.primaryData = deviceType.primary_data;
    data.secondaryData = deviceType.secondary_data;
    data.primary_data_notation = deviceType.primary_data_notation;
    data.secondary_data_notation = deviceType.secondary_data_notation;
    data.data_table = deviceType.data_table;
    data.primary_multiplier = +deviceType.primary_multiplier;
    data.secondary_multiplier = +deviceType.secondary_multiplier;
    data.primary_divider = +deviceType.primary_divider;
    data.secondary_divider = +deviceType.secondary_divider;
  }

  return new Response(
    data ? (csv ? data : JSON.stringify(data)) : error,
    {
      status: data ? 200 : 404,
      headers: {
        'Content-Type': 'application/json',
      }
    });
};

async function getDeviceDataTable(dev_eui: string, session: any, supabase: any) {
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
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        }
      });
  }
}
