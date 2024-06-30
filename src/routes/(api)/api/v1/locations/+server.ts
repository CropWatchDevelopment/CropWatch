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
    .from('cw_location_owners')
    .select('*, cw_locations(*,cw_device_locations(dev_eui))')
    .eq('user_id', session.user.id)
    .range(+startingPage, +itemsPerPage)
    ;
  return new Response(
    JSON.stringify(data || error),
    {
      status: data ? 200 : 500,
      statusText: 'OK',
      headers: {
        'Content-Type': 'application/json',
      }
    });
}

export const POST: RequestHandler = async ({ url, request, locals: { supabase, getSession } }) => {
  const session = await getSession();
  if (!session) {
    throw redirect(303, '/auth/unauthorized');
  }

  const query = await request.json();
  const latitude = query.latitude || -1;
  const longitude = query.longitude || -1;
  const name = query.name;

  if (!name || (latitude === -1 && longitude === -1)) {
    return new Response(
      JSON.stringify({ error: 'Name is required' }),
      {
        status: 400,
        statusText: 'Bad Request',
        headers: {
          'Content-Type': 'application/json',
        }
      });
  }

  const { data, error } = await supabase
    .from('cw_locations')
    .insert([{
      name,
      latitude,
      longitude,
      owner_id: session.user.id,
    }])
    .select();

  if (error) {
    return new Response(
      JSON.stringify(error),
      {
        status: 500,
        statusText: 'Internal Server Error',
        headers: {
          'Content-Type': 'application/json',
        }
      });
  }

    return redirect(303, `/api/v1/locations/${data[0].location_id}`);
}