import { flushSync } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { OverviewDto, OverviewFeedItemDto } from '$lib/api/api.dtos';
import { ApiError } from '$lib/api/api-error';
import { formatRelative } from '$lib/i18n/format';
import { m } from '$lib/paraglide/messages.js';
import { createMockServices, type MockServices } from '$lib/testing/mock-services';
import { renderWithServices } from '$lib/testing/render';
import ActivityCard from './ActivityCard.svelte';
import { formatReportPeriod } from './overview';

const LOCALE = 'ja-JP';
/** 15 Oct 2026, 09:05 in the browser's time zone. */
const NOW = new Date(2026, 9, 15, 9, 5).getTime();
const at = (day: number, hour: number, minute = 0) =>
	new Date(2026, 9, day, hour, minute).toISOString();

const REPORT_FILE = '2026_10_04-2026_10_10.pdf';

/** The first shape of each icon the feed uses. */
const ICONS: Record<string, string> = {
	'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9': 'bell',
	'M20 6 9 17l-5-5': 'check',
	rect: 'device',
	'M22 2 11 13M22 2l-7 20-4-9-9-4z': 'send',
	'M3 12h4l3-8 4 16 3-8h4': 'pulse'
};

function feed(
	items: OverviewFeedItemDto[],
	counts: OverviewDto['feed']['counts'] = { alert: 0, device: 0, report: 0, data: 0 }
): OverviewDto['feed'] {
	return { counts, items };
}

let services: MockServices;
let view: ReturnType<typeof renderWithServices> | null = null;

function render(data: OverviewDto['feed'], className?: string) {
	view = renderWithServices(ActivityCard, {
		props: { feed: data, locale: LOCALE, now: NOW, class: className },
		services
	});
	const section = view.target.querySelector('section') as HTMLElement;
	const chips = () => [...section.querySelectorAll<HTMLButtonElement>('.filters__chip')];
	return {
		section,
		chips,
		filter(index: number) {
			chips()[index].click();
			flushSync();
		},
		events: () =>
			[...section.querySelectorAll<HTMLElement>('li.event')].map((li) => {
				const row = li.querySelector('.event__row') as HTMLElement;
				const shape = li.querySelector('.event__icon svg')?.firstElementChild;
				return {
					as: row.tagName.toLowerCase(),
					href: row.getAttribute('href'),
					icon: ICONS[shape?.getAttribute('d') ?? shape?.tagName ?? ''],
					tone: li.querySelector('.event__icon')?.className.match(/event__icon--(\w+)/)?.[1],
					title: li.querySelector('.event__title')?.textContent,
					meta: li.querySelector('.event__meta')?.textContent,
					time: li.querySelector('.event__time--wide')?.textContent,
					narrowTime: li.querySelector('.event__time--narrow')?.textContent
				};
			}),
		reportButton: () => section.querySelector<HTMLButtonElement>('button.event__row')
	};
}

beforeEach(() => {
	services = createMockServices();
});

afterEach(() => {
	view?.unmount();
	view = null;
	vi.restoreAllMocks();
});

describe('ActivityCard events', () => {
	it('describes alerts and links them to their device', () => {
		const { events } = render(
			feed([
				{
					kind: 'alert_triggered',
					at: at(15, 8, 52),
					devEui: 'A',
					deviceName: 'Freezer probe',
					locationId: 1,
					locationName: 'Cold Room 1',
					ruleName: 'Too warm'
				},
				{
					kind: 'alert_resolved',
					at: at(15, 8, 20),
					devEui: 'B',
					deviceName: null,
					locationId: 2,
					ruleName: 'Too warm',
					triggeredAt: at(15, 7, 8)
				}
			])
		);

		const rule = m.overview_event_rule({ rule: 'Too warm' });
		expect(events()).toEqual([
			{
				as: 'a',
				href: '/locations/1/devices/A',
				icon: 'bell',
				tone: 'danger',
				title: m.overview_event_alert_triggered({ device: 'Freezer probe' }),
				meta: `${rule} · Cold Room 1`,
				time: '08:52',
				narrowTime: '08:52'
			},
			{
				as: 'a',
				href: '/locations/2/devices/B',
				icon: 'check',
				tone: 'success',
				title: m.overview_event_alert_resolved({ device: m.dashboard_unnamed_device() }),
				meta: `${rule} · ${m.overview_event_active_for({ duration: '1h 12m' })}`,
				time: '08:20',
				narrowTime: '08:20'
			}
		]);
	});

	it('describes devices going offline and coming back', () => {
		const { events } = render(
			feed([
				{
					kind: 'device_offline',
					at: at(15, 6, 38),
					devEui: 'C',
					deviceName: 'Soil probe',
					locationId: 3,
					locationName: 'Field A',
					lastSeenAt: at(15, 6, 8)
				},
				{
					kind: 'device_online',
					at: at(14, 23, 0),
					devEui: 'D',
					deviceName: 'Water level',
					locationId: 4,
					locationName: 'Pond',
					lastSeenAt: at(14, 22, 15)
				}
			])
		);

		const when = formatRelative(at(15, 6, 8), NOW, LOCALE);
		expect(events()).toEqual([
			{
				as: 'a',
				href: '/locations/3/devices/C',
				icon: 'device',
				tone: 'warning',
				title: m.overview_event_device_offline({ device: 'Soil probe' }),
				meta: `${m.overview_event_last_seen({ when: when ?? '' })} · Field A`,
				time: '06:38',
				narrowTime: '06:38'
			},
			{
				as: 'a',
				href: '/locations/4/devices/D',
				icon: 'device',
				tone: 'success',
				title: m.overview_event_device_online({ device: 'Water level' }),
				meta: `${m.overview_event_offline_for({ duration: '45m' })} · Pond`,
				time: m.overview_yesterday(),
				narrowTime: m.overview_yesterday()
			}
		]);
	});

	it('describes sent reports and the fleet data summaries', () => {
		const { events } = render(
			feed([
				{
					kind: 'report',
					at: at(13, 6, 0),
					devEui: 'E',
					deviceName: 'Barn sensor',
					locationId: 5,
					locationName: 'Barn',
					file: REPORT_FILE
				},
				{ kind: 'data_hour', at: at(13, 5, 0), reporting: 44, total: 48 },
				{ kind: 'data_day', at: at(13, 4, 0), reporting: 47, total: 48, uplinks: 13800 }
			])
		);

		const [report, hour, day] = events();
		expect(report).toMatchObject({
			as: 'button',
			href: null,
			icon: 'send',
			tone: 'info',
			title: m.overview_event_report_sent({ device: 'Barn sensor' }),
			time: '10月13日'
		});
		const period = formatReportPeriod(REPORT_FILE, LOCALE);
		expect(period).not.toBeNull();
		expect(report.meta).toBe(`${m.overview_event_report_meta({ period: period ?? '' })} · Barn`);
		expect(hour).toEqual({
			as: 'div',
			href: null,
			icon: 'pulse',
			tone: 'secondary',
			title: m.overview_event_data_hour({ reporting: 44, total: 48 }),
			meta: m.overview_event_all_locations(),
			time: '10月13日',
			narrowTime: '10月13日'
		});
		expect(day).toMatchObject({
			as: 'div',
			icon: 'pulse',
			tone: 'secondary',
			title: m.overview_event_data_day({ reporting: 47, total: 48, uplinks: '1.4万' }),
			meta: m.overview_event_data_day_meta({ time: '10月13日 04:00' })
		});
	});

	it('leaves out what an event does not say, and links nothing it cannot', () => {
		const { events } = render(
			feed([
				{ kind: 'alert_triggered', at: at(15, 8, 0), devEui: 'A', locationId: null },
				{ kind: 'alert_resolved', at: at(15, 7, 0), ruleName: 'Dry', triggeredAt: 'garbled' },
				{ kind: 'device_offline', at: at(15, 6, 0), devEui: 'C', locationId: 3 },
				{ kind: 'device_online', at: at(15, 5, 0), locationName: 'Pond' },
				{ kind: 'report', at: at(15, 4, 0), devEui: 'E', locationName: 'Barn' },
				{ kind: 'data_hour', at: at(15, 3, 0) },
				{ kind: 'data_day', at: at(15, 2, 0) }
			])
		);

		expect(events().map(({ as, href, title, meta }) => ({ as, href, title, meta }))).toEqual([
			{
				as: 'div',
				href: null,
				title: m.overview_event_alert_triggered({ device: m.dashboard_unnamed_device() }),
				meta: ''
			},
			{
				as: 'div',
				href: null,
				title: m.overview_event_alert_resolved({ device: m.dashboard_unnamed_device() }),
				meta: m.overview_event_rule({ rule: 'Dry' })
			},
			{
				as: 'a',
				href: '/locations/3/devices/C',
				title: m.overview_event_device_offline({ device: m.dashboard_unnamed_device() }),
				meta: ''
			},
			{
				as: 'div',
				href: null,
				title: m.overview_event_device_online({ device: m.dashboard_unnamed_device() }),
				meta: 'Pond'
			},
			{
				as: 'div',
				href: null,
				title: m.overview_event_report_sent({ device: m.dashboard_unnamed_device() }),
				meta: 'Barn'
			},
			{
				as: 'div',
				href: null,
				title: m.overview_event_data_hour({ reporting: 0, total: 0 }),
				meta: m.overview_event_all_locations()
			},
			{
				as: 'div',
				href: null,
				title: m.overview_event_data_day({ reporting: 0, total: 0, uplinks: '0' }),
				meta: m.overview_event_data_day_meta({ time: '10月15日 02:00' })
			}
		]);
	});

	it('shows the newest eight', () => {
		const items = Array.from({ length: 10 }, (_, i) => ({
			kind: 'data_hour' as const,
			at: at(15, 9, 0 - i),
			reporting: i,
			total: 10
		}));

		const titles = render(feed(items))
			.events()
			.map((event) => event.title);

		expect(titles).toEqual(
			items
				.slice(0, 8)
				.map((item) => m.overview_event_data_hour({ reporting: item.reporting, total: 10 }))
		);
	});

	it('says when there is no activity, and takes a class', () => {
		const { section, events } = render(feed([]), 'ov-order-2');

		expect(events()).toEqual([]);
		expect(section.querySelector('.events-empty')?.textContent).toBe(m.overview_activity_empty());
		expect(section.classList.contains('ov-order-2')).toBe(true);
		expect(section.classList.contains('section--stack-phone')).toBe(true);
		expect(section.querySelector('h2')?.textContent).toBe(m.overview_activity_title());
		expect(section.querySelector('.section__subtitle')?.textContent?.trim()).toBe(
			m.overview_activity_subtitle()
		);
	});
});

describe('ActivityCard filters', () => {
	const items: OverviewFeedItemDto[] = [
		{ kind: 'alert_triggered', at: at(15, 9, 0), deviceName: 'One' },
		{ kind: 'data_hour', at: at(15, 8, 0), reporting: 1, total: 2 },
		{ kind: 'alert_resolved', at: at(15, 7, 0), deviceName: 'Two' },
		{ kind: 'device_offline', at: at(15, 6, 0), deviceName: 'Three' },
		{ kind: 'device_online', at: at(15, 5, 0), deviceName: 'Four' }
	];
	const counts = { alert: 12, device: 3, report: 0, data: 24 };

	it('offers each group with its count, all of them first', () => {
		const { section, chips } = render(feed(items, counts));

		expect(section.querySelector('.filters')?.getAttribute('aria-label')).toBe(
			m.overview_activity_filter_label()
		);
		expect(
			chips().map((chip) => [
				chip.firstChild?.textContent,
				chip.querySelector('.filters__count')?.textContent,
				chip.getAttribute('aria-pressed')
			])
		).toEqual([
			[m.overview_filter_all(), '39', 'true'],
			[m.overview_filter_alerts(), '12', 'false'],
			[m.overview_filter_reports(), '0', 'false'],
			[m.overview_filter_data(), '24', 'false'],
			[m.overview_filter_devices(), '3', 'false']
		]);
	});

	it('shows only the chosen group', () => {
		const card = render(feed(items, counts));
		const titles = () => card.events().map((event) => event.title);

		card.filter(1);
		expect(card.chips().map((chip) => chip.getAttribute('aria-pressed'))).toEqual([
			'false',
			'true',
			'false',
			'false',
			'false'
		]);
		expect(titles()).toEqual([
			m.overview_event_alert_triggered({ device: 'One' }),
			m.overview_event_alert_resolved({ device: 'Two' })
		]);

		card.filter(4);
		expect(titles()).toEqual([
			m.overview_event_device_offline({ device: 'Three' }),
			m.overview_event_device_online({ device: 'Four' })
		]);

		card.filter(3);
		expect(titles()).toEqual([m.overview_event_data_hour({ reporting: 1, total: 2 })]);

		card.filter(2);
		expect(titles()).toEqual([]);
		expect(card.section.querySelector('.events-empty')?.textContent).toBe(
			m.overview_activity_empty()
		);

		card.filter(0);
		expect(titles()).toHaveLength(5);
	});
});

describe('ActivityCard reports', () => {
	const reportFeed = () =>
		feed([
			{ kind: 'report', at: at(15, 6, 0), devEui: 'DEV-R', deviceName: 'Barn', file: REPORT_FILE }
		]);

	it("opens the report's PDF in a new tab, once at a time", async () => {
		const open = vi.spyOn(window, 'open').mockReturnValue(null);
		let release!: (value: { url: string }) => void;
		services.reports.getReportTemplateDownloadUrl.mockReturnValue(
			new Promise((resolve) => (release = resolve))
		);
		const card = render(reportFeed());
		const button = card.reportButton() as HTMLButtonElement;
		expect(button.getAttribute('aria-busy')).toBe('false');

		button.click();
		flushSync();
		expect(button.getAttribute('aria-busy')).toBe('true');
		button.click();
		expect(services.reports.getReportTemplateDownloadUrl).toHaveBeenCalledTimes(1);
		expect(services.reports.getReportTemplateDownloadUrl).toHaveBeenCalledWith(
			'DEV-R',
			REPORT_FILE
		);

		release({ url: 'https://files.test/report.pdf' });
		await vi.waitFor(() => expect(button.getAttribute('aria-busy')).toBe('false'));
		expect(open).toHaveBeenCalledWith('https://files.test/report.pdf', '_blank', 'noopener');
		expect(view?.toasts()).toEqual([]);

		button.click();
		await vi.waitFor(() =>
			expect(services.reports.getReportTemplateDownloadUrl).toHaveBeenCalledTimes(2)
		);
	});

	it('shows why a report could not be opened', async () => {
		const open = vi.spyOn(window, 'open').mockReturnValue(null);
		services.reports.getReportTemplateDownloadUrl.mockRejectedValue(
			new ApiError(403, 'Forbidden', { url: 'x', payload: { message: 'No reporting plan' } })
		);
		const card = render(reportFeed());

		card.reportButton()?.click();

		await vi.waitFor(() =>
			expect(view?.toasts().map(({ tone, message }) => ({ tone, message }))).toEqual([
				{ tone: 'danger', message: 'No reporting plan' }
			])
		);
		expect(open).not.toHaveBeenCalled();
		await vi.waitFor(() => expect(card.reportButton()?.getAttribute('aria-busy')).toBe('false'));
	});
});
