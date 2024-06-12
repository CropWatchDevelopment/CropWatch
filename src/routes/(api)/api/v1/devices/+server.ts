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
    JSON.stringify(data) ||
    error,
    {
      status: 200,
    });
}

export const POST: RequestHandler = async ({ url, request, locals: { supabase, getSession } }) => {
  const session = await getSession();
  if (!session) {
    throw redirect(303, '/auth/unauthorized');
  }

  const formData = await request.formData();
  const data = Object.fromEntries(formData);

  const { data: deviceData, error: deviceError } = await supabase
    .from('cw_devices')
    .insert({
      dev_eui: data.dev_eui,
      name: data.name,
      type: data.type,
      upload_interval: data.upload_interval,
      lat: data.lat,
      long: data.long,
      installed_at: new Date()
    })
    .select()
    .single()
    ;

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
      dev_eui: deviceData.dev_eui,
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
      dev_eui: deviceData.dev_eui,
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