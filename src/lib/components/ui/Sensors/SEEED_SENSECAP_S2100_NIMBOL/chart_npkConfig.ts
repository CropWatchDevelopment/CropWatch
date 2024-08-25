// chart_tempHumidityConfig.ts
import Highcharts from 'highcharts';
import HighchartsExporting from 'highcharts/modules/exporting';
import { _ } from 'svelte-i18n';
// Initialize the module
HighchartsExporting(Highcharts);

export const getNPKChartConfig = (soil_n: number, soil_p: number, soil_k: number): Highcharts.Options => {
    return {

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
            size: '80%'
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

        tooltip: {
            shared: true,
            pointFormat: '<span style="color:{series.color}">{series.name} <b>' +
                '{point.y:,.0f}</b>'
        },

        // legend: {
        //     align: 'right',
        //     verticalAlign: 'middle',
        //     layout: 'vertical',
        //     itemStyle: {
        //         color: 'white'
        //     }
        // },

        series: [{
            name: '',
            data: [soil_n, soil_p, soil_k],
            pointPlacement: 'on'
        }],

        responsive: {
            rules: [{
                condition: {
                    maxWidth: 500
                },
                chartOptions: {
                    legend: {
                        align: 'center',
                        verticalAlign: 'bottom',
                        layout: 'horizontal'
                    },
                    pane: {
                        size: '70%'
                    }
                }
            }]
        }
    };
};