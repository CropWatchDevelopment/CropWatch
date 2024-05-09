export const nameToNotation = (name: string) => {
    switch (name) {
        case 'humidity':
        case 'soil_moisture':
            return '%';
        case 'temperature':
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
        default:
            return '';
    }
}