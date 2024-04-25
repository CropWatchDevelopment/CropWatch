import { redirect, type RequestHandler } from "@sveltejs/kit";

export const GET: RequestHandler = async ({ url, params, locals: { supabase, safeGetSession } }) => {
    const { session } = await safeGetSession();
    if (!session) {
      throw redirect(303, '/auth/unauthorized');
    }
  
    const dev_eui = params.dev_eui;
    const query = new URLSearchParams(url.search);
    const startingPage = query.get('page') || 0;
    const itemsPerPage = query.get('count') || 10;
  
    if (!dev_eui) {
      return new Response(
        JSON.stringify({ error: 'dev_eui is required' }),
        {
          status: 400,
        });
    }
  
    const { data, error } = await supabase
      .from('cw_rules')
      .select('*, cw_rule_criteria(*)')
      .eq('dev_eui', dev_eui)
      .order('created_at', { ascending: true })
      .range(+startingPage, +itemsPerPage)
      ;
    return new Response(
      JSON.stringify(data) ||
      error,
      {
        status: error ? 500 : 200,
      });
  }