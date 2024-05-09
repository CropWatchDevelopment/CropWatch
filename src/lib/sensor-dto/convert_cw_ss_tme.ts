export const CW_SS_TME_DATA = (data: any) => {
    if (!Array.isArray(data)) {
        return {
            soil_temperatureC: data.soil_temperatureC,
            soil_moisture: data.soil_moisture,
            soil_EC: data.soil_EC,
        };
    } else {
        if (!data.length) return null;
        return {
            soil_temperatureC: data[0].soil_temperatureC,
            soil_moisture: data[0].soil_moisture,
            soil_EC: data[0].soil_EC,
        };
    }
};