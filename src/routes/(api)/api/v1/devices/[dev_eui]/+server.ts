import { redirect, type RequestHandler } from "@sveltejs/kit";

export const GET: RequestHandler = async ({ url, params, locals: { supabase, safeGetSession } }) => {
  const { session } = await safeGetSession();
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