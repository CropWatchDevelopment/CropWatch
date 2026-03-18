import { ApiService } from '$lib/api/api.service';
import type { ReportDeviceRelations, ReportRow } from './report-row';
import type { PageServerLoad } from './$types';

type ReportApiRow = ReportDeviceRelations & {
	created_at: string;
};

export const load: PageServerLoad = async ({ locals, fetch }) => {
	const session = locals.jwt ?? null;
	const authToken = locals.jwtString ?? null;

	if (!authToken) {
		return {
			session,
			devices: [],
			totalDeviceCount: 0,
			triggeredRulesCount: 0
		};
	}

	const apiServiceInstance = new ApiService({
		fetchFn: fetch,
		authToken
	});

	const reports = await apiServiceInstance.getReports().catch(() => []);

	const reportsResult: ReportRow[] = reports.map((report) => {
		const reportWithRelations = report as typeof report & ReportApiRow;

		return {
			...reportWithRelations,
			created_at: new Date(reportWithRelations.created_at).toLocaleString(),
			location_name: reportWithRelations.cw_devices?.cw_locations?.name ?? 'Unknown Location',
			device_name: reportWithRelations.cw_devices?.name ?? 'Unknown Device'
		};
	});

	return {
		session,
		authToken,
		reports: reportsResult
	};
};
