import { CW_SS_TMEPNPK_DATA } from "./convert_cw-ss-tmepnpk";
import { CW_AIR_THVD_DATA } from "./convert_cw_air_thvd";
import { CW_AIR_CO2_DATA } from "./convert_cw_air_co2";
import { CW_SS_TME_DATA } from "./convert_cw_ss_tme";
import { SEEED_T1000 } from "./convert_seeed_t1000";
import { SEEED_S2103_WATERLEVEL } from "./convert_seeed_S2103_waterlevel";

export const SensorDtoSelector = (sensor_table_name: string, data: any) => {
    switch (sensor_table_name) {
        case 'cw_air_thvd':
            return CW_AIR_THVD_DATA(data);
        case 'cw_ss_tme':
            return CW_SS_TME_DATA(data);
        case 'cw_ss_tmepnpk':
            return CW_SS_TMEPNPK_DATA(data);
        case 'seeed_t1000':
            return SEEED_T1000(data);
        case 'cw_air_co2':
        case 'seeed_co2_lorawan_uplinks':
            return CW_AIR_CO2_DATA(data);
        case 'seeed_sensecap_s2103_WaterLevel':
            return SEEED_S2103_WATERLEVEL(data);
        default:
            break;
    }
}