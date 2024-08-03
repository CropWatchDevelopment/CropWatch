export const CW_AIR_THVD_DATA = (data: any) => {
    if (!Array.isArray(data)) {
        return {
            temperatureC: data.temperatureC,
            humidity: data.humidity,
            dewPointC: data.dewPointC,
        };
    } else {
        if (!data.length) return null;
        return {
            temperatureC: data[0].temperatureC,
            humidity: data[0].humidity,
            dewPointC: data[0].dewPointC,
        };
    }
};