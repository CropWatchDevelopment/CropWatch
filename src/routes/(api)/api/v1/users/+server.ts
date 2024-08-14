import type { RequestHandler } from '@sveltejs/kit';
import { error, redirect } from '@sveltejs/kit';
import type { Tables } from '$lib/types/supabaseSchema';
import CwGatewaysService from '$lib/services/CwGatewaysService';

type CwGateways = Tables<'cw_gateways'>;


export const GET: RequestHandler = async ({ url, locals: { supabase, safeGetSession } }) => {
  const session = await safeGetSession();
  if (!session.user) {
    return redirect(301, '/auth/unauthorized');
  }

  const cwLocationsService = new CwGatewaysService(supabase);

  // Fetch main data
  const cwGateways: CwGateways[] = await cwLocationsService.getAll();

  if (!cwGateways) {
    throw error(500, 'Error fetching locations');
  }

  return new Response(JSON.stringify(cwGateways), {
    headers: {
      'Content-Type': 'application/json'
    }
  });
};
