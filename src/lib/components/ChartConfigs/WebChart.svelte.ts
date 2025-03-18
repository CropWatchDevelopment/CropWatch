import Highcharts from "highcharts";

export const WebChartConfig: Highcharts.Options = {
    chart: {
        polar: true,
        type: 'line',
        backgroundColor: 'transparent',
    },

    accessibility: {
        description: 'SOIL NPK Chart'
    },

    title: {
        text: '',
        x: -80,
        style: {
            color: 'white'
        }
    },

    pane: {
        size: '80%',
        startAngle: 0,
        endAngle: 360,
    },

    xAxis: {
        categories: [
            'N',
            'P',
            'K',
        ],
        tickmarkPlacement: 'on',
        lineWidth: 0,
        labels: {
            style: {
                color: 'white',
                fontSize: '1.2em'
            }
        }
    },

    exporting: {
        enabled: true
    },

    yAxis: {
        gridLineInterpolation: 'polygon',
        lineWidth: 0,
        min: 0,
        labels: {
            style: {
                color: 'white'
            }
        }
    },

    series: [{
        name: '',
        data: [0, 0, 0],
        pointPlacement: 'on'
    }],

    legend: {
        enabled: false
    },

    responsive: {
        rules: [{
            condition: {
                maxWidth: 500
            },
            chartOptions: {
                legend: {
                    align: 'center',
                    verticalAlign: 'bottom',
                    layout: 'horizontal',
                    
                },
                pane: {
                    size: '70%'
                }
            }
        }]
    }
};
