import { DateTime } from 'luxon';
import type { IDeviceDataService } from '../interfaces/IDeviceDataService';
import type { DeviceType } from '../models/Device';
import type { DeviceDataRecord } from '../models/DeviceDataRecord';
import { ErrorHandlingService } from '../errors/ErrorHandlingService';
import type { SupabaseClient } from '@supabase/supabase-js';

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
	 * @param deviceType The device type information containing data_table_v2
	 */
	public async getLatestDeviceData(
		devEui: string,
		_deviceType: DeviceType
	): Promise<DeviceDataRecord | null> {
		if (!devEui) {
			throw new Error('Device EUI not specified');
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
				.single();

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
				.gte('created_at', startDate.toISOString())
				.lte('created_at', endDate.toISOString())
				.order('created_at', { ascending: false });
			// .limit(maxDataToReturn);

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

	/**
	 * Calls the `get_report_data_for_device` stored procedure to fetch:
	 *   1. Sampled device telemetry (`device_data`) at a regular interval or
	 *      whenever an alert condition is hit.
	 *   2. The associated report metadata (`report_info`), including alert thresholds,
	 *      recipient lists, and schedule rules.
	 *
	 * @param devEui
	 *   The LoRaWAN DevEUI of the target device (e.g. '373632336F32840A').
	 * @param start
	 *   ISO-8601 timestamp marking the inclusive lower bound for data selection.
	 *   Can include a timezone offset (e.g. '2025-06-01T00:00:00+09').
	 * @param end
	 *   ISO-8601 timestamp marking the exclusive upper bound for data selection.
	 *   Can include a timezone offset (e.g. '2025-06-09T00:00:00+09').
	 * @param timezone
	 *   IANA time zone name used to shift `created_at` from UTC into local time
	 *   for formatting in the result (default: 'UTC').
	 * @param intervalMinutes
	 *   Sampling interval in minutes. Records will be returned at each multiple
	 *   of this interval from `start` onward, plus any rows that trigger an alert
	 *   threshold (default: 60).
	 *
	 * @returns
	 *   A promise resolving to an object with two arrays:
	 *   - `device_data`: Array of telemetry objects with null fields stripped
	 *     and unwanted keys removed.
	 *   - `report_info`: Array of report definitions, each with:
	 *       • `alert_points[]`
	 *       • `recipients[]`
	 *       • `schedules[]`
	 *
	 * @throws
	 *   Rethrows any Supabase RPC error if the call fails.
	 */
	public async getDeviceDataForReport(
		devEui: string,
		startDate: Date,
		endDate: Date,
		intervalMinutes: number = 30,
		timezone: string = 'Asia/Tokyo'
	): Promise<DeviceDataRecord[]> {
		if (!devEui) {
			throw new Error('Device EUI not specified');
		}
		if (!startDate || !endDate) {
			throw new Error('Start date and end date must be specified');
		}
		if (startDate > endDate) {
			throw new Error('Start date must be before end date');
		}

		const { data, error } = await this.supabase.rpc('get_report_data_for_device', {
			input_dev_eui: devEui,
			input_start: startDate,
			input_end: endDate,
			input_timezone: timezone,
			input_interval_minutes: intervalMinutes
		});

		if (error) {
			// You can inspect error.code or .details here for more nuance
			throw new Error(`Error fetching device report data: ${error.message}`);
		}

		// Supabase returns JSONB rows; cast to your interface
		return (data ?? []) as DeviceDataRecord[];
	}
}
