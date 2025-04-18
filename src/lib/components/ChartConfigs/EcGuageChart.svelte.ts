import Highcharts from "highcharts";

export const EcGuageChartConfig: Highcharts.Options = {
    chart: {
        type: 'gauge',
        plotBorderWidth: 0,
        plotShadow: false,
        backgroundColor: 'transparent',
    },
    exporting: {
        enabled: true
    },
    title: {
        text: '&nbsp;',
        style: {
            color: 'orange' // Dynamic text color
        }
    },
    pane: {
        startAngle: -90,
        endAngle: 90,
        background: [],
        center: ['50%', '75%'],
    },
    yAxis: {
        min: 0,
        max: 2000,
        tickPixelInterval: 72,
        tickPosition: 'inside',
        tickLength: 20,
        tickWidth: 2,
        labels: {
            distance: 20,
            style: {
                fontSize: '16px',
                fontWeight: 'bold',
                color: 'orange' // Dynamic label color
            }
        },
        lineWidth: 0,
        plotBands: [{
            from: 3,
            to: 4,
            color: 'yellow',
            thickness: 20,
            zIndex: 1000,
        },
        {
            from: 4,
            to: 5,
            color: 'orange',
            thickness: 20,
            zIndex: 1000,
        },
        {
            from: 5,
            to: 6,
            color: 'green',
            thickness: 20,
            zIndex: 1000,
        },
        {
            from: 6,
            to: 7,
            color: 'orange',
            thickness: 20,
            zIndex: 1000,
        },
        {
            from: 7,
            to: 8,
            color: 'yellow',
            thickness: 20,
            zIndex: 1000,
        },
        {
            from: 8,
            to: 10,
            color: 'red',
            thickness: 20,
            zIndex: 1000,
        },
        ]
    },
    series: [{
        type: 'gauge',
        name: 'pH',
        data: [0],
        tooltip: {
            valueSuffix: ` pH`
        },
        dataLabels: {
            format: `{y} pH`,
            borderWidth: 0,
            style: {
                fontSize: '32px',
                color: 'orange' // Dynamic data label color
            }
        },
        dial: {
            radius: '80%',
            backgroundColor: 'gray', // Dynamic dial color
            baseWidth: 12,
            baseLength: '0%',
            rearLength: '0%',
            borderWidth: 2
        },
        pivot: {
            backgroundColor: 'gray', // Dynamic pivot color
            radius: 6,
            borderWidth: 2
        }
    }],
};