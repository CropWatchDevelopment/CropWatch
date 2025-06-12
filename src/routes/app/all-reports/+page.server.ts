import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { SessionService } from '$lib/services/SessionService';

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
  const sessionService = new SessionService(supabase);
  const { session, user } = await sessionService.getSafeSession();

  if (!session || !user) {
    throw redirect(302, '/auth/login');
  }

  const { data: reports, error } = await supabase
    .from('reports_templates')
    .select('*')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching reports:', error.message);
  }

  return {
    reports: reports || [],
    userId: user.id
  };
};

export const actions: Actions = {
  updateReport: async ({ request, locals: { supabase } }) => {
    const sessionService = new SessionService(supabase);
    const { session, user } = await sessionService.getSafeSession();
    if (!session || !user) {
      return fail(401, { success: false, error: 'Unauthorized' });
    }

    const data = await request.formData();
    const id = Number(data.get('id'));
    const name = data.get('name') as string;

    if (!id || !name) {
      return fail(400, { success: false, error: 'Missing id or name' });
    }

    const { error } = await supabase
      .from('reports_templates')
      .update({ name })
      .eq('id', id)
      .eq('owner_id', user.id);

    if (error) {
      console.error('Failed to update report:', error.message);
      return { success: false, error: 'Failed to update report' };
    }

    return { success: true };
  },
  deleteReport: async ({ request, locals: { supabase } }) => {
    const sessionService = new SessionService(supabase);
    const { session, user } = await sessionService.getSafeSession();
    if (!session || !user) {
      return fail(401, { success: false, error: 'Unauthorized' });
    }

    const data = await request.formData();
    const id = Number(data.get('id'));

    if (!id) {
      return fail(400, { success: false, error: 'Missing id' });
    }

    const { error } = await supabase
      .from('reports_templates')
      .delete()
      .eq('id', id)
      .eq('owner_id', user.id);

    if (error) {
      console.error('Failed to delete report:', error.message);
      return { success: false, error: 'Failed to delete report' };
    }

    return { success: true };
  }
};
