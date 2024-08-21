// chart_tempHumidityConfig.ts
import Highcharts from 'highcharts';
import HighchartsExporting from 'highcharts/modules/exporting';

// Initialize the module
HighchartsExporting(Highcharts);

export const getChartConfig = (peopleData: [number, number][], bicycleData: [number, number][], carData: [number, number][]): Highcharts.Options => {
    return {
        chart: {
            type: 'spline',
            zooming: {
                type: 'x'
            },
            backgroundColor: 'transparent',
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
            },
            labels: {
                format: '{value}',
                style: {
                    color: 'red'
                }
            }
        }, {
            title: {
                text: ''
            },
            labels: {
                format: '{value}%',
                style: {
                    color: 'lightblue'
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
                    tooltip += `<br/><span style="color:${point.color}">\u25CF</span> ${point.series.name}: <b>${point.y}/hr}</b>`;
                });
                return tooltip;
            }
        },
        series: [{
            type: 'spline',  // Add this line
            name: 'People',
            data: peopleData,
            tooltip: {
                valueSuffix: ''
            },
            lineWidth: 1,
            color: 'yellow',
        }, {
            type: 'spline',  // Add this line
            name: 'Bicycles',
            data: bicycleData,
            yAxis: 1,
            tooltip: {
                valueSuffix: ''
            },
            lineWidth: 1,
            color: 'blue',
        }, {
            type: 'spline',  // Add this line
            name: 'Cars',
            data: carData,
            yAxis: 1,
            tooltip: {
                valueSuffix: ''
            },
            lineWidth: 1,
            color: 'red',
        }]
    };
};
