import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { SessionService } from '$lib/services/SessionService';
import { ErrorHandlingService } from '$lib/errors/ErrorHandlingService';
import { ReportTemplateRepository } from '$lib/repositories/ReportTemplateRepository';
import { ReportTemplateService } from '$lib/services/ReportTemplateService';
import { ReportService } from '$lib/services/ReportService';
import { ReportAlertPointRepository } from '$lib/repositories/ReportAlertPointRepository';
import { ReportRecipientRepository } from '$lib/repositories/ReportRecipientRepository';
import { ReportUserScheduleRepository } from '$lib/repositories/ReportUserScheduleRepository';
import { ReportRepository } from '$lib/repositories/ReportRepository';

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	const sessionService = new SessionService(supabase);
	const { session, user } = await sessionService.getSafeSession();
	if (!session || !user) {
		throw redirect(302, '/auth/login');
	}

	const reportRepository = new ReportRepository(supabase, new ErrorHandlingService());
	const reportTemplateRepository = new ReportTemplateRepository(
		supabase,
		new ErrorHandlingService()
	);
	const repo = new ReportTemplateRepository(supabase, new ErrorHandlingService());
	const reportAlertPointRepository = new ReportAlertPointRepository(
		supabase,
		new ErrorHandlingService()
	);
	const recipientRepository = new ReportRecipientRepository(supabase, new ErrorHandlingService());
	const reportUserScheduleRepository = new ReportUserScheduleRepository(
		supabase,
		new ErrorHandlingService()
	);
	const reportService = new ReportService(
		reportRepository,
		reportAlertPointRepository,
		recipientRepository,
		reportUserScheduleRepository
	);
	const service = new ReportTemplateService(repo);
	const reports = await service.getUserReports(user.id);

	const allReports = await reportService.getAllReports(user.id);

	return { allReports };
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
