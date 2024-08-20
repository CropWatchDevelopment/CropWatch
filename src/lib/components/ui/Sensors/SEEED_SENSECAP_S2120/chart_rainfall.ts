import Highcharts from 'highcharts';
import HighchartsExporting from 'highcharts/modules/exporting';

// Initialize the module
HighchartsExporting(Highcharts);

export const getRainfallChartConfig = (
    windData: [number, number, number][]
): Highcharts.Options => {
    return {
        chart: {
            type: 'spline',
            zooming: {
                type: 'x',
            },
            backgroundColor: 'transparent',
        },
        title: {
            text: 'Rainfall',
            align: 'left',
        },
        xAxis: {
            type: 'datetime',
            lineColor: 'gray',
            tickColor: 'gray',
            labels: {
                style: {
                    color: 'white',
                },
            },
            gridLineColor: 'gray',
        },
        yAxis: [{
            title: {
                text: 'Rainfall (mm/h)',
                style: {
                    color: 'black',
                },
            },
            labels: {
                format: '{value} km/h',
                style: {
                    color: 'black',
                },
            },
            opposite: false,
            min: 0,
        }],
        tooltip: {
            shared: true,
            valueDecimals: 2,
            formatter: function (this: Highcharts.TooltipFormatterContextObject) {
                let tooltip = `<b>${Highcharts.dateFormat('%Y-%m-%d %H:%M:%S', this.x as number)}</b>`;
                this.points?.forEach((point) => {
                    tooltip += `<br/><span style="color:${point.color}">\u25B2</span> ${point.series.name}: <b>${point.y} mm/h</b>`;
                });
                return tooltip;
            },
        },
        series: [{
            type: 'column',
            name: 'Rainfall',
            data: windData.map((d) => ({
                x: d[0],
                y: d[1],
            })),
            lineWidth: 1,
            color: 'gray',
            marker: {
                enabled: true,
                symbol: 'circle', // Use circle as a placeholder symbol
                radius: 4,
                states: {
                    hover: {
                        enabled: true,
                    },
                },
            },
        }],
        plotOptions: {
            series: {
                marker: {
                    enabled: true,
                    states: {
                        hover: {
                            enabled: true,
                        },
                    },
                },
                point: {
                    events: {
                        afterRender: function () {
                            if (this.graphic) {
                                const chart = this.series.chart;
                                const { direction } = this.options;

                                // Remove existing custom arrows to avoid duplicates
                                if (this.customArrow) {
                                    this.customArrow.destroy();
                                }

                                // Calculate the center of the point
                                const x = this.plotX + chart.plotLeft;
                                const y = this.plotY + chart.plotTop;

                                // Define the arrow size
                                const arrowSize = 10;

                                // Draw the arrow using custom SVG path
                                this.customArrow = chart.renderer.path([
                                    'M', x, y - arrowSize / 2,
                                    'L', x + arrowSize / 2, y,
                                    'L', x, y + arrowSize / 2,
                                    'L', x - arrowSize / 2, y,
                                    'Z'
                                ])
                                .attr({
                                    fill: 'red',
                                    zIndex: 5,
                                })
                                .translate(arrowSize / 2, arrowSize / 2)
                                .rotate(direction, x, y)
                                .add();
                            }
                        },
                    },
                },
            },
        },
    };
};
