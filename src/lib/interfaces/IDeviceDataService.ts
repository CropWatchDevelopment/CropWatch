import type { DeviceType } from '../models/Device';
import type { DeviceDataRecord } from '../models/DeviceDataRecord';

/**
 * Interface for dynamic device data retrieval based on device type
 */
export interface IDeviceDataService {
	/**
	 * Get the latest data for a device based on its type
	 * @param devEui The device EUI
	 * @param deviceType The device type information containing data_table_v2
	 */
	getLatestDeviceData(devEui: string, deviceType: DeviceType): Promise<DeviceDataRecord | null>;

	/**
	 * Get device data within a date range based on device type
	 * @param devEui The device EUI
	 * @param deviceType The device type information containing data_table_v2
	 * @param startDate The start date
	 * @param endDate The end date
	 */
	getDeviceDataByDateRange(
		devEui: string,
		startDate: Date,
		endDate: Date
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
	getAlertPointsForDevice(devEui: string): Promise<DeviceDataRecord[]>;
}
