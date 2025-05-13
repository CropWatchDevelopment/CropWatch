export const dbColumnToName = (column: string): string => {
    if (!column) {
        return column; // Return the original column name if it's empty or undefined
    }
    column = column.toLowerCase(); // Normalize the column name
    switch (column) {
        case 'dev_eui':
            return 'Device EUI';
        case 'created_at':
            return 'Created At';
        case 'updated_at':
            return 'Updated At';
        case 'device_type':
            return 'Device Type';
        case 'device_name':
            return 'Device Name';
        case 'device_status':
            return 'Device Status';
        case 'temperature_c':
            return 'Temperature (°C)';
        case 'humidity':
            return 'Humidity (%)';
        case 'co2':
            return 'CO2 (ppm)';
        case 'battery_level':
            return 'Battery Level (%)';
        case 'moisture':
            return 'Moisture (%)';
        case 'ec':
            return 'Electrical Conductivity (mS/cm)';
        case 'ph':
            return 'pH Level';
        default:
            return column; // Return the original column name if no match is found
    }
};