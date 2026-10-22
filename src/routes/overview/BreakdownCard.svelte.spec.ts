import { flushSync } from 'svelte';
import { afterEach, describe, expect, it } from 'vitest';
import type { OverviewAlertDeviceDto, OverviewDto } from '$lib/api/api.dtos';
import { m } from '$lib/paraglide/messages.js';
import { renderWithServices } from '$lib/testing/render';
import BreakdownCard from './BreakdownCard.svelte';

function overview(overrides: Partial<OverviewDto> = {}): OverviewDto {
	return {
		range: '24h',
		generatedAt: '2026-10-15T09:05:00.000Z',
		since: '2026-10-14T09:05:00.000Z',
		devices: {
			total: 48,
			online: 44,
			offline: 4,
			lastDataAt: '2026-10-15T09:04:20.000Z',
			locationCount: 6
		},
		gateways: { total: 3, online: 3 },
		alerts: { count: 0, previousCount: 0, active: 0, topDevices: [] },
		reports: { count: 0, lastAt: null, recent: [] },
		uplinks: { count: 0, delivered: 0, expected: 0 },
		hourly: [],
		locations: [],
		types: [],
		notes: [],
		feed: { counts: { alert: 0, device: 0, report: 0, data: 0 }, items: [] },
		attention: { offline: [], activeAlerts: [] },
		...overrides
	};
}

const alertDevice = (
	devEui: string,
	count: number,
	overrides: Partial<OverviewAlertDeviceDto> = {}
): OverviewAlertDeviceDto => ({
	devEui,
	deviceName: `Sensor ${devEui}`,
	locationId: 8,
	locationName: 'Field A',
	count,
	...overrides
});

let view: ReturnType<typeof renderWithServices> | null = null;

function render(data: OverviewDto, className?: string) {
	view = renderWithServices(BreakdownCard, { props: { overview: data, class: className } });
	const section = view.target.querySelector('section') as HTMLElement;
	const tabs = [...section.querySelectorAll<HTMLButtonElement>('.tabs button')];
	return {
		section,
		tabs,
		show(index: number) {
			tabs[index].click();
			flushSync();
		},
		center: () => [
			section.querySelector('.donut__value')?.textContent,
			section.querySelector('.donut__label')?.textContent
		],
		legend: () =>
			[...section.querySelectorAll('.donut__entry')].map((entry) => ({
				label: entry.querySelector('.donut__item-label')?.textContent,
				value: entry.querySelector('.donut__item-value')?.textContent,
				color: entry.querySelector<HTMLElement>('.donut__swatch')?.style.background,
				href: entry.querySelector('a.donut__item--link')?.getAttribute('href') ?? null
			})),
		arcs: () =>
			[...section.querySelectorAll('svg g circle')].map((circle) => circle.getAttribute('stroke')),
		aria: () => section.querySelector('svg')?.getAttribute('aria-label'),
		empty: () => section.querySelector('.donut__empty')?.textContent?.trim() ?? null
	};
}

afterEach(() => {
	view?.unmount();
	view = null;
});

describe('BreakdownCard', () => {
	it('starts on the online / offline split', () => {
		const card = render(overview());

		expect(card.section.querySelector('.tabs')?.getAttribute('aria-label')).toBe(
			m.overview_breakdown_view_label()
		);
		expect(card.tabs.map((tab) => tab.textContent?.trim())).toEqual([
			m.overview_breakdown_devices(),
			m.overview_breakdown_alerts(),
			m.overview_breakdown_types()
		]);
		expect(card.tabs.map((tab) => tab.getAttribute('aria-pressed'))).toEqual([
			'true',
			'false',
			'false'
		]);
		expect(card.center()).toEqual(['92%', m.overview_breakdown_online_label()]);
		expect(card.legend()).toEqual([
			{ label: m.status_online(), value: '44', color: 'var(--cw-status-online)', href: null },
			{ label: m.status_offline(), value: '4', color: 'var(--cw-status-offline)', href: null }
		]);
		expect(card.arcs()).toEqual(['var(--cw-status-online)', 'var(--cw-status-offline)']);
		expect(card.aria()).toBe(
			m.overview_breakdown_aria({ items: `${m.status_online()} 44, ${m.status_offline()} 4` })
		);
		expect(card.empty()).toBeNull();
	});

	it('keeps the zero rows of the split, drawing no arcs, when there are no devices', () => {
		const card = render(
			overview({ devices: { ...overview().devices, total: 0, online: 0, offline: 0 } })
		);

		expect(card.center()).toEqual(['0%', m.overview_breakdown_online_label()]);
		expect(card.legend().map((row) => row.value)).toEqual(['0', '0']);
		expect(card.arcs()).toEqual([]);
		expect(card.empty()).toBeNull();
		// The chart describes the rows its legend shows.
		expect(card.aria()).toBe(
			m.overview_breakdown_aria({ items: `${m.status_online()} 0, ${m.status_offline()} 0` })
		);
	});

	it('shows the three devices with the most alerts, the rest as "Other", each linking to its device', () => {
		const card = render(
			overview({
				alerts: {
					count: 9,
					previousCount: 0,
					active: 0,
					topDevices: [
						alertDevice('A', 3),
						alertDevice('B', 2, { deviceName: null }),
						alertDevice('C', 2, { locationId: null }),
						alertDevice('D', 1),
						alertDevice('E', 1)
					]
				}
			})
		);

		card.show(1);

		expect(card.tabs.map((tab) => tab.getAttribute('aria-pressed'))).toEqual([
			'false',
			'true',
			'false'
		]);
		expect(card.center()).toEqual(['9', m.overview_breakdown_alerts_24h()]);
		expect(card.legend()).toEqual([
			{
				label: 'Sensor A',
				value: '3',
				color: 'var(--cw-chart-cat-1)',
				href: '/locations/8/devices/A'
			},
			{
				label: m.dashboard_unnamed_device(),
				value: '2',
				color: 'var(--cw-chart-cat-2)',
				href: '/locations/8/devices/B'
			},
			{ label: 'Sensor C', value: '2', color: 'var(--cw-chart-cat-3)', href: null },
			{
				label: m.overview_breakdown_other(),
				value: '2',
				color: 'var(--cw-chart-cat-4)',
				href: null
			}
		]);
		expect(card.arcs()).toHaveLength(4);
	});

	it('shows a fourth device as itself when it is all that is left', () => {
		const four = [
			alertDevice('A', 3),
			alertDevice('B', 2),
			alertDevice('C', 1),
			alertDevice('D', 1)
		];

		let card = render(
			overview({ alerts: { count: 7, previousCount: 0, active: 0, topDevices: four } })
		);
		card.show(1);
		expect(card.legend().map((row) => row.label)).toEqual([
			'Sensor A',
			'Sensor B',
			'Sensor C',
			'Sensor D'
		]);
		view?.unmount();

		card = render(
			overview({ alerts: { count: 9, previousCount: 0, active: 0, topDevices: four } })
		);
		card.show(1);
		expect(card.legend().map((row) => [row.label, row.value])).toEqual([
			['Sensor A', '3'],
			['Sensor B', '2'],
			['Sensor C', '1'],
			[m.overview_breakdown_other(), '3']
		]);
	});

	it('labels the alert count for the selected range', () => {
		let card = render(overview({ range: '7d' }));
		card.show(1);
		expect(card.center()).toEqual(['0', m.overview_breakdown_alerts_7d()]);
		view?.unmount();

		card = render(overview({ range: '30d' }));
		card.show(1);
		expect(card.center()).toEqual(['0', m.overview_breakdown_alerts_30d()]);
	});

	it('says when there were no alerts', () => {
		const card = render(overview());

		card.show(1);

		expect(card.legend()).toEqual([]);
		expect(card.arcs()).toEqual([]);
		expect(card.empty()).toBe(m.overview_breakdown_no_alerts());
		expect(card.aria()).toBe(m.overview_breakdown_aria({ items: '' }));
	});

	it('breaks the devices down by type, colouring and describing only the types it shows', () => {
		const card = render(
			overview({
				types: [
					{ dataTable: 'cw_relay_data', total: 0 },
					{ dataTable: 'cw_air_data', total: 10 },
					{ dataTable: 'cw_soil_data', total: 20 },
					{ dataTable: 'cw_water_data', total: 5 },
					{ dataTable: 'cw_new_sensor', total: 0 },
					{ dataTable: 'cw_traffic2', total: 3 },
					{ dataTable: 'cw_future_sensor', total: 10 }
				]
			})
		);

		card.show(2);

		expect(card.center()).toEqual(['48', m.overview_breakdown_devices_label()]);
		// An empty type takes no colour: the next type shown gets the next one.
		const colours = [1, 2, 3, 4, 5].map((n) => `var(--cw-chart-cat-${n})`);
		expect(card.legend().map((row) => [row.label, row.value, row.color])).toEqual([
			[m.overview_type_air(), '10', colours[0]],
			[m.overview_type_soil(), '20', colours[1]],
			[m.overview_type_water(), '5', colours[2]],
			[m.overview_type_traffic(), '3', colours[3]],
			[m.overview_type_other(), '10', colours[4]]
		]);
		expect(card.arcs()).toEqual(colours);
		expect(card.aria()).toBe(
			m.overview_breakdown_aria({
				items: [
					`${m.overview_type_air()} 10`,
					`${m.overview_type_soil()} 20`,
					`${m.overview_type_water()} 5`,
					`${m.overview_type_traffic()} 3`,
					`${m.overview_type_other()} 10`
				].join(', ')
			})
		);
	});

	it('says there are no devices when there are no types, or only empty ones', () => {
		let card = render(overview());
		card.show(2);
		expect(card.legend()).toEqual([]);
		expect(card.empty()).toBe(m.overview_health_empty_title());
		view?.unmount();

		card = render(overview({ types: [{ dataTable: 'cw_air_data', total: 0 }] }));
		card.show(2);
		expect(card.legend()).toEqual([]);
		expect(card.arcs()).toEqual([]);
		expect(card.empty()).toBe(m.overview_health_empty_title());
		expect(card.aria()).toBe(m.overview_breakdown_aria({ items: '' }));
	});

	it('has a title, stacks its tabs on phones and takes a class', () => {
		const { section } = render(overview(), 'ov-order-3');

		expect(section.querySelector('h2')?.textContent).toBe(m.overview_breakdown_title());
		expect(section.classList.contains('section--stack-phone')).toBe(true);
		expect(section.classList.contains('ov-order-3')).toBe(true);
	});
});
