import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { SessionService } from '$lib/services/SessionService';
import { ErrorHandlingService } from '$lib/errors/ErrorHandlingService';
import { ReportTemplateRepository } from '$lib/repositories/ReportTemplateRepository';
import { ReportTemplateService } from '$lib/services/ReportTemplateService';

export const load: PageServerLoad = async ({ params, locals: { supabase } }) => {
  const sessionService = new SessionService(supabase);
  const { session, user } = await sessionService.getSafeSession();
  if (!session || !user) {
    throw redirect(302, '/auth/login');
  }

  const repo = new ReportTemplateRepository(supabase, new ErrorHandlingService());
  const service = new ReportTemplateService(repo);
  const id = Number(params.id);
  const report = await service.getReport(id);

  if (!report || report.owner_id !== user.id) {
    throw redirect(302, '/app/all-reports');
  }

  return { report };
};
