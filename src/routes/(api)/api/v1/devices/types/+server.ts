import { redirect, type RequestHandler } from "@sveltejs/kit";

export const GET: RequestHandler = async ({ url, locals: { supabase, getSession } }) => {
  const session = await getSession();
  if (!session) {
    throw redirect(303, '/auth/unauthorized');
  }

  const { data, error } = await supabase
    .from('cw_device_type')
    .select('*');
  return new Response(
    JSON.stringify(data) ||
    JSON.stringify(error),
    {
      status: data ? 200 : 500,
    });
}

