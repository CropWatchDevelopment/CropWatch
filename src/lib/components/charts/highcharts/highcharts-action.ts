import Highcharts from 'highcharts';
import more from 'highcharts/highcharts-more';

export default async (node: HTMLElement, config: Highcharts.Options) => {
	const redraw = true;
	const oneToOne = true;
	const chart = Highcharts.chart(node, config);
	await more(Highcharts);

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