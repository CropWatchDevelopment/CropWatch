import { redirect, type RequestHandler } from "@sveltejs/kit";

export const GET: RequestHandler = async ({ url, params, locals: { supabase, safeGetSession } }) => {
  const { session } = await safeGetSession();
  if (!session) {
    throw redirect(303, '/auth/unauthorized');
  }

  const query = new URLSearchParams(url.search);
  const locationId = +(params.id ?? 0);
  const startingPage = query.get('pageNumber') || 0;
  const itemsPerPage = query.get('itemsPerPage') || 10;

  const { data, error } = await supabase
    .from('cw_device_locations')
    .select('*, cw_devices(*)')
    .eq('location_id', locationId)
    .range(+startingPage, +itemsPerPage)
    ;
  return new Response(
    JSON.stringify(data) ||
    JSON.stringify(error),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      }
    });
}