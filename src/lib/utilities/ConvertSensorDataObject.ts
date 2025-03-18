export function convertObject(input: Object | undefined, keepHidden: boolean = false) {
  if (!input) {
    return {}; // Return an empty object if input is undefined or null
  }

  const keysToKeep = [
    'temperature', 'temperatureC', 'humidity', 'dewPointC', 'rainfall', 'pressure',
    'wind_speed', 'wind_direction', 'lux', 'uv', 'co2', 'CO2', 'co2_level', 'soil_N', 'soil_P',
    'soil_K', 'soil_PH', 'ec', 'soil_EC', 'soil_moisture', 'soil_temperatureC', 'temperature_c', 'created_at',
    'battery_level', 'people_count', 'car_count', 'bicycle_count', 'motorcycle_count',
    'soil_temperature', 'soil_moisture', 'moisture', 'soil_temperatureC', 'soil_humidity', 'soil_ec',
    'soil_ph', 'ph', 'soil_nitrogen', 'soil_phosphorus', 'soil_potassium', 'soil_salinity',
    'soil_n', 'soil_p', 'soil_k', 'temperature_c', 'water_level', 'water_temperature', 'water_ph',
  ];

  if (keepHidden) {
    keysToKeep.push('fireAlarm');
  }

  const output = {};

  keysToKeep.forEach((key) => {
    if (key in input) {
      output[key] = input[key];
    }
  });

  if ('primaryData' in input && input.primaryData in output && 'primary_data_notation' in input) {
    output[input.primaryData] = `${output[input.primaryData]} ${input.primary_data_notation}`;
  }

  if ('secondaryData' in input && input.secondaryData in output && 'secondary_data_notation' in input) {
    output[input.secondaryData] = `${output[input.secondaryData]} ${input.secondary_data_notation}`;
  }

  return output;
}
