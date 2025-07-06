import type { Actions } from '@sveltejs/kit';
import { ReportService } from '$lib/services/ReportService';
import { ReportRepository } from '$lib/repositories/ReportRepository';
import { ReportAlertPointRepository } from '$lib/repositories/ReportAlertPointRepository';
import { ReportRecipientRepository } from '$lib/repositories/ReportRecipientRepository';
import { ReportUserScheduleRepository } from '$lib/repositories/ReportUserScheduleRepository';
import { ErrorHandlingService } from '$lib/errors/ErrorHandlingService';
import { error, fail, redirect } from '@sveltejs/kit';

export const load = async ({ params, locals }: any) => {
	try {
		const devEui = params.devEui;
		const location_id = params.location_id;
		const reportId = params.reportId;

		if (!devEui) {
			throw error(400, 'Device EUI is required');
		}

		if (!location_id) {
			throw error(400, 'Location ID is required');
		}

		if (!reportId) {
			throw error(400, 'Report ID is required');
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

		// Load report and related data
		const report = await reportService.getReportByReportId(reportId);
		if (!report) {
			throw error(404, 'Report not found');
		}

		// Verify the report belongs to the specified device
		if (report.dev_eui !== devEui) {
			throw error(403, 'Report does not belong to this device');
		}

		const alertPoints = await reportService.getAlertPointsByReportId(reportId);
		const recipients = await reportService.getRecipientsByReportId(reportId);
		const schedules = await reportService.getSchedulesByReportId(reportId);

		return {
			devEui,
			locationId: location_id,
			report,
			alertPoints,
			recipients,
			schedules
		};
	} catch (err) {
		console.error('Error loading edit report page:', err);

		if (err instanceof Error && 'status' in err) {
			throw err; // Re-throw SvelteKit errors
		}

		throw error(500, 'Failed to load page');
	}
};

export const actions: Actions = {
	default: async ({ request, locals, params }: any) => {
		try {
			const devEui = params.devEui;
			const location_id = params.location_id;
			const reportId = params.reportId;

			if (!devEui) {
				return fail(400, { success: false, error: 'Device EUI is required' });
			}

			if (!location_id) {
				return fail(400, { success: false, error: 'Location ID is required' });
			}

			if (!reportId) {
				return fail(400, { success: false, error: 'Report ID is required' });
			}

			// Check if user is authenticated
			const session = locals.session;
			if (!session) {
				return fail(401, { success: false, error: 'Authentication required' });
			}

			const formData = await request.formData();
			const name = formData.get('name') as string;
			const alertPointsJson = formData.get('alertPoints') as string;
			const recipientsJson = formData.get('recipients') as string;
			const schedulesJson = formData.get('schedules') as string;

			if (!name) {
				return fail(400, { success: false, error: 'Report name is required' });
			}

			let alertPoints = [];
			let recipients = [];
			let schedules = [];

			try {
				alertPoints = alertPointsJson ? JSON.parse(alertPointsJson) : [];
				recipients = recipientsJson ? JSON.parse(recipientsJson) : [];
				schedules = schedulesJson ? JSON.parse(schedulesJson) : [];
			} catch (parseError) {
				return fail(400, { success: false, error: 'Invalid data format' });
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

			// Update the report
			await reportService.updateReport(reportId, {
				name
			});

			// Delete existing alert points and create new ones
			await reportService.deleteAlertPointsByReportId(reportId);
			for (const point of alertPoints) {
				await reportService.createAlertPoint({
					report_id: reportId,
					name: point.name,
					operator: point.operator,
					min: point.min,
					max: point.max,
					hex_color: point.color
				});
			}

			// For now, skip recipients and schedules updates since they need more complex logic
			// In a full implementation, you'd want to:
			// 1. Delete existing recipients/schedules
			// 2. Create new ones
			// 3. Handle user profile lookups for recipients

			throw redirect(
				303,
				`/app/dashboard/location/${location_id}/devices/${devEui}/settings/reports`
			);
		} catch (err) {
			console.error('Error updating report:', err);

			if (err instanceof Error && 'status' in err) {
				throw err; // Re-throw SvelteKit errors (including redirects)
			}

			return fail(500, { success: false, error: 'Failed to update report' });
		}
	}
};
