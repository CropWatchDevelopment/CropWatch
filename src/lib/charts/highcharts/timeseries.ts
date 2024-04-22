import { browser } from '$app/environment';
import Highcharts from 'highcharts';
import moment from 'moment';

export const HighChartsTimeSeriesChart = (data: any[], name: string = '') => {
    return {
        chart: {
            zoomType: 'x'
        },
        title: {
            text: name,
            align: 'left'
        },
        subtitle: {
            text: browser && document.ontouchstart === undefined ?
                'Click and drag in the plot area to zoom in' : 'Pinch the chart to zoom in',
            align: 'left'
        },
        xAxis: {
            type: 'datetime',
            title: {
                enabled: true,
                text: 'Month/Day'
            },
            labels: {
                formatter: function(): any {
                    return moment(this.value).format('MMM-DD').toString();
                },
            }
        },
        yAxis: [{ // Primary yAxis
            labels: {
                format: '{value}°C',
                style: {
                    color: 'red'
                }
            },
            title: {
                text: 'Temperature',
                style: {
                    color: 'red'
                }
            }
        }, { // Secondary yAxis
            title: {
                text: 'Humidity',
                style: {
                    color: 'blue'
                }
            },
            labels: {
                format: '{value} %',
                style: {
                    color: 'blue'
                }
            },
            opposite: true
        }],
        legend: {
            enabled: false
        },
        tooltip: {
            borderColor: '#2c3e50',
            shared: true,
            formatter: function () {
                return '<b>Time: ' + moment(this.x).format('hh:mm a').toString() + '</b><br/>' + name + ': ' + this.y + '°C';
            }
        },
        plotOptions: {
            area: {
                fillColor: {
                    linearGradient: {
                        x1: 0,
                        y1: 0,
                        x2: 0,
                        y2: 1
                    },
                    stops: [
                        [0, Highcharts.getOptions().colors[0]],
                        [1, Highcharts.color(Highcharts.getOptions().colors[0]).setOpacity(0).get('rgba')]
                    ]
                },
                marker: {
                    radius: 2
                },
                lineWidth: 1,
                states: {
                    hover: {
                        lineWidth: 1
                    }
                },
                threshold: null
            }
        },
        series: data,
    };
};