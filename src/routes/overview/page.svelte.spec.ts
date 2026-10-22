import { flushSync } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import type { MeContextDto, OverviewDto } from '$lib/api/api.dtos';
import { ApiError } from '$lib/api/api-error';
import type { AppContext } from '$lib/appContext.svelte';
import { formatCwDuration, formatRelative } from '$lib/i18n/format';
import { m } from '$lib/paraglide/messages.js';
import type { AppServices } from '$lib/services/app-services';
import { createClientServices } from '$lib/services/client';
import { createFakeFetch, jsonResponse, testPublicConfig } from '$lib/testing/http';
import { createMockServices, type MockServices } from '$lib/testing/mock-services';
import { renderWithServices } from '$lib/testing/render';
import { reactiveNow } from '$lib/utils/reactive-now.svelte';
import OverviewPage from './+page.svelte';
import { feedTimeLabel, formatReportPeriod } from './overview';

const MINUTE = 60_000;
const LOCALE = 'ja-JP';

/** The fleet as the API reports it, aggregated `ageMs` ago. */
function overview(overrides: Partial<OverviewDto> = {}, ageMs = 2 * MINUTE): OverviewDto {
	const now = Date.now();
	return {
		range: '24h',
		generatedAt: new Date(now - ageMs).toISOString(),
		since: new Date(now - 24 * 60 * MINUTE).toISOString(),
		devices: {
			total: 48,
			online: 44,
			offline: 4,
			lastDataAt: new Date(now - 40_000).toISOString(),
			locationCount: 6
		},
		gateways: { total: 3, online: 2 },
		alerts: { count: 7, previousCount: 10, active: 2, topDevices: [] },
		reports: { count: 2, lastAt: null, recent: [] },
		uplinks: { count: 13800, delivered: 13650, expected: 13780 },
		hourly: [],
		locations: [],
		types: [],
		notes: [],
		feed: { counts: { alert: 0, device: 0, report: 0, data: 0 }, items: [] },
		attention: {
			offline: [
				{ locationId: 2, name: 'Field A', count: 3 },
				{ locationId: 3, name: 'Greenhouse 2', count: 1 }
			],
			activeAlerts: [{ locationId: 1, name: 'Cold Room 1', count: 2 }]
		},
		...overrides
	};
}

const devices = (counts: { total: number; online: number; offline: number }) => ({
	...overview().devices,
	...counts
});

const companyOrg = (type: 'company' | 'personal', name: string) =>
	({ org: { type, name } }) as unknown as MeContextDto;

let services: MockServices;
let view: ReturnType<typeof renderWithServices> | null = null;

function render(
	initialOverview: OverviewDto | null,
	options: { app?: Partial<AppContext>; services?: AppServices } = {}
) {
	let data = $state.raw({ initialOverview });
	view = renderWithServices(OverviewPage, {
		props: {
			get data() {
				return data;
			},
			params: {}
		} as never,
		services: options.services ?? services,
		app: { accessToken: 'jwt-token', ...options.app }
	});
	return {
		...view,
		/** SvelteKit hands the page new data (an invalidation, a revisit). */
		setData(next: OverviewDto | null) {
			data = { initialOverview: next };
			flushSync();
		}
	};
}

const root = () => document.querySelector('.ov') as HTMLElement;
const text = () => root()?.textContent ?? '';
const healthCard = () => document.querySelector('section.health') as HTMLElement | null;
const hero = () => document.querySelector('section.hero') as HTMLElement | null;
const health = () => ({
	title: healthCard()?.querySelector('.health__title')?.textContent,
	parts: healthCard()?.querySelector('.health__sub')?.textContent?.split(' · '),
	chip: healthCard()?.querySelector('.health__chip')?.textContent,
	heroTitle: hero()?.querySelector('.hero__title')?.textContent,
	percent: hero()?.querySelector('.hero__percent')?.textContent
});
const rangeSwitches = () => [...document.querySelectorAll<HTMLElement>('.range')];
const pressedRanges = () =>
	rangeSwitches().map(
		(group) => group.querySelector('[aria-pressed="true"]')?.textContent?.trim() ?? null
	);
const rangeButton = (label: string) =>
	[...(rangeSwitches()[0]?.querySelectorAll('button') ?? [])].find(
		(button) => button.textContent?.trim() === label
	) as HTMLButtonElement;
const retryButton = () =>
	[...document.querySelectorAll('button')].find((button) =>
		button.textContent?.includes(m.action_try_again())
	) as HTMLButtonElement | undefined;
const kpiSub = (head: string) =>
	[...document.querySelectorAll('.kpi')]
		.find((kpi) => kpi.querySelector('.kpi__head')?.textContent === head)
		?.querySelector('.kpi__sub')
		?.textContent?.trim();
const tooltip = () =>
	document.querySelector('.ov-header [role="tooltip"]')?.textContent?.trim() ?? null;
const toasts = () => view?.toasts().map(({ tone, message }) => ({ tone, message })) ?? [];

/** Promise callbacks run, then the DOM catches up. */
async function settle() {
	for (let i = 0; i < 5; i += 1) await Promise.resolve();
	flushSync();
}

beforeEach(() => {
	services = createMockServices();
});

afterEach(() => {
	view?.unmount();
	view = null;
	document.body.innerHTML = '';
	vi.useRealTimers();
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe('overview page', () => {
	it('titles the page and links to the dashboard', () => {
		render(overview());

		expect(document.title).toBe(m.overview_page_title());
		expect(document.querySelector('h1')?.textContent).toBe(m.overview_page_title());
		const dashboard = [...document.querySelectorAll('a.ov-button')];
		expect(dashboard.map((link) => link.getAttribute('href'))).toEqual(['/', '/']);
		expect(dashboard.map((link) => link.textContent)).toEqual([
			m.overview_open_dashboard(),
			m.overview_open_dashboard()
		]);
		// The header link shows at every width (phones too); the one at the bottom on phones only.
		expect(dashboard[0].closest('.ov-wide-only, .ov-narrow-only')).toBeNull();
		expect(dashboard[1].classList.contains('ov-narrow-only')).toBe(true);
	});

	it('names a company organisation above the title, but not a personal one', () => {
		render(overview(), { app: { orgContext: companyOrg('company', 'Acme Farms') } });
		expect(document.querySelector('.ov-header__eyebrow')?.textContent).toBe('Acme Farms');
		view?.unmount();

		render(overview(), { app: { orgContext: companyOrg('personal', 'Ada Lovelace') } });
		expect(document.querySelector('.ov-header__eyebrow')).toBeNull();
		view?.unmount();

		render(overview());
		expect(document.querySelector('.ov-header__eyebrow')).toBeNull();
	});

	it('shows the server copy without asking the API again', () => {
		render(overview());

		expect(services.overview.getOverview).not.toHaveBeenCalled();
		expect(root().getAttribute('aria-busy')).toBe('false');
		expect(pressedRanges()).toEqual([m.overview_range_24h(), m.overview_range_24h()]);
		for (const title of [
			m.overview_attention_title(),
			m.overview_activity_title(),
			m.overview_reporting_title(),
			m.overview_breakdown_title(),
			m.overview_locations_title(),
			m.overview_notes_title(),
			m.overview_reports_title()
		]) {
			expect(text()).toContain(title);
		}
		expect(document.querySelector('section.kpis')).not.toBeNull();
		expect(document.getElementById('attention')).not.toBeNull();
		expect(document.querySelectorAll('.live')).toHaveLength(2);
		expect(document.querySelector('.hero .live')?.classList.contains('live--compact')).toBe(true);
	});

	it('is seeded once: new page data does not replace what is on screen', () => {
		const page = render(overview());

		page.setData(overview({ devices: devices({ total: 99, online: 99, offline: 0 }) }));

		expect(document.querySelector('.kpi__value')?.textContent).toBe('48');
	});

	it('hands each card its part of the overview, with the locale and the time', () => {
		const at = new Date(Date.now() - 5 * MINUTE).toISOString();
		const file = '2026_10_04-2026_10_10.pdf';
		render(
			overview({
				reports: {
					count: 2,
					lastAt: at,
					recent: [
						{
							devEui: 'DEV-R',
							deviceName: 'Barn sensor',
							locationId: 5,
							locationName: 'Barn',
							file,
							createdAt: at
						}
					]
				},
				hourly: [{ hour: at, reporting: 24 }],
				notes: [
					{
						id: 1,
						devEui: 'DEV-N',
						deviceName: 'Probe',
						locationId: 2,
						locationName: 'Field A',
						title: 'Irrigation',
						note: null,
						author: 'Ada',
						authorIsStaff: false,
						createdAt: at
					}
				],
				feed: {
					counts: { alert: 1, device: 0, report: 0, data: 0 },
					items: [{ kind: 'alert_triggered', at, deviceName: 'Freezer' }]
				},
				locations: [{ locationId: 2, name: 'Field A', total: 48, online: 44, alerts: 0 }],
				types: [{ dataTable: 'cw_air_data', total: 48 }]
			})
		);

		const now = reactiveNow.value;
		const ago = formatRelative(at, now, LOCALE) ?? '';
		const time = feedTimeLabel(at, now, LOCALE, m.overview_yesterday());
		expect(kpiSub(m.overview_kpi_reports())).toBe(m.overview_kpi_reports_last({ when: ago }));
		expect(document.querySelector('.event__title')?.textContent).toBe(
			m.overview_event_alert_triggered({ device: 'Freezer' })
		);
		expect(document.querySelector('.event__time--wide')?.textContent).toBe(time);
		expect(document.querySelector<HTMLElement>('.chart__bar')?.style.height).toBe('50%');
		expect(document.querySelector('.loc__link')?.textContent).toBe('Field A');
		expect(document.querySelector('.note__by')?.textContent?.trim()).toBe(`Ada · ${ago}`);
		expect(document.querySelector('.report__name')?.textContent).toBe('Barn sensor');
		expect(document.querySelector('.report__meta')?.textContent?.trim()).toBe(
			`${formatReportPeriod(file, LOCALE)} · ${time}`
		);
		expect(document.querySelector('.kpi__value')?.textContent).toBe('48');
		expect(document.querySelectorAll('.att-list--wide .att')).toHaveLength(3);
	});
});

describe('overview page health summary', () => {
	it('is mostly healthy with items to look at when at least 90 % are online', () => {
		render(overview());

		expect(health()).toEqual({
			title: m.overview_health_mostly_title_other({ count: 3 }),
			heroTitle: m.overview_health_mostly_title_other({ count: 3 }),
			chip: m.overview_health_chip_attention(),
			percent: '92%',
			parts: [
				m.overview_health_offline_other({ count: 4 }),
				m.overview_health_alerts_other({ count: 2 }),
				m.overview_health_gateways_offline_one(),
				m.overview_health_last_data({
					when: formatRelative(overview().devices.lastDataAt, reactiveNow.value, LOCALE) ?? ''
				})
			]
		});
		expect(healthCard()?.querySelector('a.health__link')?.getAttribute('href')).toBe('#attention');
	});

	it('needs attention below 90 % online', () => {
		render(
			overview({
				devices: devices({ total: 48, online: 40, offline: 8 }),
				gateways: { total: 3, online: 0 }
			})
		);

		expect(health()).toMatchObject({
			title: m.overview_health_attention_title_other({ count: 3 }),
			percent: '83%',
			parts: [
				m.overview_health_offline_other({ count: 8 }),
				m.overview_health_alerts_other({ count: 2 }),
				m.overview_health_gateways_offline_other({ count: 3 }),
				expect.any(String)
			]
		});
	});

	it('words a single item, in either case', () => {
		const one = {
			alerts: { count: 1, previousCount: 0, active: 1, topDevices: [] },
			gateways: { total: 3, online: 3 }
		};

		render(overview({ ...one, devices: devices({ total: 48, online: 48, offline: 0 }) }));
		expect(health()).toMatchObject({
			title: m.overview_health_mostly_title_one(),
			parts: [
				m.overview_health_all_online(),
				m.overview_health_alerts_one(),
				m.overview_health_gateways_ok(),
				expect.any(String)
			]
		});
		view?.unmount();

		render(
			overview({
				devices: devices({ total: 2, online: 1, offline: 1 }),
				alerts: { count: 0, previousCount: 0, active: 0, topDevices: [] },
				gateways: { total: 3, online: 3 }
			})
		);
		expect(health()).toMatchObject({
			title: m.overview_health_attention_title_one(),
			percent: '50%',
			parts: [
				m.overview_health_offline_one(),
				m.overview_health_no_alerts(),
				m.overview_health_gateways_ok(),
				expect.any(String)
			]
		});
	});

	it('is all good with nothing to look at, leaving out gateways the fleet does not have', () => {
		render(
			overview({
				devices: { ...devices({ total: 5, online: 5, offline: 0 }), lastDataAt: null },
				alerts: { count: 3, previousCount: 1, active: 0, topDevices: [] },
				gateways: { total: 0, online: 0 }
			})
		);

		expect(health()).toEqual({
			title: m.overview_health_ok_title(),
			heroTitle: m.overview_health_ok_title(),
			chip: m.overview_health_chip_ok(),
			percent: '100%',
			parts: [
				m.overview_health_all_online(),
				m.overview_health_no_alerts(),
				m.overview_health_no_data()
			]
		});
		expect(healthCard()?.querySelector('a')).toBeNull();
		expect(document.querySelector('.att-none')).not.toBeNull();
	});

	it('explains the empty state when there are no devices', () => {
		render(
			overview({
				devices: { ...devices({ total: 0, online: 0, offline: 0 }), lastDataAt: null },
				alerts: { count: 0, previousCount: 0, active: 0, topDevices: [] },
				gateways: { total: 0, online: 0 }
			})
		);

		expect(health()).toEqual({
			title: m.overview_health_empty_title(),
			heroTitle: m.overview_health_empty_title(),
			chip: m.overview_health_chip_empty(),
			percent: '0%',
			parts: [m.overview_health_empty_body()]
		});
	});
});

describe('overview page without data', () => {
	it('offers a retry when the server could not load the overview', () => {
		render(null);

		const notice = document.querySelector('.app-notice--danger');
		expect(notice?.textContent).toContain(m.overview_load_failed());
		expect(retryButton()).toBeDefined();
		expect(healthCard()).toBeNull();
		expect(rangeSwitches()).toHaveLength(0);
		expect(document.querySelectorAll('.live')).toHaveLength(0);
		expect([...document.querySelectorAll('a.ov-button')]).toHaveLength(1);
	});

	it('loads the last 24 hours on retry and shows them', async () => {
		let release!: (value: OverviewDto) => void;
		services.overview.getOverview.mockReturnValue(new Promise((resolve) => (release = resolve)));
		render(null);

		retryButton()?.click();
		flushSync();

		expect(services.overview.getOverview).toHaveBeenCalledWith('24h');
		expect(root().getAttribute('aria-busy')).toBe('true');
		expect(root().classList.contains('ov--loading')).toBe(true);
		expect(retryButton()?.getAttribute('aria-busy')).toBe('true');

		release(overview());
		await vi.waitFor(() => expect(healthCard()).not.toBeNull());
		expect(document.querySelector('.app-notice--danger')).toBeNull();
		expect(root().getAttribute('aria-busy')).toBe('false');
		expect(toasts()).toEqual([]);
	});

	it('says why a retry failed, and stays ready to try again', async () => {
		services.overview.getOverview
			.mockRejectedValueOnce(
				new ApiError(503, 'Service Unavailable', {
					url: 'x',
					payload: { message: 'Overview is warming up' }
				})
			)
			.mockRejectedValueOnce({})
			// Neither an API error without a message in its body nor a network
			// failure has text for users: both show the translated fallback.
			.mockRejectedValueOnce(
				new ApiError(500, 'Internal Server Error', { url: 'x', payload: null })
			)
			.mockRejectedValueOnce(new TypeError('Failed to fetch'));
		render(null);

		for (const expected of [
			'Overview is warming up',
			m.overview_load_failed(),
			m.overview_load_failed(),
			m.overview_load_failed()
		]) {
			retryButton()?.click();
			await vi.waitFor(() =>
				expect(toasts().at(-1)).toEqual({ tone: 'danger', message: expected })
			);
			await vi.waitFor(() => expect(root().getAttribute('aria-busy')).toBe('false'));
			expect(document.querySelector('.app-notice--danger')).not.toBeNull();
		}
		expect(services.overview.getOverview).toHaveBeenCalledTimes(4);
		expect(toasts().map(({ message }) => message)).not.toContain(
			'CropWatch API request failed (500 Internal Server Error)'
		);
	});
});

describe('overview page ranges', () => {
	it('keeps the current range on screen while another loads, then shows it', async () => {
		let release!: (value: OverviewDto) => void;
		services.overview.getOverview.mockReturnValue(new Promise((resolve) => (release = resolve)));
		render(overview());

		rangeButton(m.overview_range_7d()).click();
		flushSync();

		expect(services.overview.getOverview).toHaveBeenCalledWith('7d');
		expect(pressedRanges()).toEqual([m.overview_range_7d(), m.overview_range_7d()]);
		expect(root().classList.contains('ov--loading')).toBe(true);
		expect(kpiSub(m.overview_kpi_alerts())).toContain(m.overview_kpi_delta_24h({ delta: '−3' }));

		release(
			overview({ range: '7d', alerts: { count: 12, previousCount: 10, active: 0, topDevices: [] } })
		);
		await vi.waitFor(() =>
			expect(kpiSub(m.overview_kpi_alerts())).toBe(m.overview_kpi_delta_7d({ delta: '+2' }))
		);
		expect(root().classList.contains('ov--loading')).toBe(false);
	});

	it('switches back to a loaded range without asking again', async () => {
		services.overview.getOverview.mockResolvedValue(overview({ range: '30d' }));
		render(overview());

		rangeButton(m.overview_range_30d()).click();
		await vi.waitFor(() => expect(root().classList.contains('ov--loading')).toBe(false));
		rangeButton(m.overview_range_24h()).click();
		flushSync();
		rangeButton(m.overview_range_30d()).click();
		flushSync();

		expect(pressedRanges()).toEqual([m.overview_range_30d(), m.overview_range_30d()]);
		expect(services.overview.getOverview).toHaveBeenCalledTimes(1);
	});

	it('selects from the phone switch too', () => {
		services.overview.getOverview.mockReturnValue(new Promise(() => {}));
		render(overview());

		const phone = rangeSwitches()[1];
		expect(phone.classList.contains('range--full')).toBe(true);
		[...phone.querySelectorAll('button')][2].click();

		expect(services.overview.getOverview).toHaveBeenCalledWith('30d');
	});

	it('goes back to the range on screen and says why when a switch fails', async () => {
		services.overview.getOverview.mockRejectedValue(
			new ApiError(500, 'Error', { url: 'x', payload: { message: 'Range unavailable' } })
		);
		render(overview());

		rangeButton(m.overview_range_7d()).click();

		await vi.waitFor(() =>
			expect(toasts()).toEqual([{ tone: 'danger', message: 'Range unavailable' }])
		);
		await vi.waitFor(() =>
			expect(pressedRanges()).toEqual([m.overview_range_24h(), m.overview_range_24h()])
		);
		expect(healthCard()).not.toBeNull();
		expect(document.querySelector('.app-notice--danger')).toBeNull();
	});
});

describe('overview page live updates', () => {
	const fakeClock = () => vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] });
	let visibility: MockInstance<() => DocumentVisibilityState>;

	beforeEach(() => {
		visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
	});

	it('says the data is live while it is younger than 15 minutes', () => {
		render(overview({}, 2 * MINUTE));

		const live = document.querySelector('.ov-header .live') as HTMLElement;
		const [before, after] = m.overview_live_updated({ duration: '\u0000' }).split('\u0000');
		expect(live.textContent?.trim().startsWith(before)).toBe(true);
		expect(live.textContent?.trim().endsWith(after)).toBe(true);
		expect(live.querySelector('.live__dot--stale')).toBeNull();
	});

	it('only says how old older data is', () => {
		render(overview({}, 20 * MINUTE));

		const live = document.querySelector('.ov-header .live') as HTMLElement;
		const [before, after] = m.overview_updated({ duration: '\u0000' }).split('\u0000');
		expect(live.textContent?.trim().startsWith(before)).toBe(true);
		expect(live.textContent?.trim().endsWith(after)).toBe(true);
		expect(live.querySelector('.live__dot--stale')).not.toBeNull();
	});

	it('counts down to the first check after the data is due for a refresh', () => {
		fakeClock();
		// Due in 7.5 minutes; the page checks every minute from now, so at 8.
		render(overview({}, 2.5 * MINUTE));

		expect(tooltip()).toBe(m.overview_next_update({ duration: formatCwDuration(8 * MINUTE) }));

		vi.advanceTimersByTime(1000);
		flushSync();
		expect(tooltip()).toBe(
			m.overview_next_update({ duration: formatCwDuration(8 * MINUTE - 1000) })
		);
	});

	it('refreshes quietly on the minute check once the data is 10 minutes old', async () => {
		fakeClock();
		let release!: (value: OverviewDto) => void;
		services.overview.getOverview.mockReturnValue(new Promise((resolve) => (release = resolve)));
		render(overview({}, 9.5 * MINUTE));

		vi.advanceTimersByTime(MINUTE - 1);
		expect(services.overview.getOverview).not.toHaveBeenCalled();
		vi.advanceTimersByTime(1);
		flushSync();

		expect(services.overview.getOverview).toHaveBeenCalledTimes(1);
		expect(services.overview.getOverview).toHaveBeenCalledWith('24h');
		expect(tooltip()).toBe(m.overview_updating());
		// A background refresh does not dim the page.
		expect(root().getAttribute('aria-busy')).toBe('false');

		release(overview({ devices: devices({ total: 50, online: 50, offline: 0 }) }, 0));
		await settle();
		expect(document.querySelector('.kpi__value')?.textContent).toBe('50');
		expect(tooltip()).toBe(m.overview_next_update({ duration: formatCwDuration(10 * MINUTE) }));
	});

	it('keeps the data on screen, without a message, when a background refresh fails', async () => {
		fakeClock();
		services.overview.getOverview.mockRejectedValue(new Error('offline'));
		render(overview({}, 10 * MINUTE));

		vi.advanceTimersByTime(MINUTE);
		await settle();

		expect(services.overview.getOverview).toHaveBeenCalledTimes(1);
		expect(healthCard()).not.toBeNull();
		expect(toasts()).toEqual([]);
		// Once due, the next update is the next minute check.
		vi.advanceTimersByTime(1000);
		flushSync();
		expect(tooltip()).toBe(m.overview_next_update({ duration: formatCwDuration(MINUTE - 1000) }));
	});

	it('does not refresh data younger than 10 minutes, nor while the tab is hidden', () => {
		fakeClock();
		render(overview({}, 2 * MINUTE));
		vi.advanceTimersByTime(MINUTE);
		expect(services.overview.getOverview).not.toHaveBeenCalled();
		view?.unmount();
		view = null;

		visibility.mockReturnValue('hidden');
		render(overview({}, 30 * MINUTE));
		vi.advanceTimersByTime(5 * MINUTE);
		expect(services.overview.getOverview).not.toHaveBeenCalled();
	});

	it('refreshes data older than a minute when the user comes back to the app', () => {
		services.overview.getOverview.mockReturnValue(new Promise(() => {}));
		render(overview({}, 30_000));

		window.dispatchEvent(new Event('focus'));
		expect(services.overview.getOverview).not.toHaveBeenCalled();
		view?.unmount();
		view = null;

		render(overview({}, 90_000));
		window.dispatchEvent(new Event('focus'));
		expect(services.overview.getOverview).toHaveBeenCalledTimes(1);
		expect(services.overview.getOverview).toHaveBeenCalledWith('24h');
	});

	it('stops checking once the page is left', () => {
		fakeClock();
		render(overview({}, 30 * MINUTE));

		view?.unmount();
		view = null;
		vi.advanceTimersByTime(5 * MINUTE);
		window.dispatchEvent(new Event('focus'));

		expect(services.overview.getOverview).not.toHaveBeenCalled();
	});
});

describe('overview page requests', () => {
	it('asks the API for each range as the signed-in user', async () => {
		const fake = createFakeFetch((request) =>
			jsonResponse(overview({ range: request.path.endsWith('7d') ? '7d' : '24h' }))
		);
		vi.stubGlobal('fetch', fake.fetch);
		// Wired as the root layout wires them: the token is read from the app context.
		const client = createClientServices({
			config: testPublicConfig(),
			authToken: () => view?.app.accessToken
		});
		render(null, { services: client });

		retryButton()?.click();
		await vi.waitFor(() => expect(healthCard()).not.toBeNull());
		rangeButton(m.overview_range_7d()).click();
		await vi.waitFor(() => expect(fake.requests).toHaveLength(2));

		expect(fake.requests.map((request) => [request.method, request.path])).toEqual([
			['GET', '/overview?range=24h'],
			['GET', '/overview?range=7d']
		]);
		expect(fake.requests.map((request) => request.headers.get('authorization'))).toEqual([
			'Bearer jwt-token',
			'Bearer jwt-token'
		]);
	});
});
