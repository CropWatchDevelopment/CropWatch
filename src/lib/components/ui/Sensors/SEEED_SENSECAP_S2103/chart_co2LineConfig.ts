// chart_tempHumidityConfig.ts
import Highcharts from 'highcharts';
import HighchartsExporting from 'highcharts/modules/exporting';

// Initialize the module
HighchartsExporting(Highcharts);

export const getCo2ChartConfig = (co2Data: [number, number][]): Highcharts.Options => {
    return {
        chart: {
            type: 'spline',
            backgroundColor: 'transparent',
            zooming: {
                type: 'x'
            },
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
                text: ''
            },
            labels: {
                format: '{value} PPM',
                style: {
                    color: 'red'
                }
            },
            opposite: true
        }],
        tooltip: {
            shared: true,
            valueDecimals: 2,
            formatter: function (this: Highcharts.TooltipFormatterContextObject) {
                let tooltip = `<b>${Highcharts.dateFormat('%Y-%m-%d %H:%M:%S', this.x as number)}</b>`;
                this.points?.forEach(point => {
                    tooltip += `<br/><span style="color:${point.color}">\u25CF</span> ${point.series.name}: <b>${point.y}</b>`;
                });
                return tooltip;
            }
        },
        series: [{
            type: 'spline',  // Add this line
            name: 'CO² PPM',
            data: co2Data,
            tooltip: {
                valueSuffix: ' °C'
            },
            lineWidth: 1,
            color: 'red',
        }]
    };
};
