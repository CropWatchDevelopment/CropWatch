import Highcharts from "highcharts";

export const TemperatureChartConfig: Highcharts.Options = {
    chart: {
        type: 'line',
        backgroundColor: 'transparent'
    },
    title: {
        text: '24 Hour Temperature',
        style: {
            color: 'white'
        }
    },
    legend: {
        enabled: false,
    },
    xAxis: {
        type: 'datetime', // Use datetime type for the x-axis
        labels: {
            style: {
                color: 'white'
            },
            format: '{value:%m/%d %H:%M}',
            rotation: 45
        },
        title: {
            text: '',
        }
    },
    yAxis: [
        {
            title: {
                text: ''
            },
            labels: {
                format: '{value}°C',
                style: {
                    color: 'red'
                }
            }
        },
    ],
    tooltip: {
        shared: true,
        valueDecimals: 2,
        formatter: function (this: Highcharts.TooltipFormatterContextObject) {
            let tooltip = `<b>${Highcharts.dateFormat('%Y-%m-%d %H:%M:%S', this.x as number)}</b>`;
            this.points?.forEach((point) => {
                tooltip += `<br/><span style="color:${point.color}">\u25CF</span> ${point.series.name}: <b>${point.y}${point.series.name === 'Temperature' ? '°C' : '%'}</b>`;
            });
            return tooltip;
        }
    },
    series: [
        {
            type: 'spline',
            name: 'Temperature',
            data: [],
            tooltip: {
                valueSuffix: ' °C'
            },
            lineWidth: 1,
            color: 'red'
        },
    ]
};