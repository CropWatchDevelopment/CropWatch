import { flushSync } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { OverviewReportDto } from '$lib/api/api.dtos';
import { ApiError } from '$lib/api/api-error';
import { m } from '$lib/paraglide/messages.js';
import type { AppServices } from '$lib/services/app-services';
import { createClientServices } from '$lib/services/client';
import { createFakeFetch, jsonResponse, testPublicConfig } from '$lib/testing/http';
import { createMockServices, type MockServices } from '$lib/testing/mock-services';
import { renderWithServices } from '$lib/testing/render';
import ReportsCard from './ReportsCard.svelte';
import { formatReportPeriod } from './overview';

const LOCALE = 'ja-JP';
/** 15 Oct 2026, 09:05 in the browser's time zone. */
const NOW = new Date(2026, 9, 15, 9, 5).getTime();
const FILE = '2026_10_04-2026_10_10.pdf';

const report = (overrides: Partial<OverviewReportDto> = {}): OverviewReportDto => ({
	devEui: 'DEV-1',
	deviceName: 'Barn sensor',
	locationId: 5,
	locationName: 'Barn',
	file: FILE,
	createdAt: new Date(2026, 9, 15, 6, 0).toISOString(),
	...overrides
});

let services: MockServices;
let view: ReturnType<typeof renderWithServices> | null = null;

function render(
	reports: OverviewReportDto[],
	options: { services?: AppServices; class?: string } = {}
) {
	view = renderWithServices(ReportsCard, {
		props: { reports, locale: LOCALE, now: NOW, class: options.class },
		services: options.services ?? services,
		app: { accessToken: 'jwt-token' }
	});
	const section = view.target.querySelector('section') as HTMLElement;
	return {
		section,
		buttons: () => [...section.querySelectorAll<HTMLButtonElement>('button.report')],
		rows: () =>
			[...section.querySelectorAll<HTMLElement>('button.report')].map((button) => ({
				name: button.querySelector('.report__name')?.textContent,
				meta: button.querySelector('.report__meta')?.textContent?.trim()
			}))
	};
}

beforeEach(() => {
	services = createMockServices();
});

afterEach(() => {
	view?.unmount();
	view = null;
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe('ReportsCard', () => {
	it('says when no report has been sent, and always links to all reports', () => {
		const { section, rows } = render([], { class: 'ov-order-7' });

		expect(rows()).toEqual([]);
		expect(section.querySelector('.reports-empty')?.textContent).toBe(m.overview_reports_empty());
		const all = section.querySelector('.section__actions a.reports__all');
		expect(all?.getAttribute('href')).toBe('/reports');
		expect(all?.textContent).toBe(m.overview_reports_all());
		expect(section.querySelector('h2')?.textContent).toBe(m.overview_reports_title());
		expect(section.classList.contains('ov-order-7')).toBe(true);
	});

	it('lists each report with its device, period and when it was sent', () => {
		const { rows } = render([
			report(),
			report({
				devEui: 'DEV-2',
				deviceName: null,
				file: 'summary.pdf',
				createdAt: new Date(2026, 9, 14, 23, 0).toISOString()
			}),
			report({ devEui: 'DEV-3', createdAt: 'garbled' })
		]);

		const period = formatReportPeriod(FILE, LOCALE);
		expect(rows()).toEqual([
			{ name: 'Barn sensor', meta: `${period} · 06:00` },
			{ name: m.dashboard_unnamed_device(), meta: m.overview_yesterday() },
			{ name: 'Barn sensor', meta: period }
		]);
	});

	it('opens the PDF in a new tab, one download at a time', async () => {
		const open = vi.spyOn(window, 'open').mockReturnValue(null);
		let release!: (value: { url: string }) => void;
		services.reports.getReportTemplateDownloadUrl.mockReturnValue(
			new Promise((resolve) => (release = resolve))
		);
		const { buttons } = render([report(), report({ devEui: 'DEV-2' })]);
		const [first, second] = buttons();
		expect(first.getAttribute('aria-busy')).toBe('false');

		first.click();
		flushSync();
		expect(first.getAttribute('aria-busy')).toBe('true');
		expect(second.getAttribute('aria-busy')).toBe('false');
		second.click();
		first.click();
		expect(services.reports.getReportTemplateDownloadUrl).toHaveBeenCalledTimes(1);
		expect(services.reports.getReportTemplateDownloadUrl).toHaveBeenCalledWith('DEV-1', FILE);

		release({ url: 'https://files.test/report.pdf' });
		await vi.waitFor(() => expect(first.getAttribute('aria-busy')).toBe('false'));
		expect(open).toHaveBeenCalledWith('https://files.test/report.pdf', '_blank', 'noopener');
		expect(view?.toasts()).toEqual([]);

		services.reports.getReportTemplateDownloadUrl.mockResolvedValue({
			url: 'https://files.test/2.pdf'
		});
		second.click();
		await vi.waitFor(() =>
			expect(open).toHaveBeenLastCalledWith('https://files.test/2.pdf', '_blank', 'noopener')
		);
		expect(services.reports.getReportTemplateDownloadUrl).toHaveBeenLastCalledWith('DEV-2', FILE);
	});

	it('says why a report could not be opened', async () => {
		const open = vi.spyOn(window, 'open').mockReturnValue(null);
		services.reports.getReportTemplateDownloadUrl
			.mockRejectedValueOnce(
				new ApiError(404, 'Not Found', { url: 'x', payload: { message: 'Report not found' } })
			)
			.mockResolvedValueOnce({ url: '' });
		const { buttons } = render([report()]);
		const toasts = () => view?.toasts().map(({ tone, message }) => ({ tone, message }));

		buttons()[0].click();
		await vi.waitFor(() =>
			expect(toasts()).toEqual([{ tone: 'danger', message: 'Report not found' }])
		);
		await vi.waitFor(() => expect(buttons()[0].getAttribute('aria-busy')).toBe('false'));

		buttons()[0].click();
		await vi.waitFor(() =>
			expect(toasts()?.at(-1)).toEqual({
				tone: 'danger',
				message: m.reports_new_download_missing_url()
			})
		);
		expect(open).not.toHaveBeenCalled();
	});

	it("asks the API for the file's signed URL as the signed-in user", async () => {
		vi.spyOn(window, 'open').mockReturnValue(null);
		const fake = createFakeFetch(() => jsonResponse({ url: 'https://files.test/report.pdf' }));
		vi.stubGlobal('fetch', fake.fetch);
		// Wired as the root layout wires them: the token is read from the app context.
		const client = createClientServices({
			config: testPublicConfig(),
			authToken: () => view?.app.accessToken
		});
		const { buttons } = render([report({ file: 'March report.pdf' })], { services: client });

		buttons()[0].click();

		await vi.waitFor(() => expect(fake.requests).toHaveLength(1));
		const [request] = fake.requests;
		expect(request.method).toBe('GET');
		expect(request.path).toBe('/reports/download/DEV-1/March%20report.pdf');
		expect(request.headers.get('authorization')).toBe('Bearer jwt-token');
	});
});
