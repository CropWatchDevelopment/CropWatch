import type { RequestHandler } from '@sveltejs/kit';
import { error, redirect } from '@sveltejs/kit';
import type { Tables } from '$lib/types/supabaseSchema';
import CwRulesService from '$lib/services/CwRulesService';

type cwRules = Tables<'cw_rules'>;


export const GET: RequestHandler = async ({ url, params, locals: { supabase, safeGetSession } }) => {
  const session = await safeGetSession();
  if (!session.user) {
    return redirect(301, '/auth/unauthorized');
  }

  const devEui = params.dev_eui;
  if(!devEui) {
    throw error(400, 'No Dev_Eui provided');
  }

  const cwRulesService = new CwRulesService(supabase);
  const cwRules = await cwRulesService.getByDevEui(devEui);

  if (!cwRules) {
    throw error(500, 'Error fetching locations');
  }

  return new Response(JSON.stringify(cwRules), {
    headers: {
      'Content-Type': 'application/json'
    }
  });
};
