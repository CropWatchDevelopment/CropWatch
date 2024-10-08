// chart_tempHumidityConfig.ts
import Highcharts from 'highcharts';
import HighchartsExporting from 'highcharts/modules/exporting';

// Initialize the module
HighchartsExporting(Highcharts);

export const getChartConfig = (temperatureData: [number, number][]): Highcharts.Options => {
    return {
        chart: {
            type: 'spline',
            zooming: {
                type: 'x'
            },
            backgroundColor: 'transparent',
        },
        exporting: {
            enabled: true,
        },
        title: {
            text: '',
            align: 'left',
        },
        xAxis: {
            type: 'datetime',
            lineColor: 'red',
            tickColor: 'red',
            labels: {
                style: {
                    color: 'white',
                },
            },
            gridLineColor: 'red',
        },
        yAxis: [{
            title: {
                text: '',
                style: {
                    color: 'red'
                }
            },
            labels: {
                format: '{value}°C',
                style: {
                    color: 'red'
                }
            }
        }],
        tooltip: {
            shared: true,
            valueDecimals: 2,
            formatter: function (this: Highcharts.TooltipFormatterContextObject) {
                let tooltip = `<b>${Highcharts.dateFormat('%Y-%m-%d %H:%M:%S', this.x as number)}</b>`;
                this.points?.forEach(point => {
                    tooltip += `<br/><span style="color:${point.color}">\u25CF</span> ${point.series.name}: <b>${point.y}${point.series.name === 'Temperature' ? '°C' : '%'}</b>`;
                });
                return tooltip;
            }
        },
        series: [{
            type: 'spline',  // Add this line
            name: 'Temperature',
            data: temperatureData,
            tooltip: {
                valueSuffix: ' °C'
            },
            lineWidth: 1,
            color: 'red',
        }]
    };
};
