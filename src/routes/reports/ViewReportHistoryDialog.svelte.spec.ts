import { flushSync } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '$lib/api/api-error';
import type { ReportRegenerationItemDto, ReportTemplateHistoryItemDto } from '$lib/api/api.dtos';
import { m } from '$lib/paraglide/messages.js';
import { createMockServices, type MockServices } from '$lib/testing/mock-services';
import { renderWithServices } from '$lib/testing/render';
import ViewReportHistoryDialog from './ViewReportHistoryDialog.svelte';

const { goto } = vi.hoisted(() => ({ goto: vi.fn(async () => {}) }));
vi.mock('$app/navigation', () => ({ goto }));

/** `YYYY-MM-DD`, `days` days before today (UTC). */
function daysAgo(days: number): string {
	const date = new Date();
	date.setUTCDate(date.getUTCDate() - days);
	return date.toISOString().slice(0, 10);
}

/** A report's storage object name: `<YYYY_MM_DD>-<YYYY_MM_DD><suffix>.pdf`. */
const reportName = (start: string, end: string, suffix = '') =>
	`${start.replaceAll('-', '_')}-${end.replaceAll('-', '_')}${suffix}.pdf`;

// A week inside the editing window, and one far past it.
const RECENT = { start: daysAgo(10), end: daysAgo(4) };
const RECENT_REPORT = reportName(RECENT.start, RECENT.end);
const RECENT_COPY = reportName(RECENT.start, RECENT.end, '_updated_20260101_0130');
const OLD_REPORT = reportName('2020-01-01', '2020-01-07');
const LEGACY_REPORT = 'Weekly Report June.pdf';

function entry(
	overrides: Partial<ReportTemplateHistoryItemDto> = {}
): ReportTemplateHistoryItemDto {
	return {
		devEui: 'DEV-A',
		deviceName: 'Freezer A',
		name: RECENT_REPORT,
		id: 'h-1',
		createdAt: '2026-07-19T00:10:00.000Z',
		updatedAt: null,
		lastAccessedAt: null,
		metadata: null,
		...overrides
	};
}

function regeneration(
	overrides: Partial<ReportRegenerationItemDto> = {}
): ReportRegenerationItemDto {
	return {
		id: 1,
		templateId: 9,
		devEui: 'DEV-A',
		// Midnight in Tokyo on the first day of the period.
		periodStart: `${RECENT.start}T00:00:00.000+09:00`,
		periodEnd: `${RECENT.end}T23:59:59.999+09:00`,
		status: 'pending',
		requestedAt: '2026-07-20T00:00:00.000Z',
		editCount: 3,
		...overrides
	};
}

const timestamp = (value: string) =>
	new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(
		new Date(value)
	);

let services: MockServices;
let view: ReturnType<typeof renderWithServices> | null = null;

function render() {
	view = renderWithServices(ViewReportHistoryDialog, {
		props: { templateId: 9, reportName: 'Weekly cold room' },
		services,
		app: { accessToken: 'jwt-token' }
	});
	return view;
}

const getHistory = () => services.reports.getReportTemplateHistory;
const getRegenerations = () => services.reports.getReportRegenerations;
const dialog = () => view!.target.querySelector('dialog') as HTMLDialogElement;
const text = () => dialog().textContent ?? '';
const groups = () => [...dialog().querySelectorAll<HTMLLIElement>('li.report-history__group')];
const items = (group: HTMLElement) => [
	...group.querySelectorAll<HTMLLIElement>('li.report-history__item')
];
const button = (id: string) => document.getElementById(id) as HTMLButtonElement | null;
const editButton = (devEui: string, index: number) =>
	button(`report-history-9-${devEui}-${index}-edit-button`);
const downloadButton = (devEui: string, index: number) =>
	button(`report-history-9-${devEui}-${index}-download-button`);

function click(element: Element | null | undefined) {
	(element as HTMLElement).click();
	flushSync();
}

const openHistory = () => click(button('report-history-9-open-button'));
const closeHistory = () => click(button('report-history-9-close-button'));

/** Records every error line the dialog shows, however briefly. */
function watchErrors() {
	const shown: string[] = [];
	const observer = new MutationObserver((records) => {
		for (const record of records) {
			for (const node of record.addedNodes) {
				if (node instanceof HTMLElement && node.matches('.report-history__status--error')) {
					shown.push(node.textContent ?? '');
				}
			}
		}
	});
	observer.observe(dialog(), { childList: true, subtree: true });
	return { shown, stop: () => observer.disconnect() };
}

beforeEach(() => {
	services = createMockServices();
	getRegenerations().mockResolvedValue([]);
});

afterEach(() => {
	view?.unmount();
	view = null;
	goto.mockClear();
	vi.restoreAllMocks();
});

describe('ViewReportHistoryDialog', () => {
	it('loads nothing until the dialog is opened', () => {
		render();

		expect(dialog().open).toBe(false);
		expect(getHistory()).not.toHaveBeenCalled();
		expect(getRegenerations()).not.toHaveBeenCalled();
		expect(
			button('report-history-9-open-button')
				?.querySelector('[role="img"]')
				?.getAttribute('aria-label')
		).toBe(m.reports_new_view_history());
	});

	it('shows a loading line, then the reports of the template', async () => {
		let finish!: (entries: ReportTemplateHistoryItemDto[]) => void;
		getHistory().mockReturnValue(new Promise((resolve) => (finish = resolve)));
		render();

		openHistory();

		expect(dialog().open).toBe(true);
		expect(dialog().querySelector('.cw-dialog__title')?.textContent).toBe(
			m.reports_new_view_history()
		);
		expect(text()).toContain(m.reports_new_history_subtitle({ name: 'Weekly cold room' }));
		expect(text()).toContain(m.reports_new_history_loading());
		expect(getHistory()).toHaveBeenCalledWith(9);
		expect(getRegenerations()).toHaveBeenCalledWith(9);

		finish([entry()]);

		await vi.waitFor(() => expect(groups()).toHaveLength(1));
		expect(text()).not.toContain(m.reports_new_history_loading());
		expect(button('report-history-9-close-button')?.textContent?.trim()).toBe(m.action_close());
	});

	it('groups the reports by device, sorted by device name', async () => {
		getHistory().mockResolvedValue([
			entry({ devEui: 'DEV-B', deviceName: 'Walk-in B', id: 'h-1' }),
			entry({ devEui: 'DEV-C', deviceName: null, id: 'h-4' }),
			entry({ devEui: 'DEV-A', deviceName: 'Freezer A', id: 'h-2' }),
			entry({ devEui: 'DEV-A', deviceName: 'Freezer A', id: 'h-3', name: OLD_REPORT })
		]);
		render();
		openHistory();

		await vi.waitFor(() => expect(groups()).toHaveLength(3));
		// A device without a name is shown by its EUI.
		expect(
			groups().map((group) => group.querySelector('.report-history__device')?.textContent)
		).toEqual(['DEV-C', 'Freezer A', 'Walk-in B']);
		expect(
			items(groups()[1]).map((item) => item.querySelector('.report-history__name')?.textContent)
		).toEqual([RECENT_REPORT, OLD_REPORT]);
	});

	it('shows when each report was generated, or a dash when that is unknown', async () => {
		getHistory().mockResolvedValue([
			entry({ id: 'h-1', createdAt: '2026-07-19T00:10:00.000Z' }),
			entry({ id: 'h-2', createdAt: null }),
			entry({ id: 'h-3', createdAt: 'not-a-date' })
		]);
		render();
		openHistory();

		await vi.waitFor(() => expect(groups()).toHaveLength(1));
		expect(
			items(groups()[0]).map((item) => item.querySelector('.report-history__time')?.textContent)
		).toEqual([timestamp('2026-07-19T00:10:00.000Z'), '—', '—']);
	});

	it('says when no reports have been generated yet', async () => {
		getHistory().mockResolvedValue([]);
		render();
		openHistory();

		await vi.waitFor(() => expect(text()).toContain(m.reports_new_history_empty()));
		expect(groups()).toHaveLength(0);
	});

	it('marks a report whose regeneration is queued, with the number of edits', async () => {
		getHistory().mockResolvedValue([
			entry({ id: 'h-1' }),
			// The regenerated copy itself never carries the badge.
			entry({ id: 'h-2', name: RECENT_COPY }),
			entry({ id: 'h-3', name: LEGACY_REPORT }),
			entry({ id: 'h-4', devEui: 'DEV-B', deviceName: 'Walk-in B' })
		]);
		getRegenerations().mockResolvedValue([
			regeneration(),
			regeneration({ id: 2, periodStart: 'not-a-date', editCount: 9 })
		]);
		render();
		openHistory();

		await vi.waitFor(() => expect(groups()).toHaveLength(2));
		const badges = (group: HTMLElement) =>
			items(group).map(
				(item) => item.querySelector('.report-history__regen')?.textContent?.trim() ?? null
			);
		expect(badges(groups()[0])).toEqual([
			m.reports_new_history_regen_badge({ count: 3 }),
			null,
			null
		]);
		expect(badges(groups()[1])).toEqual([null]);
	});

	it('still lists the reports when the regeneration listing fails', async () => {
		getHistory().mockResolvedValue([entry()]);
		getRegenerations().mockRejectedValue(new Error('Queue unavailable'));
		render();
		openHistory();

		await vi.waitFor(() => expect(groups()).toHaveLength(1));
		expect(dialog().querySelector('.report-history__regen')).toBeNull();
		expect(text()).not.toContain('Queue unavailable');
	});

	it('opens the notes editor for the period of a report', async () => {
		getHistory().mockResolvedValue([entry(), entry({ id: 'h-2', name: RECENT_COPY })]);
		render();
		openHistory();
		await vi.waitFor(() => expect(groups()).toHaveLength(1));
		expect(editButton('DEV-A', 0)?.disabled).toBe(false);
		expect(editButton('DEV-A', 0)?.hasAttribute('title')).toBe(false);
		expect(editButton('DEV-A', 0)?.textContent).toContain(m.action_edit());

		click(editButton('DEV-A', 0));

		expect(dialog().open).toBe(false);
		expect(goto).toHaveBeenCalledWith(
			`/reports/edit/9/data/DEV-A?start=${RECENT.start}&end=${RECENT.end}&file=${RECENT_REPORT}`
		);

		openHistory();
		click(editButton('DEV-A', 1));

		expect(goto).toHaveBeenLastCalledWith(
			`/reports/edit/9/data/DEV-A?start=${RECENT.start}&end=${RECENT.end}&file=${RECENT_COPY}`
		);
	});

	it('cannot edit a report past the editing window, and says why', async () => {
		getHistory().mockResolvedValue([entry({ name: OLD_REPORT })]);
		render();
		openHistory();

		await vi.waitFor(() => expect(editButton('DEV-A', 0)).not.toBeNull());
		expect(editButton('DEV-A', 0)?.disabled).toBe(true);
		expect(editButton('DEV-A', 0)?.title).toBe(m.reports_new_edit_data_too_old());
	});

	it('cannot edit a report whose name has no period', async () => {
		getHistory().mockResolvedValue([entry({ name: LEGACY_REPORT, id: null })]);
		render();
		openHistory();

		await vi.waitFor(() => expect(editButton('DEV-A', 0)).not.toBeNull());
		expect(editButton('DEV-A', 0)?.disabled).toBe(true);
		expect(editButton('DEV-A', 0)?.hasAttribute('title')).toBe(false);
	});

	it('downloads a report through its signed link', async () => {
		getHistory().mockResolvedValue([entry()]);
		services.reports.getReportTemplateDownloadUrl.mockResolvedValue({
			url: 'https://storage.test/signed/report.pdf'
		});
		const open = vi.spyOn(window, 'open').mockReturnValue(null);
		render();
		openHistory();
		await vi.waitFor(() => expect(downloadButton('DEV-A', 0)).not.toBeNull());
		expect(downloadButton('DEV-A', 0)?.textContent).toContain(m.action_download());

		click(downloadButton('DEV-A', 0));

		await vi.waitFor(() =>
			expect(open).toHaveBeenCalledWith(
				'https://storage.test/signed/report.pdf',
				'_blank',
				'noopener'
			)
		);
		expect(services.reports.getReportTemplateDownloadUrl).toHaveBeenCalledWith(
			'DEV-A',
			RECENT_REPORT
		);
		await vi.waitFor(() => expect(downloadButton('DEV-A', 0)?.disabled).toBe(false));
		expect(view!.toasts()).toHaveLength(0);
	});

	it('runs one download at a time, without blocking the edit buttons', async () => {
		getHistory().mockResolvedValue([entry(), entry({ id: 'h-2', name: RECENT_COPY })]);
		let finish!: (value: { url: string }) => void;
		services.reports.getReportTemplateDownloadUrl.mockReturnValue(
			new Promise((resolve) => (finish = resolve))
		);
		vi.spyOn(window, 'open').mockReturnValue(null);
		render();
		openHistory();
		await vi.waitFor(() => expect(downloadButton('DEV-A', 1)).not.toBeNull());

		click(downloadButton('DEV-A', 1));

		expect(downloadButton('DEV-A', 1)?.getAttribute('aria-busy')).toBe('true');
		expect(downloadButton('DEV-A', 0)?.getAttribute('aria-busy')).toBeNull();
		expect(downloadButton('DEV-A', 0)?.disabled).toBe(true);
		expect(editButton('DEV-A', 0)?.disabled).toBe(false);

		finish({ url: 'https://storage.test/signed/copy.pdf' });

		await vi.waitFor(() => expect(downloadButton('DEV-A', 0)?.disabled).toBe(false));
		expect(services.reports.getReportTemplateDownloadUrl).toHaveBeenCalledTimes(1);
	});

	it.each([
		['an empty link', { url: '' }],
		['no link', {}]
	])('says the link is unavailable when the API returns %s', async (_label, response) => {
		getHistory().mockResolvedValue([entry()]);
		services.reports.getReportTemplateDownloadUrl.mockResolvedValue(response as { url: string });
		const open = vi.spyOn(window, 'open').mockReturnValue(null);
		render();
		openHistory();
		await vi.waitFor(() => expect(downloadButton('DEV-A', 0)).not.toBeNull());

		click(downloadButton('DEV-A', 0));

		await vi.waitFor(() =>
			expect(view!.toasts()[0]).toMatchObject({
				tone: 'danger',
				message: m.reports_new_download_missing_url()
			})
		);
		expect(open).not.toHaveBeenCalled();
		await vi.waitFor(() => expect(downloadButton('DEV-A', 0)?.disabled).toBe(false));
	});

	it.each([
		["the API's message", { message: 'Report file missing' }, 'Report file missing'],
		['a generic message when there is none', {}, m.reports_new_download_failed()]
	])('shows %s when a download fails', async (_label, cause, message) => {
		getHistory().mockResolvedValue([entry()]);
		services.reports.getReportTemplateDownloadUrl.mockRejectedValue(cause);
		render();
		openHistory();
		await vi.waitFor(() => expect(downloadButton('DEV-A', 0)).not.toBeNull());

		click(downloadButton('DEV-A', 0));

		await vi.waitFor(() => expect(view!.toasts()[0]).toMatchObject({ tone: 'danger', message }));
		await vi.waitFor(() => expect(downloadButton('DEV-A', 0)?.disabled).toBe(false));
	});

	it('loads once, and keeps the reports when reopened', async () => {
		getHistory().mockResolvedValue([entry()]);
		render();
		openHistory();
		await vi.waitFor(() => expect(groups()).toHaveLength(1));

		closeHistory();
		expect(dialog().open).toBe(false);
		openHistory();

		expect(dialog().open).toBe(true);
		expect(groups()).toHaveLength(1);
		expect(getHistory()).toHaveBeenCalledTimes(1);
		expect(getRegenerations()).toHaveBeenCalledTimes(1);
	});

	it('does not start a second load while one is running', () => {
		getHistory().mockReturnValue(new Promise(() => {}));
		render();
		openHistory();

		closeHistory();
		openHistory();

		expect(getHistory()).toHaveBeenCalledTimes(1);
	});

	it.each([
		["the API's error", { message: 'History unavailable' }, 'History unavailable'],
		['a generic error when there is none', {}, undefined]
	])(
		'shows %s for a failed load, and loads again only when reopened',
		async (_label, cause, apiMessage) => {
			getHistory().mockRejectedValueOnce(cause).mockResolvedValueOnce([entry()]);
			render();
			const message = apiMessage ?? m.reports_new_history_load_failed();
			const errors = watchErrors();

			openHistory();

			await vi.waitFor(() => expect(text()).toContain(message));
			flushSync();
			// No retry by itself while the dialog stays open.
			expect(getHistory()).toHaveBeenCalledTimes(1);
			expect(dialog().querySelector('.report-history__status--error')?.textContent).toBe(message);
			errors.stop();
			expect(errors.shown).toEqual([message]);

			closeHistory();
			openHistory();

			expect(getHistory()).toHaveBeenCalledTimes(2);
			await vi.waitFor(() => expect(groups()).toHaveLength(1));
			expect(text()).not.toContain(message);
		}
	);

	it.each([
		[
			'an API error without a message',
			new ApiError(500, 'Internal Server Error', {
				url: 'https://api.cropwatch.test/reports/9/history',
				payload: null
			})
		],
		['a network failure', new TypeError('Failed to fetch')]
	])('shows the generic error for %s', async (_label, failure) => {
		getHistory().mockRejectedValue(failure);
		render();

		openHistory();

		await vi.waitFor(() =>
			expect(dialog().querySelector('.report-history__status--error')?.textContent).toBe(
				m.reports_new_history_load_failed()
			)
		);
	});

	it.each([
		[
			'an API error without a message',
			new ApiError(500, 'Internal Server Error', {
				url: 'https://api.cropwatch.test/reports/download',
				payload: null
			})
		],
		['a network failure', new TypeError('Failed to fetch')]
	])('shows the generic download error for %s', async (_label, failure) => {
		getHistory().mockResolvedValue([entry()]);
		services.reports.getReportTemplateDownloadUrl.mockRejectedValue(failure);
		render();
		openHistory();
		await vi.waitFor(() => expect(downloadButton('DEV-A', 0)).not.toBeNull());

		click(downloadButton('DEV-A', 0));

		await vi.waitFor(() =>
			expect(view!.toasts()[0]).toMatchObject({
				tone: 'danger',
				message: m.reports_new_download_failed()
			})
		);
	});
});
