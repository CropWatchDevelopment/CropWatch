import Highcharts from 'highcharts';
import HighchartsMore from 'highcharts/highcharts-more';
import SolidGauge from 'highcharts/modules/solid-gauge';

export default (node: HTMLElement, config: Highcharts.Options) => {
    const redraw = true;
    const oneToOne = true;
    const chart = Highcharts.chart(node, config);
    HighchartsMore(Highcharts);
    SolidGauge(Highcharts);

    const resizeObserver = new ResizeObserver(() => {
        chart.reflow();
    });

    resizeObserver.observe(node);

    return {
        update(config: Highcharts.Options) {
            chart.update(config, redraw, oneToOne);
        },
        destroy() {
            resizeObserver.disconnect();
            chart.destroy();
        }
    };
};