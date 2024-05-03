import type { Tables } from "../../database.types";
import type { IHighchartsData } from "./IHighchartsData.interface";

export class CWSS_TMEHighcharts implements IHighchartsData {
    private data: Tables<'seeed_sensecap_s2120'>[];

    constructor(data: Tables<'seeed_sensecap_s2120'>[]) {
        this.data = data;
    }

    public getHighchartsData(): {
        soil_temperatureC: [number, number][],
        soil_moisture: [number, number][],
        soil_EC: [number, number][]
    } {
        const result = {
            temperatureC: this.data.map(d => [new Date(d.created_at).valueOf(), d.temperatureC]),
            humidity: this.data.map(d => [new Date(d.created_at).valueOf(), d.humidity]),
            rainfall: this.data.map(d => [new Date(d.created_at).valueOf(), d.rainfall]),
            pressure: this.data.map(d => [new Date(d.created_at).valueOf(), d.pressure]),
            wind_speed: this.data.map(d => [new Date(d.created_at).valueOf(), d.wind_speed]),
            wind_direction: this.data.map(d => [new Date(d.created_at).valueOf(), d.wind_direction]),
            uv: this.data.map(d => [new Date(d.created_at).valueOf(), d.uv]),
        };
        return result;
    }
}