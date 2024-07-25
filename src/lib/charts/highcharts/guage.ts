import { browser } from '$app/environment';
import Highcharts from 'highcharts';

export const HighChartsGuageChart = (data: any[], name: string = '', notation: string = '') => {
    return {
        chart: {
            type: 'gauge',
            plotBackgroundColor: null,
            plotBackgroundImage: null,
            plotBorderWidth: 0,
            plotShadow: false,
            backgroundColor: 'transparent',
            spacing: [0, 0, 0, 0] // Adjusted spacing to minimize top space
        },

        title: {
            text: ''
        },

        pane: {
            startAngle: -90,
            endAngle: 90, // Changed from 89.9 to 90 for symmetry
            background: null,
            center: ['50%', '70%'], // Moved the gauge upwards
            size: '100%' // Adjusted size for better fitting
        },

        // the value axis
        yAxis: {
            min: 0,
            max: 1500,
            tickPixelInterval: 72,
            tickPosition: 'inside',
            tickColor: browser ? (Highcharts?.defaultOptions?.chart.backgroundColor || 'red') : 'red',
            tickLength: 20,
            tickWidth: 2,
            minorTickInterval: null,
            labels: {
                distance: 20,
                style: {
                    fontSize: '14px',
                    color: 'white'
                }
            },
            lineWidth: 0,
            plotBands: [{
                from: 0,
                to: 400,
                color: '#DDDF0D', // green
                thickness: 20
            },
            {
                from: 400,
                to: 1000,
                color: '#55BF3B', // yellow
                thickness: 20
            }, {
                from: 1000,
                to: 1400,
                color: 'orange', // orange
                thickness: 20
            },
            {
                from: 1400,
                to: 1500,
                color: '#DF5353', // red
                thickness: 20
            }]
        },

        series: [{
            name: 'CO2 PPM',
            data: [data],
            tooltip: {
                valueSuffix: ` ${notation}`
            },
            dataLabels: {
                format: `{y} ${notation} PPM`,
                borderWidth: 0,
                style: {
                    fontSize: '40px',
                    color: 'white'
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
                backgroundColor: 'black',
                radius: 6
            }

        }]

    }
};
