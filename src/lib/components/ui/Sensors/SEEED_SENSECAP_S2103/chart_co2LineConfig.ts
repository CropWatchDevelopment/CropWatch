// chart_tempHumidityConfig.ts
import Highcharts from 'highcharts';
import HighchartsExporting from 'highcharts/modules/exporting';

// Initialize the module
HighchartsExporting(Highcharts);

export const getCo2ChartConfig = (co2Data: [number, number][]): Highcharts.Options => {
    // Fix highest co2 value in the co2Data array where [timestamp, co2Value]
    const highestCo2Value = Math.max(...co2Data.map(data => data[1]));
    return {
        chart: {
            type: 'spline',
            backgroundColor: 'transparent',
            zooming: {
                type: 'x'
            },
        },
        exporting: {
            enabled: true
        },
        title: {
            text: '',
            align: 'left',
        },
        xAxis: {
            type: 'datetime',
            lineColor: 'green',
            tickColor: 'green',
            labels: {
                style: {
                    color: 'white',
                },
            },
            gridLineColor: 'green',
        },
        yAxis: [{
            title: {
                text: ''
            },
            max: highestCo2Value,
            min: 400,
            labels: {
                format: '{value} PPM',
                style: {
                    color: 'green'
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
            color: 'green',
        }]
    };
};
