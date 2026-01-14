import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';

type DeviceRow = {
	dev_eui: string;
	cw_devices?: { name: string | null; location_id: number | null } | null;
};

type RecipientRow = {
	id: number;
	name: string | null;
	email: string | null;
	communication_method: number;
	communication_methods?: { name: string } | null;
};

type AlertPointRow = {
	id: number;
	name: string;
	data_point_key: string;
	operator: string | null;
	min: number | null;
	max: number | null;
	value: number | null;
	hex_color: string | null;
};

type ScheduleRow = {
	report_user_schedule_id: number;
	dev_eui: string;
	is_active: boolean;
	end_of_week: boolean;
	end_of_month: boolean;
};

export const load: PageServerLoad = async ({ locals, params }) => {
	const { session } = await locals.safeGetSession();

	if (!session) {
		throw redirect(303, '/auth');
	}

	const { supabase } = locals;
	const reportId = params.report_id;

	const { data: reportRow, error: reportError } = await supabase
		.from('reports')
		.select('report_id, name, dev_eui, created_at')
		.eq('report_id', reportId)
		.eq('user_id', session.user.id)
		.single();

	if (reportError || !reportRow) {
		console.error('Error loading report', reportError);
		throw redirect(303, '/reports');
	}

	const { data: deviceRows, error: deviceError } = await supabase
		.from('cw_device_owners')
		.select(
			`
			dev_eui,
			cw_devices (
				name,
				location_id
			)
		`
		)
		.eq('user_id', session.user.id);

	if (deviceError) {
		console.error('Error loading devices for report edit', deviceError);
	}

	const devices =
		deviceRows?.map((row: DeviceRow) => {
			const deviceData = Array.isArray(row.cw_devices) ? row.cw_devices[0] : row.cw_devices;
			return {
				dev_eui: row.dev_eui,
				name: deviceData?.name ?? row.dev_eui,
				location_id: deviceData?.location_id ?? null
			};
		}) ?? [];

	const { data: recipientRows, error: recipientsError } = await supabase
		.from('report_recipients')
		.select(
			`
				id,
				name,
				email,
				communication_method,
				communication_methods ( name )
			`
		)
		.eq('report_id', reportId)
		.eq('user_id', session.user.id)
		.order('created_at', { ascending: true });

	if (recipientsError) {
		console.error('Error loading report recipients', recipientsError);
	}

	const recipients =
		recipientRows?.map((row: RecipientRow) => ({
			id: row.id,
			name: row.name ?? undefined,
			email: row.email ?? '',
			communication_method: row.communication_method,
			method_name: row.communication_methods?.name ?? 'Unknown'
		})) ?? [];

	const { data: alertRows, error: alertsError } = await supabase
		.from('report_alert_points')
		.select('id, name, data_point_key, operator, min, max, value, hex_color')
		.eq('report_id', reportId)
		.eq('user_id', session.user.id)
		.order('created_at', { ascending: true });

	if (alertsError) {
		console.error('Error loading alert points', alertsError);
	}

	const alertPoints =
		alertRows?.map((row: AlertPointRow) => ({
			...row
		})) ?? [];

	const { data: scheduleRow, error: scheduleError } = await supabase
		.from('report_user_schedule')
		.select('report_user_schedule_id, dev_eui, is_active, end_of_week, end_of_month')
		.eq('report_id', reportId)
		.eq('user_id', session.user.id)
		.maybeSingle();

	if (scheduleError) {
		console.error('Error loading report schedule', scheduleError);
	}

	const schedule: ScheduleRow | null = scheduleRow
		? {
			report_user_schedule_id: scheduleRow.report_user_schedule_id,
			dev_eui: scheduleRow.dev_eui,
			is_active: scheduleRow.is_active,
			end_of_week: scheduleRow.end_of_week,
			end_of_month: scheduleRow.end_of_month
		}
		: null;

	const { data: communicationMethods, error: communicationError } = await supabase
		.from('communication_methods')
		.select('communication_method_id, name, is_active')
		.eq('is_active', true)
		.order('communication_method_id', { ascending: true });

	if (communicationError) {
		console.error('Error loading communication methods', communicationError);
	}

	const { data: metadataRows, error: metadataError } = await supabase
		.from('cw_data_metadata')
		.select('id, name, public_name, notation, icon, formatting')
		.order('name', { ascending: true });

	if (metadataError) {
		console.error('Error loading data metadata', metadataError);
	}

	return {
		session,
		report: reportRow,
		devices,
		recipients,
		alertPoints,
		schedule,
		communicationMethods: communicationMethods ?? [],
		metadata: metadataRows ?? []
	};
};

export const actions: Actions = {
	default: async ({ request, locals, params }) => {
		const { session } = await locals.safeGetSession();

		if (!session) {
			return fail(401, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const name = formData.get('name')?.toString().trim();
		const dev_eui = formData.get('dev_eui')?.toString().trim();

		if (!name || name.length < 3) {
			return fail(400, {
				error: 'Report name must be at least 3 characters long.',
				name,
				dev_eui
			});
		}

		if (!dev_eui) {
			return fail(400, { error: 'Please select a device for the report.', name });
		}

		// Ensure the user owns or has access to the device
		const { data: ownership } = await locals.supabase
			.from('cw_device_owners')
			.select('dev_eui')
			.eq('user_id', session.user.id)
			.eq('dev_eui', dev_eui);

		if (!ownership || ownership.length === 0) {
			return fail(403, {
				error: 'You do not have permission to use that device.',
				name,
				dev_eui
			});
		}

		const { error: updateError } = await locals.supabase
			.from('reports')
			.update({
				name,
				dev_eui
			})
			.eq('report_id', params.report_id)
			.eq('user_id', session.user.id);

		if (updateError) {
			console.error('Error updating report', updateError);
			return fail(500, {
				error: 'Failed to save report. Please try again.',
				name,
				dev_eui
			});
		}

		return {
			success: true,
			message: 'Report updated successfully.'
		};
	},
	addRecipient: async ({ request, locals, params }) => {
		const { session } = await locals.safeGetSession();

		if (!session) {
			return fail(401, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const name = formData.get('recipient_name')?.toString().trim() || null;
		const email = formData.get('recipient_email')?.toString().trim();
		const communication_method_raw = formData.get('communication_method')?.toString();
		const communication_method = communication_method_raw ? Number(communication_method_raw) : NaN;

		if (!email) {
			return fail(400, { error: 'Recipient email is required.' });
		}

		if (!Number.isFinite(communication_method)) {
			return fail(400, { error: 'Please choose how this recipient should be contacted.' });
		}

		const { error: insertError } = await locals.supabase.from('report_recipients').insert({
			report_id: params.report_id,
			user_id: session.user.id,
			name,
			email,
			communication_method
		});

		if (insertError) {
			console.error('Error adding report recipient', insertError);
			return fail(500, { error: 'Failed to add recipient. Please try again.' });
		}

		return { success: true, message: 'Recipient added.' };
	},
	deleteRecipient: async ({ request, locals, params }) => {
		const { session } = await locals.safeGetSession();

		if (!session) {
			return fail(401, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const recipientIdRaw = formData.get('recipient_id')?.toString();
		const recipient_id = recipientIdRaw ? Number(recipientIdRaw) : NaN;

		if (!Number.isFinite(recipient_id)) {
			return fail(400, { error: 'Invalid recipient.' });
		}

		const { error: deleteError } = await locals.supabase
			.from('report_recipients')
			.delete()
			.eq('id', recipient_id)
			.eq('report_id', params.report_id)
			.eq('user_id', session.user.id);

		if (deleteError) {
			console.error('Error deleting recipient', deleteError);
			return fail(500, { error: 'Failed to remove recipient. Please try again.' });
		}

		return { success: true, message: 'Recipient removed.' };
	},
	addAlert: async ({ request, locals, params }) => {
		const { session } = await locals.safeGetSession();

		if (!session) {
			return fail(401, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const name = formData.get('alert_name')?.toString().trim();
		const data_point_key = formData.get('data_point_key')?.toString().trim();
		const operator = formData.get('operator')?.toString().trim() || null;
		const hex_color = formData.get('hex_color')?.toString().trim() || null;
		const minRaw = formData.get('min')?.toString();
		const maxRaw = formData.get('max')?.toString();
		const valueRaw = formData.get('value')?.toString();
		const min = minRaw === undefined || minRaw === '' ? null : Number(minRaw);
		const max = maxRaw === undefined || maxRaw === '' ? null : Number(maxRaw);
		const value = valueRaw === undefined || valueRaw === '' ? null : Number(valueRaw);

		if (!name || !data_point_key) {
			return fail(400, { error: 'Alert name and metric are required.' });
		}

		if (min === null && max === null && value === null) {
			return fail(400, {
				error: 'Provide at least one threshold (min, max, or target value).'
			});
		}

		const { error: insertError } = await locals.supabase.from('report_alert_points').insert({
			name,
			data_point_key,
			report_id: params.report_id,
			user_id: session.user.id,
			operator,
			min,
			max,
			value,
			hex_color
		});

		if (insertError) {
			console.error('Error adding alert point', insertError);
			return fail(500, { error: 'Failed to add alert. Please try again.' });
		}

		return { success: true, message: 'Alert saved.' };
	},
	deleteAlert: async ({ request, locals, params }) => {
		const { session } = await locals.safeGetSession();

		if (!session) {
			return fail(401, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const alertIdRaw = formData.get('alert_id')?.toString();
		const alert_id = alertIdRaw ? Number(alertIdRaw) : NaN;

		if (!Number.isFinite(alert_id)) {
			return fail(400, { error: 'Invalid alert.' });
		}

		const { error: deleteError } = await locals.supabase
			.from('report_alert_points')
			.delete()
			.eq('id', alert_id)
			.eq('report_id', params.report_id)
			.eq('user_id', session.user.id);

		if (deleteError) {
			console.error('Error deleting alert', deleteError);
			return fail(500, { error: 'Failed to remove alert. Please try again.' });
		}

		return { success: true, message: 'Alert removed.' };
	},
	saveSchedule: async ({ request, locals, params }) => {
		const { session } = await locals.safeGetSession();

		if (!session) {
			return fail(401, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const dev_eui = formData.get('schedule_dev_eui')?.toString().trim();
		const is_active = formData.get('is_active') === 'on';
		const end_of_week = formData.get('end_of_week') === 'on';
		const end_of_month = formData.get('end_of_month') === 'on';

		if (!dev_eui) {
			return fail(400, { error: 'Device is required for scheduling.' });
		}

		// Ensure ownership of the device used for scheduling
		const { data: ownership } = await locals.supabase
			.from('cw_device_owners')
			.select('dev_eui')
			.eq('user_id', session.user.id)
			.eq('dev_eui', dev_eui);

		if (!ownership || ownership.length === 0) {
			return fail(403, {
				error: 'You do not have permission to schedule reports for that device.',
				dev_eui
			});
		}

		const { data: existing } = await locals.supabase
			.from('report_user_schedule')
			.select('report_user_schedule_id')
			.eq('report_id', params.report_id)
			.eq('user_id', session.user.id)
			.maybeSingle();

		if (existing) {
			const { error: updateError } = await locals.supabase
				.from('report_user_schedule')
				.update({ dev_eui, is_active, end_of_week, end_of_month })
				.eq('report_user_schedule_id', existing.report_user_schedule_id)
				.eq('user_id', session.user.id);

			if (updateError) {
				console.error('Error updating report schedule', updateError);
				return fail(500, { error: 'Failed to save schedule. Please try again.' });
			}
		} else {
			const { error: insertError } = await locals.supabase.from('report_user_schedule').insert({
				report_id: params.report_id,
				user_id: session.user.id,
				dev_eui,
				is_active,
				end_of_week,
				end_of_month
			});

			if (insertError) {
				console.error('Error creating report schedule', insertError);
				return fail(500, { error: 'Failed to save schedule. Please try again.' });
			}
		}

		return { success: true, message: 'Schedule saved.' };
	}
};
