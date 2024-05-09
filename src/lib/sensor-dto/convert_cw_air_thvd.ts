export const CW_AIR_THVD_DATA = (data: any) => {
    if (!Array.isArray(data)) {
        return {
            temperatureC: data.temperatureC,
            humidity: data.humidity,
            vpd: data.vpd,
            dewPointC: data.dewPointC,
        };
    } else {
        if (!data.length) return null;
        return {
            temperatureC: data[0].temperatureC,
            humidity: data[0].humidity,
            vpd: data[0].vpd,
            dewPointC: data[0].dewPointC,
        };
    }
};