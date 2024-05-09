export const CW_SS_TMEPNPK_DATA = (data: any) => {
    if (!Array.isArray(data)) {
        return {
            soil_temperatureC: data.soil_temperatureC,
            soil_moisture: data.soil_moisture,
            soil_EC: data.soil_EC,
            soil_N: data.soil_N,
            soil_P: data.soil_P,
            soil_K: data.soil_K,
            soil_PH: data.soil_PH,
        };
    } else {
        if (!data.length) return null;
        return {
            soil_temperatureC: data[0].soil_temperatureC,
            soil_moisture: data[0].soil_moisture,
            soil_EC: data[0].soil_EC,
            soil_N: data[0].soil_N,
            soil_P: data[0].soil_P,
            soil_K: data[0].soil_K,
            soil_PH: data[0].soil_PH,
        };
    }
};