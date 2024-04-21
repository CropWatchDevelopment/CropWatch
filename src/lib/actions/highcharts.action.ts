import Highcharts from 'highcharts';

export default (node: HTMLElement, config: Highcharts.Options) => {
    const redraw = true;
    const oneToOne = true;
    const chart = Highcharts.chart(node, config);

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