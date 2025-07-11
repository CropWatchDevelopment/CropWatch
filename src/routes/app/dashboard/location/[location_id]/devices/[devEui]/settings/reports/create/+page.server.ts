import type { PageServerLoad, Actions } from './$types';
import { ReportService } from '$lib/services/ReportService';
import { ReportRepository } from '$lib/repositories/ReportRepository';
import { ReportAlertPointRepository } from '$lib/repositories/ReportAlertPointRepository';
import { ReportRecipientRepository } from '$lib/repositories/ReportRecipientRepository';
import { ReportUserScheduleRepository } from '$lib/repositories/ReportUserScheduleRepository';
import { ErrorHandlingService } from '$lib/errors/ErrorHandlingService';
import { error, fail, redirect } from '@sveltejs/kit';
import type { ReportAlertPoint, ReportRecipient, ReportUserSchedule } from '$lib/models/Report';
import { DeviceDataService } from '$lib/services/DeviceDataService';

export const load: PageServerLoad = async ({ params, locals, url }) => {
	try {
		const devEui = params.devEui;
		const location_id = params.location_id;
		const reportId = url.searchParams.get('reportId');

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

		const errorHandler = new ErrorHandlingService();
		const deviceRepo = new ReportRepository(locals.supabase, errorHandler);
		const dataService = new DeviceDataService(locals.supabase, deviceRepo);
		// If reportId is provided, load existing report data
		let report = null;
		let alertPoints: ReportAlertPoint[] = [];
		let recipients: ReportRecipient[] = [];
		let schedules: ReportUserSchedule[] = [];
		let dataKeys = null;
		const latestData = await dataService.getLatestDeviceData(devEui); // pull the latest data for the device keys
		if (!latestData) {
			throw error(404, 'No data found for this device');
		}

		dataKeys = Object.keys(latestData)
			.filter((k) => latestData[k] != null)
			.reduce((a, k) => ({ ...a, [k]: latestData[k] }), {});
		delete dataKeys['dev_eui']; // remove dev_eui as it's not a data key
		delete dataKeys['created_at']; // remove created_at as it's not a data key
		delete dataKeys['is_simulated']; // remove updated_at as it's not a data key
		dataKeys = Object.keys(dataKeys); // get only the keys

		if (reportId) {
			// Create service dependencies
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
			report = await reportService.getReportByReportId(reportId);
			if (!report) {
				throw error(404, 'Report not found');
			}

			// Verify the report belongs to the specified device
			if (report.dev_eui !== devEui) {
				throw error(403, 'Report does not belong to this device');
			}

			alertPoints = await reportService.getAlertPointsByReportId(reportId);
			recipients = await reportService.getRecipientsByReportId(reportId);
			schedules = await reportService.getSchedulesByReportId(reportId);
		}

		return {
			devEui,
			locationId: location_id,
			report,
			alertPoints,
			recipients,
			schedules,
			dataKeys,
			isEditing: !!reportId
		};
	} catch (err) {
		console.error('Error loading create/edit report page:', err);

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
			const reportId = formData.get('reportId') as string; // For editing existing reports
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

			let report;

			if (reportId) {
				// Edit existing report
				report = await reportService.updateReport(reportId, { name });

				// Delete existing related data and recreate
				await reportService.deleteAlertPointsByReportId(reportId);
				await reportService.deleteRecipientsByReportId(reportId);
				await reportService.deleteSchedulesByReportId(reportId);
			} else {
				// Create new report
				report = await reportService.createReport({
					name,
					dev_eui: devEui
				});
			}

			// Create/recreate alert points
			for (const point of alertPoints) {
				await reportService.createAlertPoint({
					report_id: report.report_id,
					name: point.name,
					operator: point.operator,
					min: point.min,
					max: point.max,
					value: point.value,
					hex_color: point.hex_color,
					data_point_key: point.data_point_key
				});
			}

			// Create/recreate recipients
			for (const recipient of recipients) {
				await reportService.createRecipient({
					report_id: report.report_id,
					email: recipient.email,
					name: recipient.name,
					communication_method: 1 //recipient.communication_method,
				});
			}

			// Create/recreate schedules
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
			console.error('Error creating/updating report:', err);

			if (err instanceof Error && 'status' in err) {
				throw err; // Re-throw SvelteKit errors (including redirects)
			}

			return fail(500, { success: false, error: 'Failed to create/update report' });
		}
	}
};
