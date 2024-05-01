import type { Tables } from "../../database.types";
import type { IHighchartsData } from "./IHighchartsData.interface";
import { CWAirTHVDHighcharts } from "./cw_air_thvd";
import { CWSS_TMEHighcharts } from "./cw_ss_tme";

type TableType = 'cw_air_thvd' | 'cw_ss_tme';

export class HighchartsDataFactory {
    public static create(tableType: TableType, data: Tables<any>[]): IHighchartsData {
        switch (tableType) {
            case 'cw_air_thvd':
                return new CWAirTHVDHighcharts(data as Tables<'cw_air_thvd'>[]);
            case 'cw_ss_tme':
                return new CWSS_TMEHighcharts(data as Tables<'cw_ss_tme'>[]);
            default:
                throw new Error("Invalid table type provided");
        }
    }
}
