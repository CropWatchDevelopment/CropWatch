type SensorInput = Record<string, unknown> & {
	primaryData?: string;
	secondaryData?: string;
	primary_data_notation?: string;
	secondary_data_notation?: string;
};

export function convertObject(
	input: SensorInput | null | undefined,
	keepHidden: boolean = false
): Record<string, unknown> {
	if (!input) {
		return {};
	}

	const keysToKeep: string[] = [
		'temperature',
		'temperatureC',
		'humidity',
		'dewPointC',
		'rainfall',
		'pressure',
		'wind_speed',
		'wind_direction',
		'lux',
		'uv',
		'co2',
		'CO2',
		'co2_level',
		'soil_N',
		'soil_P',
		'soil_K',
		'soil_PH',
		'ec',
		'soil_EC',
		'soil_moisture',
		'soil_temperatureC',
		'temperature_c',
		'created_at',
		'battery_level',
		'people_count',
		'car_count',
		'bicycle_count',
		'motorcycle_count',
		'soil_temperature',
		'soil_moisture',
		'moisture',
		'soil_humidity',
		'soil_ec',
		'soil_ph',
		'ph',
		'soil_nitrogen',
		'soil_phosphorus',
		'soil_potassium',
		'soil_salinity',
		'soil_n',
		'soil_p',
		'soil_k',
		'water_level',
		'water_temperature',
		'water_ph'
	];

	if (keepHidden) {
		keysToKeep.push('fireAlarm');
	}

	const output: Record<string, unknown> = {};

	for (const key of keysToKeep) {
		if (Object.prototype.hasOwnProperty.call(input, key)) {
			output[key] = input[key];
		}
	}

	if (input.primaryData && input.primaryData in output && input.primary_data_notation) {
		const targetKey = input.primaryData;
		output[targetKey] = `${output[targetKey]} ${input.primary_data_notation}`.trim();
	}

	if (input.secondaryData && input.secondaryData in output && input.secondary_data_notation) {
		const targetKey = input.secondaryData;
		output[targetKey] = `${output[targetKey]} ${input.secondary_data_notation}`.trim();
	}

	return output;
}
