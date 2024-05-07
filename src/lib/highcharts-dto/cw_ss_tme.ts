import type { Tables } from "../../database.types";
import type { IHighchartsData } from "./IHighchartsData.interface";

export class CWSS_TMEHighcharts implements IHighchartsData {
    private data: Tables<'cw_ss_tme'>[];

    constructor(data: Tables<'cw_ss_tme'>[]) {
        this.data = data;
    }

    public getHighchartsData(): {
        soil_temperatureC: [number, number][],
        soil_moisture: [number, number][],
        soil_EC: [number, number][]
    } {
        const result = {
            soil_temperatureC: this.data.map(d => [new Date(d.created_at).valueOf(), d.soil_temperatureC]),
            soil_moisture: this.data.map(d => [new Date(d.created_at).valueOf(), d.soil_moisture]),
            soil_EC: this.data.map(d => [new Date(d.created_at).valueOf(), d.soil_EC]),
        };
        return result;
    }

}