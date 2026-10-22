import { afterEach, describe, expect, it } from 'vitest';
import type { OverviewDto } from '$lib/api/api.dtos';
import { m } from '$lib/paraglide/messages.js';
import { renderWithServices } from '$lib/testing/render';
import ReportingChart from './ReportingChart.svelte';

/** An hour on 15 Oct 2026 in the browser's own time zone, as the API sends it (ISO). */
const hour = (h: number) => new Date(2026, 9, 15, h).toISOString();

let view: ReturnType<typeof renderWithServices> | null = null;

function render(hourly: OverviewDto['hourly'], total: number, className?: string) {
	view = renderWithServices(ReportingChart, {
		props: { hourly, total, locale: 'en-US', class: className }
	});
	const section = view.target.querySelector('section') as HTMLElement;
	return {
		section,
		chart: section.querySelector('.chart__bars') as HTMLElement,
		bars: [...section.querySelectorAll<HTMLElement>('.chart__bar')]
	};
}

afterEach(() => {
	view?.unmount();
	view = null;
});

describe('ReportingChart', () => {
	it('draws one bar per hour at the share of devices that reported', () => {
		const { bars } = render(
			[
				{ hour: hour(8), reporting: 48 },
				{ hour: hour(9), reporting: 45 },
				{ hour: hour(10), reporting: 12 }
			],
			48
		);

		expect(bars.map((bar) => bar.style.height)).toEqual(['100%', '94%', '25%']);
		expect(bars.map((bar) => bar.title)).toEqual([
			m.overview_reporting_bar({ time: '08:00', reporting: 48, total: 48, percent: 100 }),
			m.overview_reporting_bar({ time: '09:00', reporting: 45, total: 48, percent: 94 }),
			m.overview_reporting_bar({ time: '10:00', reporting: 12, total: 48, percent: 25 })
		]);
	});

	it('marks hours below 90 % and describes the range of shares', () => {
		const { chart, bars } = render(
			[
				{ hour: hour(8), reporting: 90 },
				{ hour: hour(9), reporting: 89 },
				{ hour: hour(10), reporting: 40 }
			],
			100
		);

		expect(bars.map((bar) => bar.classList.contains('chart__bar--low'))).toEqual([
			false,
			true,
			true
		]);
		expect(chart.getAttribute('role')).toBe('img');
		expect(chart.getAttribute('aria-label')).toBe(m.overview_reporting_aria({ min: 40, max: 90 }));
	});

	it('draws flat bars when there are no devices, and nothing without hours', () => {
		let { bars } = render([{ hour: hour(8), reporting: 3 }], 0);
		expect(bars.map((bar) => bar.style.height)).toEqual(['0%']);
		view?.unmount();

		const empty = render([], 10);
		expect(empty.bars).toHaveLength(0);
		expect(empty.chart.getAttribute('aria-label')).toBe(
			m.overview_reporting_aria({ min: 0, max: 0 })
		);
		bars = empty.bars;
		expect(bars).toEqual([]);
	});

	it('has a title, a subtitle kept on phones, a time axis and a class', () => {
		const { section } = render([], 0, 'ov-order-4');

		expect(section.classList.contains('ov-order-4')).toBe(true);
		expect(section.querySelector('h2')?.textContent).toBe(m.overview_reporting_title());
		const subtitle = section.querySelector('.section__subtitle');
		expect(subtitle?.textContent?.trim()).toBe(m.overview_reporting_subtitle());
		expect(subtitle?.classList.contains('section__subtitle--phone')).toBe(true);
		expect(
			[...section.querySelectorAll('.chart__axis span')].map((span) => span.textContent)
		).toEqual([
			m.overview_reporting_24h_ago(),
			m.overview_reporting_12h_ago(),
			m.overview_reporting_now()
		]);
	});
});
