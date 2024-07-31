export const SEEED_S2103_WATERLEVEL = (data: any) => {
    if (!Array.isArray(data)) {
        return {
            water_level: data.water_level,
        };
    } else {
        if (!data.length) return null;
        return {
            water_level: data[0].water_level,
        };
    }
};