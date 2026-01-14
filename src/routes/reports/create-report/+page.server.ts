import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';

type DeviceRow = {
	dev_eui: string;
	cw_devices?: { name: string | null; location_id: number | null } | null;
};

export const load: PageServerLoad = async ({ locals }) => {
	const { session } = await locals.safeGetSession();

	if (!session) {
		throw redirect(303, '/auth');
	}

	const { supabase } = locals;

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
		console.error('Error loading devices for report creation', deviceError);
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

	return {
		session,
		devices
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
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
				error: 'You do not have permission to create reports for that device.',
				name,
				dev_eui
			});
		}

		const { data: insertResult, error: insertError } = await locals.supabase
			.from('reports')
			.insert({
				name,
				dev_eui,
				user_id: session.user.id
			})
			.select('report_id')
			.single();

		if (insertError || !insertResult) {
			console.error('Error creating report', insertError);
			return fail(500, {
				error: 'Failed to create report. Please try again.',
				name,
				dev_eui
			});
		}

		return {
			success: true,
			message: 'Report created successfully.',
			reportId: insertResult.report_id
		};
	}
};
