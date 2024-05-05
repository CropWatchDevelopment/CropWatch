export const CW_AIR_CO2_DATA = (data: any) => {
    if (!Array.isArray(data)) {
        return {
            temperatureC: data.temperatureC,
            temperature: data.temperature,
            humidity: data.humidity,
            co2_level: data.co2_level,
            pressure: data.dewPointC,
        };
    } else {
        if (!data.length) return null;
        return {
            temperatureC: data[0].temperatureC,
            temperature: data[0].temperature,
            humidity: data[0].humidity,
            co2_level: data[0].co2_level,
            pressure: data[0].dewPointC,
        };
    }
};