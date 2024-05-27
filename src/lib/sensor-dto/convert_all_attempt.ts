interface InputObject {
    [key: string]: any;
}

interface OutputObject {
    [key: string]: string | number | null;
}

export function convertObject(input: InputObject): OutputObject {
    const keysToKeep = [
      'temperature', 'temperatureC', 'humidity', 'dewPointC', 'vpd', 'rainfall', 'pressure',
      'wind_speed', 'wind_direction', 'lux', 'uv', 'co2_level', 'soil_N', 'soil_P',
      'soil_K', 'soil_PH', 'soil_EC', 'soil_moisture', 'soil_temperatureC'
    ];
  
    const output: OutputObject = {};
  
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