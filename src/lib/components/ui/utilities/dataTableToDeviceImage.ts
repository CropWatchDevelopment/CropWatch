import SEEED_T1000_IMAGE from '$lib/images/devices/seeed-t1000.png';
import SEEED_S2103_IMAGE from '$lib/images/devices/seeed_sensecap_s210x.png';
import SEEED_S2120_IMAGE from '$lib/images/devices/seeed_sensecap_s2120.png';
import SEEED_S2103_WATER_LEVEL_IMAGE from '$lib/images/devices/seeed_sensecap_s2103_WaterLevel.png';
import NETVOX_RA02A_IMAGE from '$lib/images/devices/netvox_ra02a.png';
import CW_SS_TMEPNPK_IMAGE from '$lib/images/devices/CW-SS-TMEPNPK.png';
import LORA_IMAGE from '$lib/images/devices/lora.png';

export const dataTableToDeviceImage = (name: string) => {
    switch (name) {
        case 'seeed_t1000':
            return SEEED_T1000_IMAGE;
        case 'seeed_co2_lorawan_uplinks':
        case 'cw_air_thvd':
            return SEEED_S2103_IMAGE;
        case 'netvox_ra02a':
            return NETVOX_RA02A_IMAGE;
        case 'seeed_sensecap_s2103_WaterLevel':
            return SEEED_S2103_WATER_LEVEL_IMAGE;
        case 'seeed_sensecap_s2120':
            return SEEED_S2120_IMAGE;
        case 'cw_ss_tme':
        case 'cw_ss_tmepnpk':
            return CW_SS_TMEPNPK_IMAGE;
        default:
            return LORA_IMAGE;
    }
}