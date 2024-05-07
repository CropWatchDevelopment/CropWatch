export class CWAirTHVDHighcharts implements IHighchartsData {
    private data: Tables<'cw_air_thvd'>[];

    constructor(data: Tables<'cw_air_thvd'>[]) {
        this.data = data;
    }

    public getHighchartsData(): {
        temperatureC: [number, number][],
        humidity: [number, number][],
        vpd: [number, number][],
        dewPointC: [number, number][]
    } {
        const result = {
            temperatureC: this.data.map(d => [new Date(d.created_at).valueOf(), d.temperatureC]),
            humidity: this.data.map(d => [new Date(d.created_at).valueOf(), d.humidity]),
            vpd: this.data.map(d => [new Date(d.created_at).valueOf(), d.vpd]),
            dewPointC: this.data.map(d => [new Date(d.created_at).valueOf(), d.dewPointC]),
        };
        return result;
    }
}