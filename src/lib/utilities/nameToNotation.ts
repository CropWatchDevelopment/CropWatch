export const nameToNotation = (name: string) => {
    switch (name) {
        case 'humidity':
        case 'soil_moisture':
            return '%';
        case 'temperature':
        case 'temperatureC':
        case 'dew_point':
        case 'dew_pointC':
        case 'dewPointC':
        case 'soil_temperatureC':
            return '°C';
        case 'soil_EC':
            return 'dS/m';
        case 'soil_N':
            return 'mg/kg';
        case 'soil_P':
            return 'mg/kg';
        case 'soil_K':
            return 'mg/kg';
        case 'soil_PH':
            return 'pH';
        case 'co2_level':
            return 'ppm';
        case 'vpd':
            return 'hPk';
        case 'rainfall':
            return 'mm/hr';
        case 'pressure':
            return 'hPa';
        case 'wind_speed':
            return 'm/s';
        case 'lux':
            return 'lux';
        case 'uv':
            return 'UVI';
        case 'wind_direction':
            return '°';
        case 'battery_level':
        case 'battery':
            return '%';
        default:
            return '';
    }
}