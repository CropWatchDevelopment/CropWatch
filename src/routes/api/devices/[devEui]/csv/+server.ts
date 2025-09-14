import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { DeviceDataService } from '$lib/services/DeviceDataService';
import { DateTime } from 'luxon';

export const GET: RequestHandler = async ({
	params,
	url,
	locals: { safeGetSession, supabase }
}) => {
	const { devEui } = params;
	const { session, user } = await safeGetSession();
	if (!session) {
		console.error('Session is null on device data API for device:', devEui);
	}

	try {
		// Get query parameters for date range
		const startDateParam = url.searchParams.get('start');
		const endDateParam = url.searchParams.get('end');
		const timezoneParam = url.searchParams.get('timezone') || 'UTC';

		if (!startDateParam || !endDateParam) {
			throw error(400, 'Start and end dates are required');
		}

		let startDate = new Date(startDateParam);
		let endDate = new Date(endDateParam);

		// Validate dates
		if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
			throw error(400, 'Invalid date format');
		}

		// Include the full day in the results, but do this in the user's timezone
		// Parse dates as local dates in the user's timezone, then set to start/end of day
		const userTimezone = timezoneParam;

		// Create DateTime objects from the date strings in the user's timezone
		const startDt = DateTime.fromISO(startDateParam + 'T00:00:00', { zone: userTimezone }).startOf(
			'day'
		);
		const endDt = DateTime.fromISO(endDateParam + 'T23:59:59', { zone: userTimezone }).endOf('day');

		// Convert back to JavaScript Date objects
		startDate = startDt.toJSDate();
		endDate = endDt.toJSDate();

		// Get services from the container
		const deviceDataService = new DeviceDataService(supabase);

		// First, try to determine if this is an air data or soil data device based on latest data
		let csvData = null;

		// Try to get data dynamically based on device type

		try {
			csvData = await deviceDataService.getDeviceDataByDateRangeAsCSV(
				devEui,
				startDate,
				endDate,
				timezoneParam
			);
			if (!csvData || csvData.length === 0) {
				throw new Error('No data found for the specified date range');
			}
		} catch (dataError) {
			console.error(`Error fetching dynamic data for device ${devEui}:`, dataError);
			// Will fall back to specific services below
		}

		// Prepare CSV string
		let csvString: string;
		if (Array.isArray(csvData)) {
			if (csvData.length === 0) {
				throw error(404, 'No data found for the specified date range');
			}
			// Determine headers, excluding 'id' and 'is_simulated' and any columns entirely empty
			const origHeaders = Object.keys(csvData[0] as Record<string, any>);
			const headers = origHeaders
				.filter((h) => h !== 'id' && h !== 'is_simulated')
				.filter((h) => csvData.some((row) => (row as any)[h] != null && (row as any)[h] !== ''));
			// Format rows with Excel-friendly dates
			const rows = csvData.map((row) => {
				return headers
					.map((field) => {
						let raw = (row as any)[field];
						let value: string = '';
						if (field === 'created_at' && raw) {
							// Format for Excel: YYYY-MM-DD HH:mm:ss in requested timezone
							const dt = DateTime.fromJSDate(new Date(raw)).setZone(userTimezone);
							value = dt.toFormat('yyyy-LL-dd HH:mm:ss');
						} else if (raw != null) {
							value = String(raw);
						}
						// Escape and quote
						const escaped = value.replace(/"/g, '""');
						return `"${escaped}"`;
					})
					.join(',');
			});
			csvString = [headers.join(','), ...rows].join('\n');
		} else if (typeof csvData === 'string') {
			// Parse raw CSV string, exclude empty columns, filter out 'id' & 'is_simulated', format 'created_at'
			const rawCsv: string = csvData;
			const lines: string[] = rawCsv.trim().split('\n');
			const originalHeaders: string[] = lines[0].split(',');
			// Parse data lines into fields matrix
			const dataLines: string[] = lines.slice(1).filter((l: string) => l.trim());
			const regex = /(\".*?\"|[^,]+)(?=,|$)/g;
			const fieldMatrix: string[][] = dataLines.map((line: string) => {
				const matches = Array.from(line.matchAll(regex)) as RegExpMatchArray[];
				return matches.map((m: RegExpMatchArray) => m[1]);
			});
			// Determine which columns to keep: exclude 'id', 'is_simulated' and columns with all empty
			const keepIndices: number[] = originalHeaders
				.map((h: string, idx: number) => ({ h, idx }))
				.filter(({ h }) => h !== 'id' && h !== 'is_simulated')
				.filter(({ idx }) =>
					fieldMatrix.some((fields) => {
						const val = fields[idx]?.replace(/^"|"$/g, '');
						return val !== null && val !== undefined && val !== '';
					})
				)
				.map(({ idx }) => idx);
			const newHeaders: string[] = keepIndices.map((i: number) => originalHeaders[i]);
			// Build new rows with formatting
			const newRows: string[] = fieldMatrix.map((fields: string[]): string => {
				return keepIndices
					.map((idx: number): string => {
						const raw = fields[idx] ?? '';
						let value: string;
						const header = originalHeaders[idx];
						if (header === 'created_at') {
							const unq = raw.replace(/^"|"$/g, '');
							const sqlDate = unq.split('+')[0];
							const dt = DateTime.fromSQL(sqlDate, { zone: 'utc' });
							value = dt.toFormat('yyyy-LL-dd HH:mm:ss');
						} else {
							value = raw.replace(/^"|"$/g, '');
						}
						// Escape and quote final value
						const escaped = value.replace(/"/g, '""');
						return `"${escaped}"`;
					})
					.join(',');
			});
			csvString = [newHeaders.join(','), ...newRows].join('\n');
		} else {
			throw error(500, 'Invalid CSV data format');
		}
		// Return CSV as a proper Response with headers
		return new Response(csvString, {
			status: 200,
			headers: {
				'Content-Type': 'text/csv',
				'Content-Disposition': `attachment; filename="${devEui}.csv"`
			}
		});
	} catch (err) {
		console.error(`Error in device data API for ${devEui}:`, err);

		if (err instanceof Error) {
			throw error(500, err.message);
		} else {
			throw error(500, 'Unknown error occurred');
		}
	}
};
