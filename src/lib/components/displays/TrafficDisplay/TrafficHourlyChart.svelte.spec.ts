import { afterEach, describe, expect, it } from 'vitest';
import { formatNumber } from '$lib/i18n/format';
import { m } from '$lib/paraglide/messages.js';
import { renderWithServices } from '$lib/testing/render';
import { buildHourlyTrafficRows, metricLabel, type TrafficRow } from './traffic-data';
import TrafficHourlyChart from './TrafficHourlyChart.svelte';

const DAY_START = new Date(2026, 9, 21);
const at = (hour: number, minute = 0) => new Date(2026, 9, 21, hour, minute).toISOString();

function rows(...entries: Array<Record<string, unknown>>): TrafficRow[] {
	return entries.map((entry, index) => ({
		id: `r${index}`,
		dev_eui: 'CAM-1',
		...entry
	})) as TrafficRow[];
}

let view: ReturnType<typeof renderWithServices> | null = null;

function render(classKeys: string[], trafficRows: TrafficRow[]) {
	view = renderWithServices(TrafficHourlyChart, {
		props: {
			hourlyRows: buildHourlyTrafficRows(trafficRows, classKeys),
			classKeys,
			dayStart: DAY_START
		}
	});
	return view.target;
}

const barLabels = (target: HTMLElement) =>
	[...target.querySelectorAll('[role="graphics-symbol"]')].map((bar) =>
		bar.getAttribute('aria-label')
	);

afterEach(() => {
	view?.unmount();
	view = null;
});

describe('TrafficHourlyChart', () => {
	it('stacks each hour of the day by class, quiet hours included', async () => {
		const target = render(
			['car_count', 'people_count', 'north_lane'],
			rows(
				{ created_at: at(9, 5), car_count: 4, people_count: 2 },
				{ created_at: at(9, 40), car_count: 1, north_lane: 3 },
				{ created_at: at(17, 15), people_count: 7 }
			)
		);

		await expect.poll(() => barLabels(target).length).toBe(24);
		const labels = barLabels(target);
		expect(labels[0]).toBe(m.cwui_stacked_bar_bar({ label: '00', total: formatNumber(0) }));
		expect(labels[9]).toBe(m.cwui_stacked_bar_bar({ label: '09', total: formatNumber(10) }));
		expect(labels[17]).toBe(m.cwui_stacked_bar_bar({ label: '17', total: formatNumber(7) }));
		expect(target.querySelector('.cw-no-data-overlay')).toBeNull();

		const legend = [...target.querySelectorAll('.cw-stacked-bar-chart__legend-item')];
		expect(legend.map((item) => item.textContent?.trim())).toEqual([
			metricLabel('car_count'),
			metricLabel('people_count'),
			metricLabel('north_lane')
		]);
		// Known classes keep their fixed colour; discovered ones take their position.
		expect(
			legend.map(
				(item) =>
					item.querySelector<HTMLElement>('.cw-stacked-bar-chart__swatch')?.style.backgroundColor
			)
		).toEqual(['var(--cw-chart-cat-1)', 'var(--cw-chart-cat-2)', 'var(--cw-chart-cat-3)']);
	});

	it('says there is no data today when nothing was counted', () => {
		const target = render(['car_count'], rows({ created_at: at(9), car_count: 0 }));

		expect(target.querySelector('.cw-no-data-overlay')?.textContent).toContain(
			m.traffic_no_data_today()
		);
	});

	it('says there is no data today without any row', () => {
		const target = render([], []);

		expect(target.querySelector('.cw-no-data-overlay')?.textContent).toContain(
			m.traffic_no_data_today()
		);
	});
});
