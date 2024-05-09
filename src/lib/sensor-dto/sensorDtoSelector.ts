import { CW_SS_TMEPNPK_DATA } from "./convert_cw-ss-tmepnpk";
import { CW_AIR_THVD_DATA } from "./convert_cw_air_thvd";
import { CW_AIR_CO2_DATA } from "./convert_cw_air_co2";
import { CW_SS_TME_DATA } from "./convert_cw_ss_tme";

export const SensorDtoSelector = (sensor_table_name: string, data: any) => {
    switch (sensor_table_name) {
        case 'cw_air_thvd':
            return CW_AIR_THVD_DATA(data);
        case 'cw_ss_tme':
            return CW_SS_TME_DATA(data);
        case 'cw_ss_tmepnpk':
            return CW_SS_TMEPNPK_DATA(data);
        case 'cw_air_co2':
        case 'seeed_co2_lorawan_uplinks':
            return CW_AIR_CO2_DATA(data);
        default:
            break;
    }
}