import { redirect, type RequestHandler } from "@sveltejs/kit";

export const GET: RequestHandler = async ({ url, params, locals: { supabase, getSession } }) => {
  const session = await getSession();
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

export const POST: RequestHandler = async ({ url, params, request, locals: { supabase, getSession } }) => {
  const session = await getSession();
  if (!session) {
    throw redirect(303, '/auth/unauthorized');
  }
  const formData = await request.formData();
  const formObject = JSON.parse(JSON.stringify(Object.fromEntries(formData)));
  formObject['profile_id'] = session.user.id;

  const { data, error } = await supabase
    .from('cw_rules')
    .insert(formObject)
    .select()

  return new Response(
    data ?? error,
    {
      status: 200,
    });
}

export const PUT: RequestHandler = async ({ url, params, request, locals: { supabase, getSession } }) => {
  const session = await getSession();
  if (!session) {
    throw redirect(303, '/auth/unauthorized');
  }
  const formData = await request.formData();
  const formObject = JSON.parse(JSON.stringify(Object.fromEntries(formData)));

  const { data, error } = await supabase
    .from('cw_rules')
    .update(formObject)
    .eq('ruleGroupId', formObject.ruleGroupId)
    .select()

  return new Response(
    data ?? error,
    {
      status: 200,
      statusText: 'OK',
    });
}

export const DELETE: RequestHandler = async ({ url, params, request, locals: { supabase, getSession } }) => {
  const session = await getSession();
  if (!session) {
    throw redirect(303, '/auth/unauthorized');
  }
  const id = url.searchParams.get('rule-id');
  const { data, error } = await supabase
    .from('cw_rules')
    .delete()
    .eq('id', id)
    .eq('profile_id', session.user.id)
    .select()

  return new Response(
    data ?? error,
    {
      status: 200,
      statusText: 'OK',
    });
}