import type { RequestHandler } from '@sveltejs/kit';
import { error, redirect } from '@sveltejs/kit';
import CwRulesService from '$lib/services/CwRulesService';

export const GET: RequestHandler = async ({ url, locals: { supabase, safeGetSession } }) => {
  const session = await safeGetSession();
  if (!session.user) {
    throw redirect(303, '/auth/unauthorized');
  }

  const cwRulesService = new CwRulesService(supabase);
  const activeAlerts = await cwRulesService.getAll();
  const result = activeAlerts.filter((alert) => (alert.action_recipient.includes(session.user.email) && alert.is_triggered));

  return new Response(JSON.stringify(result), {
    headers: {
      'Content-Type': 'application/json'
    }
  });
};
