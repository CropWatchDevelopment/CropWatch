import { afterEach, describe, expect, it } from 'vitest';
import type { OverviewDto } from '$lib/api/api.dtos';
import { formatRelative } from '$lib/i18n/format';
import { m } from '$lib/paraglide/messages.js';
import { renderWithServices } from '$lib/testing/render';
import KpiCards from './KpiCards.svelte';

const NOW = Date.parse('2026-10-15T09:05:00.000Z');
const LOCALE = 'ja-JP';

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
		alerts: { count: 7, previousCount: 10, active: 2, topDevices: [] },
		reports: { count: 2, lastAt: '2026-10-15T07:05:00.000Z', recent: [] },
		uplinks: { count: 13800, delivered: 13650, expected: 13780 },
		hourly: [],
		locations: [],
		types: [],
		notes: [],
		feed: { counts: { alert: 0, device: 0, report: 0, data: 0 }, items: [] },
		attention: { offline: [], activeAlerts: [] },
		...overrides
	};
}

let view: ReturnType<typeof renderWithServices> | null = null;

function render(data: OverviewDto) {
	view = renderWithServices(KpiCards, { props: { overview: data, locale: LOCALE, now: NOW } });
	const section = view.target.querySelector('section.kpis') as HTMLElement;
	/** The card whose heading reads `head`. */
	const card = (head: string) =>
		[...section.querySelectorAll<HTMLElement>('.kpi')].find(
			(kpi) => kpi.querySelector('.kpi__head')?.textContent === head
		) as HTMLElement;
	const text = (kpi: HTMLElement, selector: string) => kpi.querySelector(selector)?.textContent;
	return { section, card, text };
}

afterEach(() => {
	view?.unmount();
	view = null;
});

describe('KpiCards', () => {
	it('shows the devices, their locations and the online / offline split', () => {
		const { section, card, text } = render(overview());

		expect(section.getAttribute('aria-label')).toBe(m.overview_kpis_label());
		const devices = card(m.overview_kpi_devices());
		expect(text(devices, '.kpi__value')).toBe('48');
		expect(text(devices, '.kpi__sub')?.trim()).toBe(m.overview_kpi_devices_sub_other({ count: 6 }));
		expect(devices.closest('.cw-card')?.classList.contains('kpi-card--wide-only')).toBe(true);

		const split = card(m.overview_kpi_online_offline());
		expect(text(split, '.kpi__value--success')).toBe('44');
		expect(text(split, '.kpi__value--danger')).toBe('4');
		const bar = split.querySelector('.kpi__bar') as HTMLElement;
		expect(bar.getAttribute('role')).toBe('img');
		expect(bar.getAttribute('aria-label')).toBe(
			m.overview_kpi_online_offline_aria({ online: 44, offline: 4 })
		);
		expect(split.querySelector<HTMLElement>('.kpi__bar-online')?.style.flexGrow).toBe('44');
		expect(split.querySelector<HTMLElement>('.kpi__bar-offline')?.style.flexGrow).toBe('4');
	});

	it('says "at 1 location" for a single location', () => {
		const { card, text } = render(
			overview({ devices: { ...overview().devices, locationCount: 1 } })
		);

		expect(text(card(m.overview_kpi_devices()), '.kpi__sub')?.trim()).toBe(
			m.overview_kpi_devices_sub_one()
		);
	});

	it('compares the alert count with the previous period, and shows the active ones', () => {
		const { card, text } = render(overview());

		const alerts = card(m.overview_kpi_alerts());
		expect(text(alerts, '.kpi__value')).toBe('7');
		expect(text(alerts, '.kpi__active')).toBe(`${m.overview_kpi_alerts_active({ count: 2 })} · `);
		expect(text(alerts, '.kpi__sub')?.trim()).toBe(
			`${m.overview_kpi_alerts_active({ count: 2 })} · ${m.overview_kpi_delta_24h({ delta: '−3' })}`
		);
	});

	it('words the comparison for the selected range, without active alerts', () => {
		const alerts = { count: 12, previousCount: 10, active: 0, topDevices: [] };

		let { card, text } = render(overview({ range: '7d', alerts }));
		let kpi = card(m.overview_kpi_alerts());
		expect(kpi.querySelector('.kpi__active')).toBeNull();
		expect(text(kpi, '.kpi__sub')?.trim()).toBe(m.overview_kpi_delta_7d({ delta: '+2' }));
		view?.unmount();

		({ card, text } = render(overview({ range: '30d', alerts: { ...alerts, count: 10 } })));
		kpi = card(m.overview_kpi_alerts());
		expect(text(kpi, '.kpi__sub')?.trim()).toBe(m.overview_kpi_delta_30d({ delta: '0' }));
	});

	it('links the gateways card to the gateways page and says whether all are connected', () => {
		const { section, card, text } = render(overview());

		const link = section.querySelector('a.kpi-link') as HTMLAnchorElement;
		expect(link.getAttribute('href')).toBe('/gateways');
		const gateways = card(m.overview_kpi_gateways());
		expect(link.contains(gateways)).toBe(true);
		expect(text(gateways, '.kpi__value')).toBe('3');
		expect(text(gateways, '.kpi__of--wide')).toBe(m.overview_kpi_gateways_of({ total: 3 }));
		expect(text(gateways, '.kpi__of--narrow')).toBe('/ 3');
		expect(text(gateways, '.kpi__sub--success')).toBe(m.overview_kpi_gateways_all());
	});

	it('counts offline gateways, and says when there are none at all', () => {
		let { card, text } = render(overview({ gateways: { total: 3, online: 2 } }));
		expect(text(card(m.overview_kpi_gateways()), '.kpi__sub--danger')?.trim()).toBe(
			m.overview_kpi_gateways_offline_one()
		);
		view?.unmount();

		({ card, text } = render(overview({ gateways: { total: 3, online: 0 } })));
		expect(text(card(m.overview_kpi_gateways()), '.kpi__sub--danger')?.trim()).toBe(
			m.overview_kpi_gateways_offline_other({ count: 3 })
		);
		view?.unmount();

		({ card, text } = render(overview({ gateways: { total: 0, online: 0 } })));
		const none = card(m.overview_kpi_gateways());
		expect(text(none, '.kpi__sub')).toBe(m.overview_kpi_gateways_none());
		expect(none.querySelector('.kpi__sub--success, .kpi__sub--danger')).toBeNull();
	});

	it('shows when the last report went out, or that none has yet', () => {
		let { card, text } = render(overview());
		let reports = card(m.overview_kpi_reports());
		expect(text(reports, '.kpi__value')).toBe('2');
		expect(text(reports, '.kpi__sub')?.trim()).toBe(
			m.overview_kpi_reports_last({
				when: formatRelative('2026-10-15T07:05:00.000Z', NOW, LOCALE) ?? ''
			})
		);
		view?.unmount();

		({ card, text } = render(overview({ reports: { count: 0, lastAt: null, recent: [] } })));
		reports = card(m.overview_kpi_reports());
		expect(text(reports, '.kpi__sub')?.trim()).toBe(m.overview_kpi_reports_none());
		view?.unmount();

		// A time that cannot be read leaves the "last" part out instead of showing it empty.
		({ card, text } = render(overview({ reports: { count: 1, lastAt: 'garbled', recent: [] } })));
		reports = card(m.overview_kpi_reports());
		expect(text(reports, '.kpi__value')).toBe('1');
		expect(text(reports, '.kpi__sub')?.trim()).toBe('');
	});

	it('shows the uplinks received and their share of the expected count', () => {
		const { card, text } = render(overview());

		const data = card(m.overview_kpi_data());
		expect(text(data, '.kpi__value')).toBe('1.4万');
		const unit = data.querySelector('.kpi__unit') as HTMLElement;
		expect(unit.textContent).toBe(`${m.overview_kpi_data_unit()}\u00a0·\u00a0`);
		expect(unit.classList.contains('kpi__unit--before-expected')).toBe(true);
		expect(text(data, '.kpi__sub')?.trim()).toBe(
			`${m.overview_kpi_data_unit()}\u00a0·\u00a0${m.overview_kpi_data_expected({ percent: '99.1%' })}`
		);
	});

	it('shows only the uplinks when none were expected', () => {
		const { card } = render(overview({ uplinks: { count: 412, delivered: 0, expected: 0 } }));

		const data = card(m.overview_kpi_data());
		expect(data.querySelector('.kpi__value')?.textContent).toBe('412');
		const unit = data.querySelector('.kpi__unit') as HTMLElement;
		expect(unit.textContent).toBe(m.overview_kpi_data_unit());
		expect(unit.classList.contains('kpi__unit--before-expected')).toBe(false);
		expect(data.querySelector('.kpi__sub')?.textContent?.trim()).toBe(m.overview_kpi_data_unit());
	});
});
