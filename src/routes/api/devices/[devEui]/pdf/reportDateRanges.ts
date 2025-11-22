import { DateTime } from 'luxon';

export interface ReportDateRanges {
	userStart: DateTime;
	userEnd: DateTime;
	startLabel: string;
	endLabel: string;
	startDateUtc: Date;
	endDateUtc: Date;
	startDateLocal: Date;
	endDateLocal: Date;
}

/**
 * Resolves the user's requested start/end dates into the three representations we need:
 * - Labels for displaying in the PDF
 * - UTC instants for report RPC queries
 * - Plain Date objects that still represent the user's timezone so DeviceDataService
 *   can perform its internal conversion. Keeping these variants separate prevents future
 *   refactors from double-converting the dates again.
 */
export function resolveReportDateRanges(
	startDate: Date,
	endDate: Date,
	timezone: string
): ReportDateRanges {
	const userStart = DateTime.fromJSDate(startDate).setZone(timezone).startOf('day');
	const userEnd = DateTime.fromJSDate(endDate).setZone(timezone).endOf('day');

	const startLabel = userStart.toFormat('yyyy-MM-dd HH:mm');
	const endLabel = userEnd.toFormat('yyyy-MM-dd HH:mm');

	const startDateUtc = userStart.toUTC().toJSDate();
	const endDateUtc = userEnd.toUTC().toJSDate();

	const startDateLocal = new Date(
		userStart.year,
		userStart.month - 1,
		userStart.day,
		userStart.hour,
		userStart.minute,
		userStart.second,
		userStart.millisecond
	);
	const endDateLocal = new Date(
		userEnd.year,
		userEnd.month - 1,
		userEnd.day,
		userEnd.hour,
		userEnd.minute,
		userEnd.second,
		userEnd.millisecond
	);

	return {
		userStart,
		userEnd,
		startLabel,
		endLabel,
		startDateUtc,
		endDateUtc,
		startDateLocal,
		endDateLocal
	};
}
