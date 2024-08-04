import { redirect, type RequestHandler } from "@sveltejs/kit";

export const GET: RequestHandler = async ({ url, locals: { supabase, getSession } }) => {
  const session = await getSession();
  if (!session) {
    throw redirect(303, '/auth/unauthorized');
  }

  const query = new URLSearchParams(url.search);
  const startingPage = query.get('pageNumber') || 0;
  const itemsPerPage = query.get('itemsPerPage') || 50;

  const { data, error } = await supabase
    .from('cw_device_owners')
    .select('*, cw_devices(*, cw_device_type(*), cw_device_locations(*, cw_locations(*)))')
    .eq('user_id', session.user.id)
    .range(+startingPage, +itemsPerPage)
    ;
  return new Response(
    JSON.stringify(data) || JSON.stringify(error),
    {
      status: data ? 200 : 500,
    });
}

export const POST: RequestHandler = async ({ url, fetch, request, locals: { supabase, getSession } }) => {
  const session = await getSession();
  if (!session) {
    throw redirect(303, '/auth/unauthorized');
  }

  const formData = await request.formData();
  const data = Object.fromEntries(formData);
  const dev_eui = data.dev_eui.toString().split(':').join('');

  const { data: deviceData, error: deviceError } = await supabase
    .from('cw_devices')
    .insert({
      dev_eui: dev_eui,
      name: data.name.toString(),
      type: +data.type.toString(),
      upload_interval: +data.upload_interval.toString(),
      lat: +data.lat.toString(),
      long: +data.long.toString(),
      installed_at: new Date(),
      user_id: session.user.id,
    });

    if (deviceError) {
      return new Response(
        JSON.stringify(deviceError),
        {
          status: 400,
        });
    }

  const { data: ownerData, error: ownerError } = await supabase
    .from('cw_device_owners')
    .insert({
      user_id: session.user.id,
      dev_eui: dev_eui,
    })
    .select()
    .single()
    ;
  
  if (ownerError) {
    return new Response(
      JSON.stringify(ownerError),
      {
        status: 400,
      });
  }

  const { data: locationData, error: locationError } = await supabase
    .from('cw_device_locations')
    .insert({
      dev_eui: dev_eui,
      location_id: data.location_id,
    })
    .select()
    .single()
    ;

    if (locationError) {
      return new Response(
        JSON.stringify(locationError),
        {
          status: 400,
        });
    }


  return new Response(
    JSON.stringify(deviceData),
    {
      status: 200,
    });
}

export const PUT: RequestHandler = async ({ params, request, locals: { supabase, getSession } }) => {
  console.log('p0ut')
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
      statusText: updatedData ?? updateError,
      headers: {
        'Content-Type': 'application/json',
      }
    });
}