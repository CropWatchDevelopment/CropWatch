import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { SessionService } from '$lib/services/SessionService';

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
  const sessionService = new SessionService(supabase);
  const { session, user } = await sessionService.getSafeSession();
  if (!session || !user) {
    throw redirect(302, '/auth/login');
  }
  return {};
};

export const actions: Actions = {
  createReport: async ({ request, locals: { supabase } }) => {
    const sessionService = new SessionService(supabase);
    const { session, user } = await sessionService.getSafeSession();
    if (!session || !user) {
      return fail(401, { success: false, error: 'Unauthorized' });
    }

    const formData = await request.formData();
    const name = formData.get('name') as string;
    const values = formData.getAll('values');
    const colors = formData.getAll('colors');
    const interval = Number(formData.get('interval'));
    const averaged = formData.get('averaged') === 'on';
    const weekly = formData.get('weekly') === 'on';
    const monthly = formData.get('monthly') === 'on';
    const recipients = formData.get('recipients') as string;

    if (!name) {
      return fail(400, { success: false, error: 'Name is required' });
    }

    const template = {
      values,
      colors,
      interval,
      averaged,
      weekly,
      monthly
    };

    const { error } = await supabase.from('reports_templates').insert({
      name,
      owner_id: user.id,
      recipients,
      template
    });

    if (error) {
      console.error('Failed to create report:', error.message);
      return { success: false, error: 'Failed to create report' };
    }

    return { success: true };
  }
};
