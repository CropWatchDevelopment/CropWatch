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
		const tableName = cw_device.cw_device_type.data_table_v2; // Pull out the table name

		try {
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
	 * @param startDate The start date
	 * @param endDate The end date
	 */
	public async getDeviceDataByDateRange(
		devEui: string,
		startDate: Date,
		endDate: Date
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
				.gte(tableName == 'cw_traffic2' ? 'traffic_hour' : 'created_at', startDate.toISOString()) // SHIT FIX #1, traffic camera specific
				.lte(tableName == 'cw_traffic2' ? 'traffic_hour' : 'created_at', endDate.toISOString()) // SHIT FIX #2, traffic camera specific
				.order(tableName == 'cw_traffic2' ? 'traffic_hour' : 'created_at', { ascending: false }); // SHIT FIX #3, traffic camera specific
			// .limit(maxDataToReturn);

			// SHIT FIX #4, traffic camera specific
			if (tableName == 'cw_traffic2') {
				return (data || []).map((record: any) => ({
					...record,
					created_at: record.traffic_hour,
					dev_eui: record.dev_eui,
					note: 'Traffic data formatted'
				})) as DeviceDataRecord[];
			}
			// END OF SHIT FIX

			return (data || []) as DeviceDataRecord[];
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
	 * @param startDate The start date
	 * @param endDate The end date
	 */
	public async getDeviceDataByDateRangeAsCSV(
		devEui: string,
		startDate: Date,
		endDate: Date
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
				.gte(tableName == 'cw_traffic2' ? 'traffic_hour' : 'created_at', startDate.toISOString()) // SHIT FIX #1, traffic camera specific
				.lte(tableName == 'cw_traffic2' ? 'traffic_hour' : 'created_at', endDate.toISOString()) // SHIT FIX #2, traffic camera specific
				.order(tableName == 'cw_traffic2' ? 'traffic_hour' : 'created_at', { ascending: false }) // SHIT FIX #3, traffic camera specific
				.csv();

			return (data || []) as DeviceDataRecord[];
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
			let p_columns = columns.length === 0 ? columns : ['temperature_c', 'humidity'];
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
								p_columns.push(point.data_point_key);
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
}
