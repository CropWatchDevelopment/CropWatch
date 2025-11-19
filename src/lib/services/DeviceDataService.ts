import type { ReportAlertPoint } from '$lib/models/Report';
import type { SupabaseClient } from '@supabase/supabase-js';
import { DateTime } from 'luxon';
import { ErrorHandlingService } from '../errors/ErrorHandlingService';
import type { IDeviceDataService } from '../interfaces/IDeviceDataService';
import type { DeviceType } from '../models/Device';
import type { DeviceDataRecord } from '../models/DeviceDataRecord';

export class DeviceDataService implements IDeviceDataService {
	private readonly errorHandler: ErrorHandlingService;

	constructor(
		private readonly supabase: SupabaseClient,
		errorHandler: ErrorHandlingService = new ErrorHandlingService()
	) {
		this.errorHandler = errorHandler;
	}

	/**
	 * Get the latest data for a device based on its type, with optimized handling for large tables
	 * @param devEui The device EUI
	 */
	public async getLatestDeviceData(devEui: string): Promise<DeviceDataRecord | null> {
		if (!devEui) {
			throw new Error('Device EUI not specified');
		}
		if (!(await this.checkUserHasAccess(devEui))) {
			throw new Error('User does not have access to this device');
		}
		const cw_device = await this.getDeviceAndType(devEui);
		const tableName = cw_device.cw_device_type.data_table_v2; // Pull out the table name

		try {
			if (tableName === 'cw_traffic2') {
				return await this.getLatestTrafficAggregate(devEui);
			}

			const { data, error } = await this.supabase
				.from(tableName)
				.select()
				.eq('dev_eui', devEui)
				.order('created_at', { ascending: false })
				.limit(1)
				.maybeSingle();

			if (error) {
				this.errorHandler.logError(error);
				throw new Error(`Error fetching columns: ${error.message}`);
			}

			return data as DeviceDataRecord;
		} catch (error) {
			this.errorHandler.logError(error as Error);
			if (error instanceof Error && error.message.includes('AbortError')) {
				return {
					error: 'Data retrieval timed out',
					partial: true,
					dev_eui: devEui,
					created_at: new Date().toISOString(),
					note: 'This is a placeholder due to query timeout'
				};
			}
			throw error;
		}
	}

	/**
	 * Get device data within a date range based on device type
	 * @param devEui The device EUI
	 * @param deviceType The device type information containing data_table_v2
	 * @param startDate The start date in user's timezone
	 * @param endDate The end date in user's timezone
	 * @param timezone The user's timezone (e.g., 'Asia/Tokyo', 'America/New_York')
	 */
	public async getDeviceDataByDateRange(
		devEui: string,
		startDate: Date,
		endDate: Date,
		timezone: string = 'UTC'
	): Promise<DeviceDataRecord[]> {
		if (!devEui) {
			throw new Error('Device EUI not specified');
		}
		if (!(await this.checkUserHasAccess(devEui))) {
			throw new Error('User does not have access to this device');
		}
		if (!startDate || !endDate) {
			throw new Error('Start date and end date must be specified');
		}
		if (startDate > endDate) {
			throw new Error('Start date must be before end date');
		}

		const cw_device = await this.getDeviceAndType(devEui);
		const tableName = cw_device.cw_device_type.data_table_v2; // Pull out the table name

		// Convert user timezone dates to UTC for database queries
		const utcStartDate = this.convertUserTimezoneToUTC(startDate, timezone);
		const utcEndDate = this.convertUserTimezoneToUTC(endDate, timezone);

		try {
			// get the number of uploads between the selected start and end dates
			const monthsInRange = Math.floor(
				DateTime.fromJSDate(endDate).diff(DateTime.fromJSDate(startDate), 'months').months
			);
			if (monthsInRange > 3) {
				// If the range is too large, limit the query to the last 3 months
				throw new Error('Date range too large');
			}

			const { data, error } = await this.supabase
				.from(tableName)
				.select('*')
				.eq('dev_eui', devEui)
				.gte(
					tableName === 'cw_traffic2' ? 'traffic_hour' : 'created_at',
					utcStartDate.toISOString()
				)
				.lte(tableName === 'cw_traffic2' ? 'traffic_hour' : 'created_at', utcEndDate.toISOString())
				.order(tableName === 'cw_traffic2' ? 'traffic_hour' : 'created_at', {
					ascending: false
				});

			if (error) {
				this.errorHandler.logError(error);
				throw new Error(`Error fetching device data: ${error.message}`);
			}

			let records: DeviceDataRecord[];
			if (tableName === 'cw_traffic2') {
				records = this.aggregateTrafficCounts(data ?? []);
			} else {
				records = (data || []) as DeviceDataRecord[];
			}

			// Convert timestamps back to user timezone
			return this.convertRecordTimestampsToUserTimezone(records, timezone, tableName);
		} catch (error) {
			// Handle errors with a generic response
			this.errorHandler.logError(error as Error);

			if (error instanceof Error && error.message.includes('AbortError')) {
				return [
					{
						error: 'Data retrieval timed out',
						partial: true,
						dev_eui: devEui,
						created_at: new Date().toISOString(),
						note: 'This is a placeholder due to query timeout'
					}
				];
			}

			// Re-throw other errors
			throw error;
		}
	}

	/**
	 * Get device data within a date range based on device type as a CSV
	 * @param devEui The device EUI
	 * @param deviceType The device type information containing data_table_v2
	 * @param startDate The start date in user's timezone
	 * @param endDate The end date in user's timezone
	 * @param timezone The user's timezone (e.g., 'Asia/Tokyo', 'America/New_York')
	 */
	public async getDeviceDataByDateRangeAsCSV(
		devEui: string,
		startDate: Date,
		endDate: Date,
		timezone: string = 'UTC'
	): Promise<DeviceDataRecord[]> {
		if (!devEui) {
			throw new Error('Device EUI not specified');
		}
		if (!(await this.checkUserHasAccess(devEui))) {
			throw new Error('User does not have access to this device');
		}
		if (!startDate || !endDate) {
			throw new Error('Start date and end date must be specified');
		}
		if (startDate > endDate) {
			throw new Error('Start date must be before end date');
		}

		const cw_device = await this.getDeviceAndType(devEui);
		const tableName = cw_device.cw_device_type.data_table_v2; // Pull out the table name

		// Convert user timezone dates to UTC for database queries
		const utcStartDate = this.convertUserTimezoneToUTC(startDate, timezone);
		const utcEndDate = this.convertUserTimezoneToUTC(endDate, timezone);

		try {
			// get the number of uploads between the selected start and end dates
			const monthsInRange = Math.floor(
				DateTime.fromJSDate(endDate).diff(DateTime.fromJSDate(startDate), 'months').months
			);
			if (monthsInRange > 3) {
				// If the range is too large, limit the query to the last 3 months
				throw new Error('Date range too large');
			}

			const { data, error } = await this.supabase
				.from(tableName)
				.select('*')
				.eq('dev_eui', devEui)
				.gte(
					tableName === 'cw_traffic2' ? 'traffic_hour' : 'created_at',
					utcStartDate.toISOString()
				)
				.lte(tableName === 'cw_traffic2' ? 'traffic_hour' : 'created_at', utcEndDate.toISOString())
				.order(tableName === 'cw_traffic2' ? 'traffic_hour' : 'created_at', {
					ascending: false
				});

			if (error) {
				this.errorHandler.logError(error);
				throw new Error(`Error fetching CSV data: ${error.message}`);
			}

			const rawRecords =
				tableName === 'cw_traffic2'
					? this.aggregateTrafficCounts(data ?? [])
					: ((data || []) as Record<string, any>[]);

			const rows = rawRecords.map((r) => ({ ...r }));
			const timestampKey = tableName === 'cw_traffic2' ? 'traffic_hour' : 'created_at';

			const normalizeToISO = (val: string) => {
				let s = val.trim().replace(' ', 'T');
				s = s.replace(/([+-]\d{2})$/, '$1:00');
				s = s.replace(/([+-]\d{2})(\d{2})$/, '$1:$2');
				return s;
			};

			for (const row of rows) {
				const raw = row[timestampKey];
				if (!raw) continue;
				const isoLike = typeof raw === 'string' ? normalizeToISO(raw) : String(raw);
				let dt = DateTime.fromISO(isoLike, { setZone: true });
				if (!dt.isValid) dt = DateTime.fromSQL(String(raw), { setZone: true });
				if (dt.isValid) {
					// Format for Microsoft Excel compatibility: "yyyy-MM-dd HH:mm:ss" (no T, no timezone)
					const excelLocal = dt.setZone(timezone).toFormat('yyyy-LL-dd HH:mm:ss');

					// For traffic data, update both created_at and traffic_hour to maintain consistency
					if (tableName === 'cw_traffic2') {
						row.created_at = excelLocal;
						// For CSV consistency, also format traffic_hour in the same Excel-friendly format
						row.traffic_hour = excelLocal;
					} else {
						// For other data types, standardize on created_at
						row.created_at = excelLocal;
					}
				}
			}

			// Build header order: dev_eui, created_at, then the rest in natural order
			const headerSet = new Set<string>();
			for (const row of rows) {
				Object.keys(row).forEach((k) => headerSet.add(k));
			}
			const headers = [
				'dev_eui',
				'created_at',
				...Array.from(headerSet).filter((k) => k !== 'dev_eui' && k !== 'created_at')
			];

			const csv = this.toCSV(rows, headers);
			return csv as unknown as DeviceDataRecord[];
		} catch (error) {
			// Handle errors with a generic response
			this.errorHandler.logError(error as Error);

			if (error instanceof Error && error.message.includes('AbortError')) {
				return [
					{
						error: 'Data retrieval timed out',
						partial: true,
						dev_eui: devEui,
						created_at: new Date().toISOString(),
						note: 'This is a placeholder due to query timeout'
					}
				];
			}

			// Re-throw other errors
			throw error;
		}
	}

	/**
	 * Get the latest data for a device based on its type, with optimized handling for large tables
	 * @param devEui The device EUI
	 * @param deviceType The device type information containing data_table_v2
	 */
	private async getDeviceAndType(
		devEui: string
	): Promise<{ cw_device_type: DeviceType } & Record<string, unknown>> {
		if (!devEui) {
			throw new Error('Device EUI not specified');
		}
		if (!(await this.checkUserHasAccess(devEui))) {
			throw new Error('User does not have access to this device');
		}
		const { data: cw_device, error: deviceError } = await this.supabase
			.from('cw_devices')
			.select('*, cw_device_type(*)')
			.eq('dev_eui', devEui)
			.single();

		if (deviceError) {
			this.errorHandler.logError(deviceError);
			throw new Error(`Error fetching device type: ${deviceError.message}`);
		}

		if (!cw_device || !cw_device.cw_device_type.data_table_v2) {
			throw new Error('Device type or data table not specified');
		}

		return cw_device;
	}

	public async getDeviceDataForReport({
		devEui,
		startDate,
		endDate,
		timezone,
		intervalMinutes,
		columns,
		ops,
		mins,
		maxs
	}: {
		devEui: string;
		startDate: Date;
		endDate: Date;
		timezone: string;
		intervalMinutes: number;
		columns?: string[];
		ops?: string[];
		mins?: number[];
		maxs?: (number | null)[];
	}): Promise<DeviceDataRecord[]> {
		if (!devEui) {
			throw new Error('Device EUI not specified');
		}
		if (!(await this.checkUserHasAccess(devEui))) {
			throw new Error('User does not have access to this device');
		}
		if (!startDate || !endDate) {
			throw new Error('Start date and end date must be specified');
		}
		if (startDate > endDate) {
			throw new Error('Start date must be before end date');
		}

		try {
			// If no filtering parameters provided, get alert points from the device's reports
			let p_columns = !columns || columns.length === 0 ? ['temperature_c', 'humidity'] : columns;
			let p_ops = ops || ['>', 'BETWEEN'];
			let p_mins = mins || [25.0, 55.0];
			let p_maxs = maxs || [null, 65.0];

			// If no explicit filters provided, try to get from device reports
			// if (!columns && !ops && !mins && !maxs) {
			try {
				// Get the first report for this device to extract alert points
				const { data: reports, error: reportError } = await this.supabase
					.from('reports')
					.select('report_id, report_alert_points(*)')
					.eq('dev_eui', devEui)
					.limit(1);

				if (!reportError && reports && reports.length > 0 && reports[0].report_alert_points) {
					const alertPoints = reports[0].report_alert_points;
					if (alertPoints && alertPoints.length > 0) {
						p_columns = [];
						p_ops = [];
						p_mins = [];
						p_maxs = [];

						alertPoints.forEach((point: any) => {
							if (point.data_point_key) {
								if (p_columns && !p_columns.includes(point.data_point_key)) {
									p_columns.push(point.data_point_key);
								}
								p_ops.push(point.operator || '>');
								p_mins.push(point.min || point.value || 0);
								p_maxs.push(point.max || null);
							}
						});
					}
				}
			} catch (alertError) {
				// If we can't get alert points, use default values
				console.warn('Could not load alert points, using defaults:', alertError);
			}
			// }

			const { data, error: deviceError } = await this.supabase.rpc(
				'get_filtered_device_report_data_multi_v2',
				{
					p_dev_id: devEui,
					p_start_time: startDate,
					p_end_time: endDate,
					p_interval_minutes: intervalMinutes,
					p_columns: p_columns,
					p_ops: p_ops,
					p_mins: p_mins,
					p_maxs: p_maxs,
					p_timezone: timezone
				}
			);

			console.log('Report RPC params', {
				devEui,
				start: startDate.toISOString(),
				end: endDate.toISOString(),
				intervalMinutes,
				columns: p_columns,
				ops: p_ops,
				mins: p_mins,
				maxs: p_maxs,
				timezone
			});

			if (deviceError) {
				this.errorHandler.logError(deviceError);
				throw new Error(`Error fetching report data: ${deviceError.message}`);
			}
			if (!data || data.length === 0) {
				return [
					{
						error: 'No data found for the specified date range',
						partial: false,
						dev_eui: devEui,
						created_at: new Date().toISOString(),
						note: 'No data available for this device in the specified range'
					}
				];
			}

			const records = data as DeviceDataRecord[];
			const hasTrafficHourField = records.some((record) => 'traffic_hour' in record);
			const tableNameForConversion = hasTrafficHourField ? 'cw_traffic2' : 'report_data';
			return this.convertRecordTimestampsToUserTimezone(records, timezone, tableNameForConversion);
		} catch (error) {
			this.errorHandler.logError(error as Error);
			if (error instanceof Error && error.message.includes('AbortError')) {
				return [
					{
						error: 'Data retrieval timed out',
						partial: true,
						dev_eui: devEui,
						created_at: new Date().toISOString(),
						note: 'This is a placeholder due to query timeout'
					}
				];
			}
			throw error;
		}
	}

	/**
	 * Get alert points for a device from its reports
	 * @param devEui The device EUI
	 */
	public async getAlertPointsForDevice(devEui: string): Promise<ReportAlertPoint[]> {
		if (!devEui) {
			throw new Error('Device EUI not specified');
		}
		if (!(await this.checkUserHasAccess(devEui))) {
			throw new Error('User does not have access to this device');
		}

		try {
			const { data: reports, error: reportError } = await this.supabase
				.from('reports')
				.select('report_id, name, report_alert_points(*)')
				.eq('dev_eui', devEui)
				.limit(1);

			if (!reportError && reports && reports.length > 0 && reports[0].report_alert_points) {
				return reports[0].report_alert_points || [];
			}
			return [];
		} catch (error) {
			this.errorHandler.logError(error as Error);
			return [];
		}
	}

	private async checkUserHasAccess(dev_eui: string): Promise<boolean> {
		const session = await this.supabase.auth.getSession();
		if (!session || !session.data.session) {
			return false; // No session means no access
		}
		const user = session.data.session.user;
		if (!user || !user.email) {
			return false; // No user or email means no access
		}

		// Device owner shortcut
		const { data: deviceOwner, error: deviceOwnerError } = await this.supabase
			.from('cw_devices')
			.select('user_id')
			.eq('dev_eui', dev_eui)
			.maybeSingle();

		if (deviceOwnerError && deviceOwnerError.code !== 'PGRST116') {
			this.errorHandler.logError(deviceOwnerError);
			return false;
		}
		if (deviceOwner?.user_id === user.id) {
			return true;
		}

		const { data, error } = await this.supabase
			.from('cw_device_owners')
			.select('id')
			.eq('dev_eui', dev_eui)
			.eq('user_id', user.id)
			.maybeSingle();

		if (error && error.code !== 'PGRST116') {
			this.errorHandler.logError(error);
			return false;
		}

		return Boolean(data);
	}

	private aggregateTrafficCounts(records: Record<string, any>[]): DeviceDataRecord[] {
		if (!records || records.length === 0) {
			return [];
		}

		const grouped = new Map<string, DeviceDataRecord>();

		const toNumber = (value: unknown): number => {
			if (typeof value === 'number') return value;
			if (typeof value === 'string') {
				const trimmed = value.trim();
				if (trimmed.length === 0) return 0;
				const parsed = Number(trimmed);
				return Number.isNaN(parsed) ? 0 : parsed;
			}
			return 0;
		};

		for (const record of records) {
			if (!record) continue;

			const devEui = record.dev_eui;
			const trafficHour = record.traffic_hour;
			if (!devEui || !trafficHour) continue;

			const key = `${devEui}__${trafficHour}`;
			let aggregated = grouped.get(key);

			if (!aggregated) {
				aggregated = {
					dev_eui: devEui,
					traffic_hour: trafficHour,
					created_at: trafficHour
				} as DeviceDataRecord;
				grouped.set(key, aggregated);
			}

			for (const [field, value] of Object.entries(record)) {
				if (!field.endsWith('_count')) continue;
				if (field === 'line_number') continue;

				const existing = (aggregated as Record<string, any>)[field] ?? 0;
				(aggregated as Record<string, any>)[field] = existing + toNumber(value);
			}
		}

		const results = Array.from(grouped.values());
		results.sort((a, b) => {
			const aDate = new Date((a.traffic_hour as string) ?? (a.created_at as string) ?? 0);
			const bDate = new Date((b.traffic_hour as string) ?? (b.created_at as string) ?? 0);
			return bDate.getTime() - aDate.getTime();
		});

		const ensureFields = [
			'people_count',
			'bicycle_count',
			'motorcycle_count',
			'car_count',
			'truck_count',
			'bus_count'
		];

		return results.map((record) => {
			const copy = { ...record } as Record<string, any>;
			for (const field of ensureFields) {
				if (copy[field] === undefined || copy[field] === null) {
					copy[field] = 0;
				}
			}
			delete copy.line_number;
			delete copy.id;
			return copy as DeviceDataRecord;
		});
	}

	private async getLatestTrafficAggregate(devEui: string): Promise<DeviceDataRecord | null> {
		const { data: latestRows, error } = await this.supabase
			.from('cw_traffic2')
			.select('*')
			.eq('dev_eui', devEui)
			.order('traffic_hour', { ascending: false })
			.limit(10);

		if (error) {
			this.errorHandler.logError(error);
			throw new Error(`Error fetching latest traffic data: ${error.message}`);
		}

		if (!latestRows || latestRows.length === 0) {
			return null;
		}

		const latestHour = latestRows[0]?.traffic_hour;
		if (!latestHour) {
			return null;
		}

		const rowsForHour = latestRows.filter((row) => row?.traffic_hour === latestHour);

		// If the limited query includes all lines for the hour, aggregate directly.
		if (rowsForHour.length === latestRows.length) {
			const [aggregated] = this.aggregateTrafficCounts(rowsForHour);
			return aggregated ?? null;
		}

		// Otherwise fetch all rows for the hour to guarantee completeness.
		const { data: completeHourRows, error: hourError } = await this.supabase
			.from('cw_traffic2')
			.select('*')
			.eq('dev_eui', devEui)
			.eq('traffic_hour', latestHour);

		if (hourError) {
			this.errorHandler.logError(hourError);
			throw new Error(`Error fetching traffic data for hour ${latestHour}: ${hourError.message}`);
		}

		const [aggregated] = this.aggregateTrafficCounts(completeHourRows ?? []);
		return aggregated ?? null;
	}

	/**
	 * Convert user timezone dates to UTC for database queries
	 * @param date Date in user's timezone
	 * @param timezone User's timezone string
	 * @returns Date converted to UTC
	 */
	private convertUserTimezoneToUTC(date: Date, timezone: string): Date {
		if (timezone === 'UTC') {
			return date; // No conversion needed
		}

		// Create DateTime from the date's components in the specified timezone
		const year = date.getFullYear();
		const month = date.getMonth() + 1; // getMonth() returns 0-11, DateTime expects 1-12
		const day = date.getDate();
		const hour = date.getHours();
		const minute = date.getMinutes();
		const second = date.getSeconds();

		// Create DateTime in the user's timezone, then convert to UTC
		const dt = DateTime.fromObject(
			{
				year,
				month,
				day,
				hour,
				minute,
				second
			},
			{ zone: timezone }
		);

		return dt.toUTC().toJSDate();
	}

	/**
	 * Convert UTC timestamp back to user's timezone
	 * @param utcTimestamp UTC timestamp string
	 * @param timezone User's timezone string
	 * @returns Formatted timestamp in user's timezone
	 */
	private readonly timezoneOffsetPattern = /([zZ]|[+\-]\d{2}:?\d{2})$/;

	private convertUTCToUserTimezone(utcTimestamp: string | Date, timezone: string): string {
		if (!utcTimestamp) {
			return '';
		}
		if (utcTimestamp instanceof Date) {
			const asIso = DateTime.fromJSDate(utcTimestamp, { zone: 'utc' }).setZone(timezone).toISO();
			return asIso ?? utcTimestamp.toISOString();
		}

		const normalized =
			typeof utcTimestamp === 'string' ? utcTimestamp.trim() : String(utcTimestamp);
		if (!normalized) {
			return normalized;
		}
		if (timezone === 'UTC') {
			return normalized;
		}

		const hasOffset = this.timezoneOffsetPattern.test(normalized);
		let dt = DateTime.invalid('unparsed');

		if (hasOffset) {
			dt = DateTime.fromISO(normalized, { setZone: true });
			if (!dt.isValid) dt = DateTime.fromSQL(normalized, { setZone: true });
			if (!dt.isValid) dt = DateTime.fromRFC2822(normalized, { setZone: true });
		} else {
			dt = DateTime.fromISO(normalized, { zone: 'utc' });
			if (!dt.isValid) dt = DateTime.fromSQL(normalized, { zone: 'utc' });
			if (!dt.isValid) dt = DateTime.fromRFC2822(normalized, { zone: 'utc' });
		}

		if (!dt.isValid) {
			console.warn(`Failed to parse timestamp: ${utcTimestamp}`);
			return normalized;
		}

		return dt.setZone(timezone).toISO() ?? normalized;
	}

	/**
	 * Convert all timestamps in device data records from UTC to user timezone
	 * @param records Array of device data records
	 * @param timezone User's timezone string
	 * @param tableName Table name to determine timestamp field
	 * @returns Records with timestamps converted to user timezone
	 */
	private convertRecordTimestampsToUserTimezone(
		records: DeviceDataRecord[],
		timezone: string,
		tableName: string
	): DeviceDataRecord[] {
		if (timezone === 'UTC') {
			return records; // No conversion needed
		}

		return records.map((record) => {
			const convertedRecord = { ...record };

			// Convert main timestamp field
			const timestampField = tableName === 'cw_traffic2' ? 'traffic_hour' : 'created_at';
			if (convertedRecord[timestampField]) {
				convertedRecord[timestampField] = this.convertUTCToUserTimezone(
					convertedRecord[timestampField] as string,
					timezone
				);
			}

			// Ensure created_at is always present and converted
			if (convertedRecord.created_at) {
				convertedRecord.created_at = this.convertUTCToUserTimezone(
					convertedRecord.created_at,
					timezone
				);
			}

			return convertedRecord;
		});
	}

	private toCSV(records: Record<string, any>[], headers?: string[]): string {
		if (!records || records.length === 0) {
			return headers && headers.length ? headers.join(',') + '\n' : '';
		}
		const cols =
			headers && headers.length
				? headers
				: Array.from(new Set(records.flatMap((r) => Object.keys(r))));

		const escapeField = (val: any): string => {
			if (val === null || val === undefined) return '';
			if (typeof val === 'boolean') return val ? 't' : 'f';
			const s = String(val);
			const needsQuote = /[",\r\n]/.test(s);
			const escaped = s.replace(/"/g, '""');
			return needsQuote ? `"${escaped}"` : escaped;
		};

		const lines: string[] = [];
		lines.push(cols.join(','));
		for (const rec of records) {
			const row = cols.map((c) => escapeField(rec[c]));
			lines.push(row.join(','));
		}
		return lines.join('\n');
	}
}
