import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { SessionService } from '$lib/services/SessionService';
import { ErrorHandlingService } from '$lib/errors/ErrorHandlingService';
import { ReportTemplateRepository } from '$lib/repositories/ReportTemplateRepository';
import { ReportTemplateService } from '$lib/services/ReportTemplateService';

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
  const sessionService = new SessionService(supabase);
  const { session, user } = await sessionService.getSafeSession();
  if (!session || !user) {
    throw redirect(302, '/auth/login');
  }

  const repo = new ReportTemplateRepository(supabase, new ErrorHandlingService());
  const service = new ReportTemplateService(repo);
  const reports = await service.getUserReports(user.id);

  return { reports };
};

export const actions: Actions = {
  delete: async ({ request, locals: { supabase } }) => {
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

    const repo = new ReportTemplateRepository(supabase, new ErrorHandlingService());
    const service = new ReportTemplateService(repo);
    await service.deleteReport(id);
    return { success: true };
  }
};
