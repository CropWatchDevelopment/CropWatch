import { browser } from '$app/environment';
import Highcharts from 'highcharts';
import moment from 'moment';

export const HighChartsGuageChart = (data: any[], name: string = '', notation: string = '') => {
    return {

        chart: {
            type: 'gauge',
            plotBackgroundColor: null,
            plotBackgroundImage: null,
            plotBorderWidth: 0,
            plotShadow: false,
            height: '80%',
            backgroundColor: 'transparent',
        },

        title: {
            text: 'Speedometer'
        },

        pane: {
            startAngle: -90,
            endAngle: 89.9,
            background: null,
            center: ['50%', '75%'],
            size: '110%'
        },

        // the value axis
        yAxis: {
            min: 0,
            max: 1500,
            tickPixelInterval: 72,
            tickPosition: 'inside',
            tickColor: browser ? (Highcharts?.defaultOptions?.chart.backgroundColor || '#FFFFFF') : '#FFFFFF',
            tickLength: 20,
            tickWidth: 2,
            minorTickInterval: null,
            labels: {
                distance: 20,
                style: {
                    fontSize: '14px'
                }
            },
            lineWidth: 0,
            plotBands: [{
                from: 0,
                to: 1500,
                color: '#55BF3B', // green
                thickness: 20
            },
            // {
            //     from: 120,
            //     to: 160,
            //     color: '#DDDF0D', // yellow
            //     thickness: 20
            // }, {
            //     from: 160,
            //     to: 10000,
            //     color: '#DF5353', // red
            //     thickness: 20
            // }
        ]
        },

        series: [{
            name: 'Speed',
            data: [data],
            tooltip: {
                valueSuffix: ` ${notation}`
            },
            dataLabels: {
                format: `{y} ${notation}`,
                borderWidth: 0,
                color: browser ? (
                    Highcharts.defaultOptions.title &&
                    Highcharts.defaultOptions.title.style &&
                    Highcharts.defaultOptions.title.style.color
                ) || '#333333' : '#333333',
                style: {
                    fontSize: '16px'
                }
            },
            dial: {
                radius: '80%',
                backgroundColor: 'gray',
                baseWidth: 12,
                baseLength: '0%',
                rearLength: '0%'
            },
            pivot: {
                backgroundColor: 'gray',
                radius: 6
            }

        }]

    }
};
