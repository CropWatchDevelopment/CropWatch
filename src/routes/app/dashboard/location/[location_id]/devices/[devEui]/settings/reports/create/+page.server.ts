import type { PageServerLoad, Actions } from './$types';
import { ReportService } from '$lib/services/ReportService';
import { ReportRepository } from '$lib/repositories/ReportRepository';
import { ReportAlertPointRepository } from '$lib/repositories/ReportAlertPointRepository';
import { ReportRecipientRepository } from '$lib/repositories/ReportRecipientRepository';
import { ReportUserScheduleRepository } from '$lib/repositories/ReportUserScheduleRepository';
import { ErrorHandlingService } from '$lib/errors/ErrorHandlingService';
import { error, fail, redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, locals }) => {
	try {
		const devEui = params.devEui;
		const location_id = params.location_id;

		if (!devEui) {
			throw error(400, 'Device EUI is required');
		}

		if (!location_id) {
			throw error(400, 'Location ID is required');
		}

		// Check if user is authenticated
		const session = locals.session;
		if (!session) {
			throw error(401, 'Authentication required');
		}

		return {
			devEui,
			locationId: location_id
		};
	} catch (err) {
		console.error('Error loading create report page:', err);

		if (err instanceof Error && 'status' in err) {
			throw err; // Re-throw SvelteKit errors
		}

		throw error(500, 'Failed to load page');
	}
};

export const actions: Actions = {
	default: async ({ request, locals, params }) => {
		try {
			const devEui = params.devEui;
			const location_id = params.location_id;

			if (!devEui) {
				return fail(400, { success: false, error: 'Device EUI is required' });
			}

			if (!location_id) {
				return fail(400, { success: false, error: 'Location ID is required' });
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

			// Create the report
			const report = await reportService.createReport({
				name,
				dev_eui: devEui
			});

			// Create alert points
			for (const point of alertPoints) {
				await reportService.createAlertPoint({
					report_id: report.report_id,
					name: point.name,
					operator: point.operator,
					min: point.min,
					max: point.max,
					hex_color: point.color
				});
			}

			// Create recipients - For now, we'll skip this since it requires profile_id
			// This would need to be implemented with proper user management

			// Create schedules
			for (const schedule of schedules) {
				await reportService.createSchedule({
					report_id: report.report_id,
					dev_eui: devEui,
					user_id: session.user.id,
					end_of_week: schedule.frequency === 'weekly',
					end_of_month: schedule.frequency === 'monthly',
					is_active: true
				});
			}

			throw redirect(
				303,
				`/app/dashboard/location/${location_id}/devices/${devEui}/settings/reports`
			);
		} catch (err) {
			console.error('Error creating report:', err);

			if (err instanceof Error && 'status' in err) {
				throw err; // Re-throw SvelteKit errors (including redirects)
			}

			return fail(500, { success: false, error: 'Failed to create report' });
		}
	}
};
