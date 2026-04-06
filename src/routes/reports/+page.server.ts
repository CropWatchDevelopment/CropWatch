import { ApiService } from '$lib/api/api.service';
import { formatDateTime } from '$lib/i18n/format';
import { m } from '$lib/paraglide/messages.js';
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
		const deviceOwners = reportWithRelations.cw_devices?.cw_device_owners ?? [];

		return {
			...reportWithRelations,
			permission_level:
				deviceOwners.find(
					(owner) =>
						owner.user_id === session?.sub &&
						owner.permission_level != null &&
						owner.permission_level <= 3
				)?.permission_level ?? null,
			created_at: formatDateTime(reportWithRelations.created_at),
			location_name:
				reportWithRelations.cw_devices?.cw_locations?.name ?? m.reports_unknown_location(),
			device_name: reportWithRelations.cw_devices?.name ?? m.reports_unknown_device()
		};
	});

	return {
		session,
		authToken,
		reports: reportsResult
	};
};
