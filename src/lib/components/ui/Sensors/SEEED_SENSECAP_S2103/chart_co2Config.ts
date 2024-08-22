
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
                height: '80%',
                backgroundColor: 'transparent',
            },
            exporting: {
                enabled: false
            },
            title: {
                text: '',
                style: {
                    color: 'orange' // Dynamic text color
                }
            },
            pane: {
                startAngle: -90,
                endAngle: 90,
                background: [],
                center: ['50%', '50%'],
                size: '90%',
            },
            yAxis: {
                min: 400,
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
                    from: 400,
                    to: 800,
                    color: 'green',
                    thickness: 20,
                    zIndex: 1000,
                },
                {
                    from: 801,
                    to: 1100,
                    color: 'yellow',
                    thickness: 20,
                    zIndex: 1000,
                },
                {
                    from: 1101,
                    to: 1500,
                    color: 'orange',
                    thickness: 20,
                    zIndex: 1000,
                },
                {
                    from: 1501,
                    to: 2000,
                    color: 'red',
                    thickness: 20,
                    zIndex: 1000,
                },
            ]
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
    };
