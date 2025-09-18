import type { ReportAlertPoint } from '../models/Report';
import type { DeviceType } from '../models/Device';
import type { DeviceDataRecord } from '../models/DeviceDataRecord';

/**
 * Interface for dynamic device data retrieval based on device type
 */
export interface IDeviceDataService {
	/**
	 * Get the latest data for a device based on its type
	 * @param devEui The device EUI
	 */
	getLatestDeviceData(devEui: string): Promise<DeviceDataRecord | null>;

	/**
	 * Get device data within a date range based on device type
	 * @param devEui The device EUI
	 * @param startDate The start date in user's timezone
	 * @param endDate The end date in user's timezone
	 * @param timezone The user's timezone (e.g., 'Asia/Tokyo', 'America/New_York')
	 */
	getDeviceDataByDateRange(
		devEui: string,
		startDate: Date,
		endDate: Date,
		timezone?: string
	): Promise<DeviceDataRecord[]>;

	/**
	 * Get device data within a date range based on device type as CSV
	 * @param devEui The device EUI
	 * @param startDate The start date in user's timezone
	 * @param endDate The end date in user's timezone
	 * @param timezone The user's timezone (e.g., 'Asia/Tokyo', 'America/New_York')
	 */
	getDeviceDataByDateRangeAsCSV(
		devEui: string,
		startDate: Date,
		endDate: Date,
		timezone?: string
	): Promise<DeviceDataRecord[]>;

	/**
	 * Get device data for report with optional filtering
	 * @param params.devEui The device EUI
	 * @param params.startDate The start date
	 * @param params.endDate The end date
	 * @param params.timezone The timezone
	 * @param params.intervalMinutes The interval in minutes
	 * @param params.columns Optional columns to filter
	 * @param params.ops Optional operators for filtering
	 * @param params.mins Optional minimum values
	 * @param params.maxs Optional maximum values
	 */
	getDeviceDataForReport({
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
	}): Promise<DeviceDataRecord[]>;

	/**
	 * Get alert points for a device from its reports
	 * @param devEui The device EUI
	 */
	getAlertPointsForDevice(devEui: string): Promise<ReportAlertPoint[]>;
}
