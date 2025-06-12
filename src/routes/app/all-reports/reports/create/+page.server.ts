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
    const templateStr = formData.get('template') as string;
    const template = templateStr ? JSON.parse(templateStr) : {};

    if (!name) {
      return fail(400, { success: false, error: 'Name is required' });
    }

    const repo = new ReportTemplateRepository(supabase, new ErrorHandlingService());
    const service = new ReportTemplateService(repo);

    await service.createReport({ name, owner_id: user.id, template } as any);

    return { success: true };
  }
};
