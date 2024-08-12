import Highcharts from 'highcharts';
import HighchartsMore from 'highcharts/highcharts-more';
import SolidGauge from 'highcharts/modules/solid-gauge';
import HighchartsWindbarb from 'highcharts/modules/windbarb';

HighchartsMore(Highcharts);
SolidGauge(Highcharts);
HighchartsWindbarb(Highcharts);

interface MeteogramData {
    temperatures: { x: number; y: number }[];
    precipitations: { x: number; y: number }[];
    winds: { x: number; value: number; direction: number }[];
    pressures: { x: number; y: number }[];
}

export class Meteogram {
    private container: HTMLElement;
    private temperatures: any[] = [];
    private precipitations: any[] = [];
    private winds: any[] = [];
    private pressures: any[] = [];
    private chart: Highcharts.Chart | null = null;

    constructor(data: MeteogramData, container: HTMLElement) {
        this.container = container;
        this.temperatures = data.temperatures;
        this.precipitations = data.precipitations;
        this.winds = data.winds;
        this.pressures = data.pressures;

        this.createChart();
    }

    private getChartOptions(): Highcharts.Options {
        return {
            chart: {
                renderTo: this.container,
                marginBottom: 70,
                marginRight: 40,
                marginTop: 50,
                plotBorderWidth: 1,
                height: 310,
                alignTicks: false,
                scrollablePlotArea: {
                    minWidth: 720
                }
            },
            title: {
                text: 'Meteogram for Sensor Data',
                align: 'left',
                style: {
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis'
                }
            },
            tooltip: {
                shared: true,
                useHTML: true,
                headerFormat: '<small>{point.x:%A, %b %e, %H:%M}</small><br><b>{point.point.symbolName}</b><br>'
            },
            xAxis: [{
                type: 'datetime',
                tickInterval: 2 * 36e5, // two hours
                minorTickInterval: 36e5, // one hour
                tickLength: 0,
                gridLineWidth: 1,
                gridLineColor: 'rgba(128, 128, 128, 0.1)',
                labels: {
                    format: '{value:%H}',
                    style: {
                        color: '#333'
                    }
                },
                crosshair: true
            }],
            yAxis: [{
                title: {
                    text: 'Temperature (°C)',
                    style: {
                        color: Highcharts.getOptions().colors[0]
                    }
                },
                labels: {
                    format: '{value}°C',
                    style: {
                        color: Highcharts.getOptions().colors[0]
                    },
                    x: -3
                },
                gridLineColor: 'rgba(128, 128, 128, 0.1)',
                maxPadding: 0.3,
                tickInterval: 1,
                opposite: false
            }, {
                title: {
                    text: 'Precipitation (%)',
                    style: {
                        color: Highcharts.getOptions().colors[1]
                    }
                },
                labels: {
                    format: '{value}%',
                    style: {
                        color: Highcharts.getOptions().colors[1]
                    }
                },
                opposite: true,
                gridLineWidth: 0
            }, {
                title: {
                    text: 'Pressure (hPa)',
                    style: {
                        color: Highcharts.getOptions().colors[2]
                    }
                },
                labels: {
                    format: '{value} hPa',
                    style: {
                        color: Highcharts.getOptions().colors[2]
                    }
                },
                opposite: true,
                gridLineWidth: 0
            }],
            series: [{
                name: 'Temperature',
                data: this.temperatures,
                type: 'spline',
                marker: {
                    enabled: false,
                    states: {
                        hover: {
                            enabled: true
                        }
                    }
                },
                tooltip: {
                    pointFormat: '<span style="color:{point.color}">\u25CF</span> {series.name}: <b>{point.y}°C</b><br/>'
                },
                color: '#FF3333',
                zIndex: 1
            }, {
                name: 'Precipitation',
                data: this.precipitations,
                type: 'column',
                yAxis: 1,
                color: '#68CFE8',
                tooltip: {
                    valueSuffix: ' %'
                },
                zIndex: 0
            }, {
                name: 'Wind',
                type: 'windbarb',
                id: 'windbarbs',
                data: this.winds,
                vectorLength: 18,
                yOffset: -15,
                tooltip: {
                    valueSuffix: ' m/s'
                },
                color: Highcharts.getOptions().colors[1],
                zIndex: 2
            }, {
                name: 'Pressure',
                data: this.pressures,
                type: 'spline',
                yAxis: 2,
                marker: {
                    enabled: false
                },
                tooltip: {
                    valueSuffix: ' hPa'
                },
                dashStyle: 'shortdot',
                color: Highcharts.getOptions().colors[2],
                zIndex: 3
            }]
        };
    }

    private createChart() {
        this.chart = Highcharts.chart(this.getChartOptions(), chart => {
            this.onChartLoad(chart);
        });
    }

    private onChartLoad(chart: Highcharts.Chart) {
        // Custom drawing functions for weather symbols and wind arrows
        this.drawWeatherSymbols(chart);
        this.drawBlocksForWindArrows(chart);
    }

    private drawWeatherSymbols(chart: Highcharts.Chart) {
        chart.series[0].data.forEach((point, i) => {
            // Custom rendering logic for symbols
        });
    }

    private drawBlocksForWindArrows(chart: Highcharts.Chart) {
        const xAxis = chart.xAxis[0];

        for (let pos = xAxis.min, max = xAxis.max, i = 0; pos <= max + 36e5; pos += 36e5, i += 1) {
            const isLast = pos === max + 36e5;
            const x = Math.round(xAxis.toPixels(pos)) + (isLast ? 0.5 : -0.5);

            const isLong = pos % (this.chart?.userOptions.chart?.type === 'datetime' ? 36e5 : 1) === 0;

            chart.renderer
                .path(['M', x, chart.plotTop + chart.plotHeight + (isLong ? 0 : 28), 'L', x, chart.plotTop + chart.plotHeight + 32, 'Z'])
                .attr({
                    stroke: chart.options.chart.plotBorderColor,
                    'stroke-width': 1
                })
                .add();
        }
    }
}

export const createMeteogramChart = (data: MeteogramData, container: HTMLElement) => {
    return new Meteogram(data, container);
};
