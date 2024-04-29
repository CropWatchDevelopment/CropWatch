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
    .from('cw_device_locations')
    .select('*, cw_devices(*)')
    .eq('id', url.searchParams.get('id'))
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