import { redirect, type RequestHandler } from "@sveltejs/kit";

export const GET: RequestHandler = async ({ url, locals: { supabase, safeGetSession } }) => {
  const { session } = await safeGetSession();
  if (!session) {
    throw redirect(303, '/auth/unauthorized');
  }

  const query = new URLSearchParams(url.search);
  const startingPage = query.get('pageNumber') || 0;
  const itemsPerPage = query.get('itemsPerPage') || 10;

  const { data, error } = await supabase
    .from('cw_location_owners')
    .select('*, cw_locations(*)')
    .eq('user_id', session.user.id)
    .range(+startingPage, +itemsPerPage)
    ;
  return new Response(
    JSON.stringify(data) ||
    error,
    {
      status: 200,
      statusText: 'OK',
      headers: {
        'Content-Type': 'application/json',
      }
    });
}

export const POST: RequestHandler = async ({ url, request, locals: { supabase, safeGetSession } }) => {
  const { session } = await safeGetSession();
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

  const { data: permsData, error: permsError } = await supabase
    .from('cw_location_owners')
    .insert([{
      user_id: session.user.id,
      location_id: data[0].location_id,
      is_active: true
    }]);

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

  // return new Response(
  //   JSON.stringify(data) ||
  //   JSON.stringify(permsError),
  //   {
  //     status: permsError ? 500 : 200,
  //     statusText: permsError ? 'Internal Server Error' : 'OK',
  //     headers: {
  //       'Content-Type': 'application/json',
  //     }
  //   });
}