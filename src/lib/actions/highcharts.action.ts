import Highcharts from 'highcharts';
import HighchartsMore from 'highcharts/highcharts-more';


HighchartsMore(Highcharts);
Highcharts.setOptions({
    time: {
      timezone: 'Asia/Tokyo' // Set your desired timezone
    }
  });

export default (node: HTMLElement, config: Highcharts.Options) => {
    // Now, since the modules are already initialized, you can directly create the chart.
    const chart = Highcharts.chart(node, config);

    const resizeObserver = new ResizeObserver(() => {
        chart.reflow();
    });
    resizeObserver.observe(node);

    return {
        update(config: Highcharts.Options) {
            const redraw = true;
            const oneToOne = true;
            chart.update(config, redraw, oneToOne);
        },
        destroy() {
            resizeObserver.disconnect();
            chart.destroy();
        }
    };
};
