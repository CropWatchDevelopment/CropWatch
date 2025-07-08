import type { PageServerLoad, Actions } from './$types';
import { ReportService } from '$lib/services/ReportService';
import { ReportRepository } from '$lib/repositories/ReportRepository';
import { ReportAlertPointRepository } from '$lib/repositories/ReportAlertPointRepository';
import { ReportRecipientRepository } from '$lib/repositories/ReportRecipientRepository';
import { ReportUserScheduleRepository } from '$lib/repositories/ReportUserScheduleRepository';
import { ErrorHandlingService } from '$lib/errors/ErrorHandlingService';
import { error, fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, locals }) => {
	try {
		const devEui = params.devEui;

		if (!devEui) {
			throw error(400, 'Device EUI is required');
		}

		// Check if user is authenticated
		const session = locals.session;
		if (!session) {
			throw error(401, 'Authentication required');
		}

		// Create service dependencies
		const errorHandler = new ErrorHandlingService();
		const reportRepo = new ReportRepository(locals.supabase, errorHandler);
		const alertPointRepo = new ReportAlertPointRepository(locals.supabase, errorHandler);
		const recipientRepo = new ReportRecipientRepository(locals.supabase, errorHandler);
		const scheduleRepo = new ReportUserScheduleRepository(locals.supabase, errorHandler);

		// Create report service
		const reportService = new ReportService(
			reportRepo,
			alertPointRepo,
			recipientRepo,
			scheduleRepo
		);

		// Load reports for the device
		const reports = await reportService.getReportsWithDetailsByDeviceEui(devEui);
		const reportCount = await reportService.countReportsByDeviceEui(devEui);

		return {
			devEui,
			reports,
			reportCount
		};
	} catch (err) {
		console.error('Error loading reports:', err);

		if (err instanceof Error && 'status' in err) {
			throw err; // Re-throw SvelteKit errors
		}

		throw error(500, 'Failed to load reports');
	}
};

export const actions: Actions = {
	createReport: async ({ request, locals, params }) => {
		try {
			const devEui = params.devEui;

			if (!devEui) {
				return fail(400, { success: false, error: 'Device EUI is required' });
			}

			// Check if user is authenticated
			const session = locals.session;
			if (!session) {
				return fail(401, { success: false, error: 'Authentication required' });
			}

			const formData = await request.formData();
			const name = formData.get('name') as string;

			if (!name) {
				return fail(400, { success: false, error: 'Report name is required' });
			}

			// Create service dependencies
			const errorHandler = new ErrorHandlingService();
			const reportRepo = new ReportRepository(locals.supabase, errorHandler);
			const alertPointRepo = new ReportAlertPointRepository(locals.supabase, errorHandler);
			const recipientRepo = new ReportRecipientRepository(locals.supabase, errorHandler);
			const scheduleRepo = new ReportUserScheduleRepository(locals.supabase, errorHandler);

			// Create report service
			const reportService = new ReportService(
				reportRepo,
				alertPointRepo,
				recipientRepo,
				scheduleRepo
			);

			// Create the report
			const report = await reportService.createReport({
				name,
				dev_eui: devEui
			});

			return { success: true, report };
		} catch (err) {
			console.error('Error creating report:', err);
			return fail(500, { success: false, error: 'Failed to create report' });
		}
	},

	deleteReport: async ({ request, locals, params }) => {
		try {
			const devEui = params.devEui;

			if (!devEui) {
				return fail(400, { success: false, error: 'Device EUI is required' });
			}

			// Check if user is authenticated
			const session = locals.session;
			if (!session) {
				return fail(401, { success: false, error: 'Authentication required' });
			}

			const formData = await request.formData();
			const reportId = formData.get('reportId') as string;

			if (!reportId) {
				return fail(400, { success: false, error: 'Report ID is required' });
			}

			// Create service dependencies
			const errorHandler = new ErrorHandlingService();
			const reportRepo = new ReportRepository(locals.supabase, errorHandler);
			const alertPointRepo = new ReportAlertPointRepository(locals.supabase, errorHandler);
			const recipientRepo = new ReportRecipientRepository(locals.supabase, errorHandler);
			const scheduleRepo = new ReportUserScheduleRepository(locals.supabase, errorHandler);

			// Create report service
			const reportService = new ReportService(
				reportRepo,
				alertPointRepo,
				recipientRepo,
				scheduleRepo
			);

			// Delete the report
			await reportService.deleteReport(reportId);

			return { success: true };
		} catch (err) {
			console.error('Error deleting report:', err);
			return fail(500, { success: false, error: 'Failed to delete report' });
		}
	}
};
