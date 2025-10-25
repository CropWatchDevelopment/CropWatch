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
		if (!this.checkUserHasAccess(devEui)) {
			throw new Error('User does not have access to this device');
		}
		const cw_device = await this.getDeviceAndType(devEui);
		return cw_device as unknown as DeviceDataRecord;
		// const tableName = cw_device.cw_device_type.data_table_v2; // Pull out the table name

		// try {
		// 	const { data, error } = await this.supabase
		// 		.from(tableName)
		// 		.select()
		// 		.eq('dev_eui', devEui)
		// 		.order('created_at', { ascending: false })
		// 		.limit(1)
		// 		.maybeSingle();

		// 	if (error) {
		// 		this.errorHandler.logError(error);
		// 		throw new Error(`Error fetching columns: ${error.message}`);
		// 	}

		// 	return data as DeviceDataRecord;
		// } catch (error) {
		// 	this.errorHandler.logError(error as Error);
		// 	if (error instanceof Error && error.message.includes('AbortError')) {
		// 		return {
		// 			error: 'Data retrieval timed out',
		// 			partial: true,
		// 			dev_eui: devEui,
		// 			created_at: new Date().toISOString(),
		// 			note: 'This is a placeholder due to query timeout'
		// 		};
		// 	}
		// 	throw error;
		// }
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
		if (!this.checkUserHasAccess(devEui)) {
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
				.gte(tableName == 'cw_traffic2' ? 'traffic_hour' : 'created_at', utcStartDate.toISOString()) // SHIT FIX #1, traffic camera specific
				.lte(tableName == 'cw_traffic2' ? 'traffic_hour' : 'created_at', utcEndDate.toISOString()) // SHIT FIX #2, traffic camera specific
				.order(tableName == 'cw_traffic2' ? 'traffic_hour' : 'created_at', { ascending: false }); // SHIT FIX #3, traffic camera specific
			// .limit(maxDataToReturn);

			// SHIT FIX #4, traffic camera specific
			if (tableName == 'cw_traffic2') {
				const trafficData = (data || []).map((record: any) => ({
					...record,
					created_at: record.traffic_hour,
					dev_eui: record.dev_eui,
					note: 'Traffic data formatted'
				})) as DeviceDataRecord[];

				// Convert timestamps back to user timezone
				return this.convertRecordTimestampsToUserTimezone(trafficData, timezone, tableName);
			}
			// END OF SHIT FIX

			const records = (data || []) as DeviceDataRecord[];
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
		if (!this.checkUserHasAccess(devEui)) {
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
				.gte(tableName == 'cw_traffic2' ? 'traffic_hour' : 'created_at', utcStartDate.toISOString()) // SHIT FIX #1, traffic camera specific
				.lte(tableName == 'cw_traffic2' ? 'traffic_hour' : 'created_at', utcEndDate.toISOString()) // SHIT FIX #2, traffic camera specific
				.order(tableName == 'cw_traffic2' ? 'traffic_hour' : 'created_at', { ascending: false }); // SHIT FIX #3, traffic camera specific

			if (error) {
				this.errorHandler.logError(error);
				throw new Error(`Error fetching CSV data: ${error.message}`);
			}

			const rows = ((data || []) as Record<string, any>[]).map((r) => ({ ...r }));
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
		if (!this.checkUserHasAccess(devEui)) {
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
		if (!this.checkUserHasAccess(devEui)) {
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
				'get_filtered_device_report_data_multi',
				{
					p_dev_id: devEui,
					p_start_time: startDate,
					p_end_time: endDate,
					p_interval_minutes: intervalMinutes,
					p_columns: p_columns,
					p_ops: p_ops,
					p_mins: p_mins,
					p_maxs: p_maxs
				}
			);

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
			return data as DeviceDataRecord[];
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
		if (!this.checkUserHasAccess(devEui)) {
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
		// Placeholder for user access check logic
		// This should be implemented based on your authentication and authorization system
		const session = await this.supabase.auth.getSession();
		if (!session || !session.data.session) {
			return false; // No session means no access
		}
		const user = session.data.session.user;
		if (!user || !user.email) {
			return false; // No user or email means no access
		}

		const { data, error } = await this.supabase
			.from('cw_device_owners')
			.select('*')
			.eq('dev_eui', dev_eui)
			.eq('user_id', user.id)
			.single();
		if (error) {
			this.errorHandler.logError(error);
			return false; // Error checking access
		}
		return true; // Default to true for now
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
	private convertUTCToUserTimezone(utcTimestamp: string, timezone: string): string {
		if (timezone === 'UTC') {
			return utcTimestamp; // No conversion needed
		}

		// Parse UTC timestamp and convert to user timezone
		let dt = DateTime.fromISO(utcTimestamp, { zone: 'UTC' });

		if (!dt.isValid) {
			// Try parsing as SQL format if ISO fails
			dt = DateTime.fromSQL(utcTimestamp, { zone: 'UTC' });
			if (!dt.isValid) {
				console.warn(`Failed to parse timestamp: ${utcTimestamp}`);
				return utcTimestamp; // Return original if parsing fails
			}
		}

		// Convert to user timezone and return as ISO string
		const converted = dt.setZone(timezone);
		const result = converted.toISO();

		if (!result) {
			console.warn(`Failed to convert timestamp to timezone ${timezone}: ${utcTimestamp}`);
			return utcTimestamp;
		}

		return result;
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
