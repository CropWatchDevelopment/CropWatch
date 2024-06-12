import { redirect, type RequestHandler } from "@sveltejs/kit";

export const GET: RequestHandler = async ({ url, params, locals: { supabase, getSession } }) => {
  const session = await getSession();
  if (!session) {
    throw redirect(303, '/auth/unauthorized');
  }

  const dev_eui = params.dev_eui;
  const query = new URLSearchParams(url.search);
  const startingPage = query.get('pageNumber') || 0;
  const itemsPerPage = query.get('itemsPerPage') || 10;

  const { data, error } = await supabase
    .from('cw_device_owners')
    .select('*, cw_devices(*, cw_device_type(*), cw_device_locations(*, cw_locations(*)))')
    .eq('user_id', session.user.id)
    .eq('dev_eui', dev_eui)
    .range(+startingPage, +itemsPerPage)
    ;
  return new Response(
    JSON.stringify(data) ||
    error,
    {
      status: error ? 500 : 200,
    });
}


export const PUT: RequestHandler = async ({ params, request, locals: { supabase, getSession } }) => {
  const session = await getSession();
  if (!session) {
    throw redirect(303, '/auth/unauthorized');
  }

  const body = new URLSearchParams(await request.json());
  const name = body.get('name');


  if (!name) {
    return new Response(
      JSON.stringify({ error: 'name is required' }),
      {
        status: 400,
      });
  }

  const dev_eui = params.dev_eui;
  if (!dev_eui) {
    return new Response(
      JSON.stringify({ error: 'location_id is required' }),
      {
        status: 400,
      });
  }
  const { data, error } = await supabase
    .from('cw_device_owners')
    .select('*, cw_devices(*)')
    .eq('dev_eui', dev_eui)
    .eq('user_id', session.user.id)
    .limit(1)
    .single();

  if (error) {
    return new Response(
      JSON.stringify(error),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        }
      });
  }

  const { data: updatedData, error: updateError } = await supabase
    .from('cw_devices')
    .update({ 'name': name })
    .eq('dev_eui', data.cw_devices.dev_eui)
    .select()
    .single();

  return new Response(
    JSON.stringify(updatedData) ||
    JSON.stringify(updateError),
    {
      status: updatedData ? 200 : 500,
      statusText: updatedData ? 'OK' : updateError,
      headers: {
        'Content-Type': 'application/json',
      }
    });
}