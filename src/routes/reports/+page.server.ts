import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

type ReportRow = {
	id: number;
	report_id: string;
	name: string;
	dev_eui: string;
	created_at: string;
	device: { dev_eui: string; name: string | null; location_id: number | null } | null;
};

export const load: PageServerLoad = async ({ locals }) => {
	const { session } = await locals.safeGetSession();

	if (!session) {
		throw redirect(303, '/auth');
	}

	const { supabase } = locals;

	const { data, error } = await supabase
		.from('reports')
		.select(
			`
			id,
			report_id,
			name,
			dev_eui,
			created_at,
			device:cw_devices (
				dev_eui,
				name,
				location_id
			)
		`
		)
		.eq('user_id', session.user.id)
		.order('created_at', { ascending: false });

	if (error) {
		console.error('Error fetching reports', error);
	}

	const reports =
		data?.map((row: ReportRow) => {
			const deviceData = Array.isArray(row.device) ? row.device[0] : row.device;
			return {
				id: row.id,
				report_id: row.report_id,
				name: row.name,
				dev_eui: row.dev_eui,
				created_at: row.created_at,
				device_name: deviceData?.name ?? 'Unknown device',
				location_id: deviceData?.location_id ?? null
			};
		}) ?? [];

	return {
		session,
		reports
	};
};
