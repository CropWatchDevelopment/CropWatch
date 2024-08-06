export const nameToEmoji = (name: string) => {
    switch (name) {
        case 'soil_moisture':
            return '💧';
        case 'humidity':
            return '💨';
        case 'dew_point':
        case 'dew_pointC':
        case 'dewPointC':
            return '💦';
        case 'temperature':
        case 'temperatureC':
        case 'soil_temperatureC':
            return '🌡️';
        case 'soil_EC':
            return '🧂';
        case 'soil_N':
            return '🧪';
        case 'soil_P':
            return '🧪';
        case 'soil_K':
            return '🧪';
        case 'soil_PH':
            return '⚗️';
        case 'co2_level':
            return '⌬';
        case 'vpd':
            return '💦';
        case 'rainfall':
            return '🌧️';
        case 'pressure':
            return '🕕';
        case 'created_at':
            return '⌛';
        case 'wind_speed':
            return '🍃';
        case 'lux':
            return '☀️';
        case 'uv':
            return '☢️';
        case 'wind_direction':
            return '🧭';
        case 'water_level':
            return '📏';
        case 'battery_level':
        case 'battery':
        case 'Battery':
            return '🔋';
        case 'sos':
            return '🆘';
        case 'fire':
            return '🔥';
        default:
            return '';
    }
}