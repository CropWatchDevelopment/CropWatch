import { browser } from '$app/environment';
import Highcharts from 'highcharts';
import HighchartsExporting from 'highcharts/modules/exporting';

// Initialize the module
HighchartsExporting(Highcharts);

export const getGaugeChartConfig = (data: number, name: string = '', notation: string = ''): Highcharts.Options => {
    return {
        chart: {
            type: 'gauge',
            plotBorderWidth: 0,
            plotShadow: false,
            height: '80%'
        },
        title: {
            text: name
        },
        pane: {
            startAngle: -90,
            endAngle: 90, // Changed from 89.9 to 90 for symmetry
            background: [],
            center: ['50%', '75%'], // Moved the gauge upwards
            size: '110%', // Adjusted size for better fitting
        },
        yAxis: {
            min: 0,
            max: 1500,
            tickPixelInterval: 72,
            tickPosition: 'inside',
            tickColor: '#FFFFFF',
            tickLength: 20,
            tickWidth: 2,
            minorTickInterval: 100,
            labels: {
                distance: 20,
                style: {
                    fontSize: '14px',
                    color: '#FFFFFF'
                }
            },
            lineWidth: 10,
            plotBands: [{
                from: 0,
                to: 400,

                borderColor: '#55BF3B', // green
                color: '#55BF3B', // green
                thickness: 50
            }, {
                from: 400,
                to: 1000,
                color: '#DDDF0D', // yellow
                thickness: 20
            }, {
                from: 1000,
                to: 1400,
                color: 'orange', // orange
                thickness: 20
            }, {
                from: 1400,
                to: 1500,
                color: '#DF5353', // red
                thickness: 20
            }]
        },
        series: [{
            type: 'gauge',
            name: 'CO2 PPM',
            data: [data],
            tooltip: {
                valueSuffix: ` ${notation}`
            },
            dataLabels: {
                format: `{y} ${notation}`,
                borderWidth: 0,
                style: {
                    fontSize: '16px',
                    color: '#FFFFFF'
                }
            },
            dial: {
                radius: '80%',
                backgroundColor: 'gray',
                baseWidth: 12,
                baseLength: '0%',
                rearLength: '0%',
                borderColor: '#FF0000', // Red border color
                borderWidth: 2 // Adding border width to see if it becomes visible
            },
            pivot: {
                backgroundColor: 'gray',
                radius: 6,
                borderColor: '#FF0000', // Red border color
                borderWidth: 2 // Adding border width for visibility
            }
        }]
    };
};
