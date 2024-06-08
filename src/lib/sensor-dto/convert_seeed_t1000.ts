export const SEEED_T1000 = (data: any) => {
    if (!Array.isArray(data)) {
        return {
            created_at: data.created_at,
            temperatureC: data.temperatureC,
            latitude: data.latitude,
            longitude: data.longitude,
            battery_level: data.battery_level,
        };
    } else {
        if (!data.length) return null;
        return {
            // created_at: data[0].created_at,
            temperatureC: data[0].temperatureC,
            latitude: data[0].latitude,
            longitude: data[0].longitude,
            battery_level: data[0].battery_level,
        };
    }
};