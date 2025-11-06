import type { AirData } from '../models/AirData';

/**
 * DTO for air data creation
 */
export interface CreateAirDataDto {
	/**
	 * Device EUI
	 */
	dev_eui: string;

	/**
	 * Temperature in Celsius
	 */
	temperature_c?: number;

	/**
	 * Humidity percentage
	 */
	humidity?: number;

	/**
	 * CO level
	 */
	co?: number;

	/**
	 * CO2 level
	 */
	co2?: number;

	/**
	 * Pressure value
	 */
	pressure?: number;

	/**
	 * Light level in lux
	 */
	lux?: number;

	/**
	 * Battery level percentage
	 */
	battery_level?: number;

	/**
	 * UV index
	 */
	uv_index?: number;

	/**
	 * Rainfall amount
	 */
	rainfall?: number;

	/**
	 * Wind speed
	 */
	wind_speed?: number;

	/**
	 * Wind direction in degrees
	 */
	wind_direction?: number;

	/**
	 * Whether smoke is detected
	 */
	smoke_detected?: boolean;

	/**
	 * Whether vape is detected
	 */
	vape_detected?: boolean;

	/**
	 * Whether this data point is simulated
	 */
	is_simulated?: boolean;
}

/**
 * DTO for air data responses
 */
export interface AirDataDto {
	/**
	 * Device EUI
	 */
	dev_eui: string;

	/**
	 * Temperature in Celsius
	 */
	temperature_c?: number;

	/**
	 * Humidity percentage
	 */
	humidity?: number;

	/**
	 * CO level
	 */
	co?: number;

	/**
	 * CO2 level
	 */
	co2?: number;

	/**
	 * Pressure value
	 */
	pressure?: number;

	/**
	 * Light level in lux
	 */
	lux?: number;

	/**
	 * Battery level percentage
	 */
	battery_level?: number;

	/**
	 * UV index
	 */
	uv_index?: number;

	/**
	 * Rainfall amount
	 */
	rainfall?: number;

	/**
	 * Wind speed
	 */
	wind_speed?: number;

	/**
	 * Wind direction in degrees
	 */
	wind_direction?: number;

	/**
	 * Whether smoke is detected
	 */
	smoke_detected?: boolean;

	/**
	 * Whether vape is detected
	 */
	vape_detected?: boolean;

	/**
	 * Timestamp when the data was created
	 */
	created_at: string;

	/**
	 * Whether this data point is simulated
	 */
	is_simulated: boolean;
}

/**
 * DTO for historical/time-series air data
 */
export interface TimeSeriesAirDataDto {
	/**
	 * Timestamp for the data point
	 */
	timestamp: string;

	/**
	 * Array of air data readings
	 */
	readings: AirDataDto[];
}

/**
 * Maps an AirData entity to an AirDataDto
 * @param airData The air data entity to map
 * @returns AirDataDto
 */
export function toAirDataDto(airData: AirData): AirDataDto {
	return {
		dev_eui: airData.dev_eui,
		temperature_c: airData.temperature_c ?? undefined,
		humidity: airData.humidity ?? undefined,
		co: airData.co ?? undefined,
		co2: airData.co2 ?? undefined,
		pressure: airData.pressure ?? undefined,
		lux: airData.lux ?? undefined,
		battery_level: airData.battery_level ?? undefined,
		uv_index: airData.uv_index ?? undefined,
		rainfall: airData.rainfall ?? undefined,
		wind_speed: airData.wind_speed ?? undefined,
		wind_direction: airData.wind_direction ?? undefined,
		smoke_detected: airData.smoke_detected ?? undefined,
		vape_detected: airData.vape_detected ?? undefined,
		created_at: airData.created_at,
		is_simulated: airData.is_simulated ?? false
	};
}

/**
 * Groups air data by time for time-series display
 * @param airData Array of air data entities
 * @param groupByInterval The interval to group by (e.g., 'day', 'hour')
 * @returns Array of TimeSeriesAirDataDto
 */
export function toTimeSeriesAirDataDto(
	airData: AirData[],
	groupByInterval: 'hour' | 'day' | 'week' | 'month' = 'hour'
): TimeSeriesAirDataDto[] {
	const groupedData = new Map<string, AirData[]>();

	// Group the data by the specified time interval
	for (const data of airData) {
		const date = new Date(data.created_at);
		let groupKey: string;

		switch (groupByInterval) {
			case 'day':
				groupKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
				break;
			case 'week':
				// Get the date of the Monday of the current week
				const day = date.getDay();
				const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
				const monday = new Date(date);
				monday.setDate(diff);
				groupKey = monday.toISOString().split('T')[0];
				break;
			case 'month':
				groupKey = date.toISOString().substring(0, 7); // YYYY-MM
				break;
			case 'hour':
			default:
				groupKey = date.toISOString().substring(0, 13); // YYYY-MM-DDTHH
		}

		if (!groupedData.has(groupKey)) {
			groupedData.set(groupKey, []);
		}

		groupedData.get(groupKey)!.push(data);
	}

	// Convert the grouped data to DTOs
	return Array.from(groupedData.entries()).map(([timestamp, dataPoints]) => ({
		timestamp,
		readings: dataPoints.map(toAirDataDto)
	}));
}
