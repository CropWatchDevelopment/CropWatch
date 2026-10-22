import { afterEach, describe, expect, it } from 'vitest';
import { formatNumber } from '$lib/i18n/format';
import { m } from '$lib/paraglide/messages.js';
import { renderWithServices } from '$lib/testing/render';
import { metricLabelText } from './traffic-data';
import TrafficClassBreakdown from './TrafficClassBreakdown.svelte';

let view: ReturnType<typeof renderWithServices> | null = null;

function render(classKeys: string[], classTotals: Record<string, number>) {
	view = renderWithServices(TrafficClassBreakdown, { props: { classKeys, classTotals } });
	return [...view.target.querySelectorAll('.traffic-breakdown__row')].map((row) => {
		const bar = row.querySelector<HTMLElement>('.traffic-breakdown__bar')!;
		return {
			emoji: row.querySelector('.traffic-breakdown__emoji')?.textContent,
			label: row.querySelector('.traffic-breakdown__label')?.textContent,
			value: row.querySelector('.traffic-breakdown__value')?.textContent,
			share: row.querySelector('.traffic-breakdown__share')?.textContent?.trim(),
			width: bar.style.width,
			color: bar.style.backgroundColor
		};
	});
}

afterEach(() => {
	view?.unmount();
	view = null;
});

describe('TrafficClassBreakdown', () => {
	it("lists each class by volume with its share, keeping each class's colour", () => {
		const rows = render(['car_count', 'people_count', 'north_lane'], {
			car_count: 30,
			people_count: 5,
			north_lane: 65
		});

		expect(rows).toEqual([
			{
				emoji: '🚦',
				label: metricLabelText('north_lane'),
				value: formatNumber(65),
				share: m.traffic_share_of_total({ value: '65' }),
				width: '65%',
				// A discovered class takes its position in the list.
				color: 'var(--cw-chart-cat-3)'
			},
			{
				emoji: '🚗',
				label: metricLabelText('car_count'),
				value: formatNumber(30),
				share: m.traffic_share_of_total({ value: '30' }),
				width: '30%',
				color: 'var(--cw-chart-cat-1)'
			},
			{
				emoji: '🚶',
				label: metricLabelText('people_count'),
				value: formatNumber(5),
				share: m.traffic_share_of_total({ value: '5.0' }),
				width: '5%',
				color: 'var(--cw-chart-cat-2)'
			}
		]);
	});

	it('keeps a tiny share visible and an empty class flat', () => {
		const rows = render(['car_count', 'bus_count', 'truck_count'], {
			car_count: 996,
			bus_count: 4
		});

		expect(rows.map(({ width, share }) => [width, share])).toEqual([
			['99.6%', m.traffic_share_of_total({ value: '100' })],
			['1%', m.traffic_share_of_total({ value: '0.4' })],
			['0%', m.traffic_share_of_total({ value: '0.0' })]
		]);
		expect(rows[1].color).toBe('var(--cw-chart-cat-5)');
	});

	it('says so when no class was counted', () => {
		expect(render(['car_count'], { car_count: 0 })).toEqual([]);
		expect(view!.target.textContent).toContain(m.traffic_no_class_data_recorded());
		view!.unmount();

		expect(render([], {})).toEqual([]);
		expect(view!.target.textContent).toContain(m.traffic_no_class_data_recorded());
	});
});
