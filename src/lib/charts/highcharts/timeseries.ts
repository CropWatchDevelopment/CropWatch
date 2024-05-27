import { browser } from '$app/environment';
import Highcharts from 'highcharts';
import moment from 'moment';

export const HighChartsTimeSeriesChart = (data: any[], yAxis: any[], name: string = '') => {
    return {
        chart: {
            zoomType: 'x',
            backgroundColor: 'transparent',
        },
        title: {
            text: name,
            align: 'left'
        },
        subtitle: {
            align: 'left'
        },
        xAxis: {
            type: 'datetime',
            title: {
                enabled: true,
                text: 'Month/Day',
                style: {
                    color: 'white',
                },
            },
            labels: {
                formatter: function (): any {
                    return moment(this.value).format('MMM-DD').toString();
                },
                style: {
                    color: 'white',
                },
            }
        },
        yAxis: yAxis,
        legend: {
            enabled: false
        },
        tooltip: {
            borderColor: '#2c3e50',
            shared: true,
            formatter: function (): any {
                var s = '<b>Time: ' + moment(this.x).format('hh:mm a').toString() + '</b><br/>';
                this.points.forEach(point => {
                    s += point.series.name + ': ' + point.y.toLocaleString();
                    if (point.series.yAxis.opposite) {
                        s += ' %'; // Assuming humidity values are formatted as percentages
                    } else {
                        s += '°C'; // Assuming temperature values are formatted in Celsius
                    }
                    s += '<br/>';
                });
                return s;
            }
        },
        plotOptions: {
            column: {
                pointPadding: 0.2,
                borderWidth: 0
            },
            area: {
                fillColor: {
                    linearGradient: {
                        x1: 0,
                        y1: 0,
                        x2: 0,
                        y2: 1
                    },
                    stops: [
                        [0, browser ? Highcharts.getOptions().colors[0] : 'green'],
                        [1, browser ? Highcharts.color(Highcharts.getOptions().colors[0]).setOpacity(0).get('rgba') : 'green']
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
