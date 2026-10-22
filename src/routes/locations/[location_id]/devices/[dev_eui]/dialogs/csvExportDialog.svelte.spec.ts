import { flushSync } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { m } from '$lib/paraglide/messages.js';
import { createMockServices, type MockServices } from '$lib/testing/mock-services';
import { renderWithServices } from '$lib/testing/render';
import { downloadCsv, formatCsvRangeLabel, resolveCsvRequestRange } from '../csvExport';
import CsvExportDialog from './csvExportDialog.svelte';

/** Today 15:42 local time: the dialog's initial range is today 00:00 → now. */
const NOW = new Date(2026, 9, 21, 15, 42, 10);
const TIME_ZONE = 'Asia/Tokyo';

let services: MockServices;
let view: ReturnType<typeof renderWithServices> | null = null;
let downloads: Array<{ fileName: string; csv: Promise<string> }> = [];

function render(
	props: Partial<{ devEui: string; disabled: boolean }> = {},
	accessToken: string | null = 'jwt-token'
) {
	view = renderWithServices(CsvExportDialog, {
		props: { devEui: 'DEV-1', locationName: 'North field', timeZone: TIME_ZONE, ...props },
		services,
		app: { accessToken: accessToken ?? undefined }
	});
	return view;
}

const byId = (id: string) => document.getElementById(id) as HTMLButtonElement | null;
const dialogOpen = () =>
	(document.querySelector('dialog') as HTMLDialogElement | null)?.open ?? false;
const text = () => document.body.textContent ?? '';
const getRange = () => services.telemetry.getDeviceDataWithinRange;

function openAndDownload() {
	byId('device-csv-export-open-button')?.click();
	flushSync();
	byId('device-csv-export-download-button')?.click();
	flushSync();
}

const rows = (count: number, from = 0) =>
	Array.from({ length: count }, (_, index) => ({
		id: from + index,
		created_at: new Date(Date.UTC(2026, 9, 21, 0, 0, from + index)).toISOString(),
		temperature_c: 20,
		note: 'not exported'
	}));

beforeEach(() => {
	vi.useFakeTimers({ toFake: ['Date'] });
	vi.setSystemTime(NOW);
	services = createMockServices();
	downloads = [];
	let blob: Blob | null = null;
	vi.spyOn(URL, 'createObjectURL').mockImplementation((value) => {
		blob = value as Blob;
		return 'blob:csv-export';
	});
	vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
	vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
		this: HTMLAnchorElement
	) {
		downloads.push({ fileName: this.download, csv: blob!.text() });
	});
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
	view?.unmount();
	view = null;
	document.body.innerHTML = '';
	vi.useRealTimers();
	vi.restoreAllMocks();
});

describe('CSV export dialog', () => {
	it('opens with the export time zone explained', () => {
		render();
		expect(dialogOpen()).toBe(false);

		byId('device-csv-export-open-button')?.click();
		flushSync();

		expect(dialogOpen()).toBe(true);
		expect(text()).toContain(m.devices_export_dialog_title());
		expect(text()).toContain(m.devices_export_timezone_hint({ timeZone: TIME_ZONE }));
	});

	it("downloads every page of today's readings as one CSV file", async () => {
		getRange()
			.mockResolvedValueOnce({ data: rows(1000), total: 1500 })
			.mockResolvedValueOnce({ data: rows(500, 1000), total: 1500 });
		render();

		openAndDownload();

		await vi.waitFor(() => expect(downloads).toHaveLength(1));
		const requestRange = resolveCsvRequestRange(
			{
				start: new Date(2026, 9, 21),
				end: NOW,
				startTime: { hours: 0, minutes: 0 },
				endTime: { hours: 15, minutes: 42 }
			},
			TIME_ZONE
		);
		expect(getRange().mock.calls).toEqual([
			['DEV-1', { ...requestRange, skip: 0, take: 1000, timezone: TIME_ZONE }],
			['DEV-1', { ...requestRange, skip: 1000, take: 1000, timezone: TIME_ZONE }]
		]);
		expect(downloads[0].fileName).toBe(
			`North_field-DEV-1-${formatCsvRangeLabel(requestRange, TIME_ZONE)}-data.csv`
		);
		const lines = (await downloads[0].csv).split('\n');
		expect(lines).toHaveLength(1501);
		// Only the exported columns, timestamps in the export zone.
		expect(lines[0]).toBe('created_at,temperature_c');
		expect(lines[1]).toBe('2026-10-21T09:00:00.000+09:00,20');
		expect(view?.toasts().at(-1)).toMatchObject({
			tone: 'success',
			message: m.devices_export_success({ count: '1500' })
		});
		await vi.waitFor(() => expect(dialogOpen()).toBe(false));
	});

	it('exports the days picked in the calendar, as whole days in the export zone', async () => {
		getRange().mockResolvedValue(rows(1));
		render();
		byId('device-csv-export-open-button')?.click();
		flushSync();

		document
			.querySelector<HTMLButtonElement>('.csv-export-dialog .cw-date-picker__trigger')
			?.click();
		flushSync();
		const day = (date: Date) =>
			document.querySelector<HTMLButtonElement>(`[data-day-time="${date.getTime()}"]`);
		day(new Date(2026, 9, 5))?.click();
		flushSync();
		day(new Date(2026, 9, 7))?.click();
		flushSync();
		byId('device-csv-export-download-button')?.click();

		await vi.waitFor(() => expect(downloads).toHaveLength(1));
		expect(getRange()).toHaveBeenCalledWith('DEV-1', {
			start: '2026-10-04T15:00:00.000Z',
			end: '2026-10-07T14:59:59.999Z',
			skip: 0,
			take: 1000,
			timezone: TIME_ZONE
		});
	});

	it('stops paging at a short page, or once the reported total is reached', async () => {
		// Shapes the dialog accepts besides the typed `{ data, total }` page.
		getRange()
			.mockResolvedValueOnce({ result: { data: rows(1000), total: 1000 } } as never)
			.mockResolvedValueOnce({ count: 1000, data: rows(1000) } as never)
			.mockResolvedValueOnce(rows(3));
		render();

		openAndDownload();
		await vi.waitFor(() => expect(downloads).toHaveLength(1));
		openAndDownload();
		await vi.waitFor(() => expect(downloads).toHaveLength(2));
		openAndDownload();
		await vi.waitFor(() => expect(downloads).toHaveLength(3));

		expect(getRange()).toHaveBeenCalledTimes(3);
		expect((await downloads[2].csv).split('\n')).toHaveLength(4);
	});

	it('says so when the range has no data', async () => {
		getRange()
			.mockResolvedValueOnce({ data: [] } as never)
			.mockResolvedValueOnce(null as never);
		render();

		openAndDownload();

		await vi.waitFor(() => expect(text()).toContain(m.devices_export_no_data()));
		expect(view?.toasts().at(-1)).toMatchObject({
			tone: 'info',
			message: m.devices_export_no_data()
		});
		// An answer that is not a page of rows counts as no data too.
		byId('device-csv-export-download-button')?.click();
		await vi.waitFor(() => expect(view?.toasts()).toHaveLength(2));
		expect(view?.toasts().at(-1)?.tone).toBe('info');
		expect(downloads).toHaveLength(0);
		expect(dialogOpen()).toBe(true);

		// Reopening clears the message.
		byId('device-csv-export-cancel-button')?.click();
		flushSync();
		byId('device-csv-export-open-button')?.click();
		flushSync();
		expect(text()).not.toContain(m.devices_export_no_data());
	});

	it('reports a failed export, including one that exceeds the paging limit', async () => {
		getRange().mockRejectedValueOnce(new Error('down'));
		render();

		openAndDownload();
		await vi.waitFor(() => expect(text()).toContain(m.devices_export_failed()));
		expect(view?.toasts().at(-1)).toMatchObject({
			tone: 'danger',
			message: m.devices_export_failed()
		});

		const fullPage = rows(1000);
		getRange().mockResolvedValue(fullPage);
		byId('device-csv-export-download-button')?.click();
		await vi.waitFor(() => expect(getRange()).toHaveBeenCalledTimes(101));
		await vi.waitFor(() => expect(view?.toasts()).toHaveLength(2));
		expect(console.error).toHaveBeenLastCalledWith(
			'Failed to export device telemetry as CSV:',
			new Error('CSV export exceeded the client paging limit.')
		);
		expect(downloads).toHaveLength(0);
	});

	it('cannot be closed or started again while an export is running', async () => {
		let release!: (value: unknown) => void;
		getRange().mockReturnValue(new Promise((resolve) => (release = resolve)) as never);
		render();

		openAndDownload();
		await vi.waitFor(() => expect(byId('device-csv-export-cancel-button')?.disabled).toBe(true));
		byId('device-csv-export-download-button')?.click();
		document.querySelector('dialog')?.dispatchEvent(new Event('cancel'));
		flushSync();
		expect(dialogOpen()).toBe(true);
		expect(getRange()).toHaveBeenCalledTimes(1);

		release([]);
		await vi.waitFor(() => expect(byId('device-csv-export-cancel-button')?.disabled).toBe(false));
		byId('device-csv-export-cancel-button')?.click();
		flushSync();
		expect(dialogOpen()).toBe(false);
	});

	it('hides its own close button while an export runs', async () => {
		const closeButton = () => document.querySelector<HTMLButtonElement>('dialog .cw-dialog__close');
		let release!: (value: unknown) => void;
		getRange().mockReturnValue(new Promise((resolve) => (release = resolve)) as never);
		render();
		byId('device-csv-export-open-button')?.click();
		flushSync();
		expect(closeButton()).not.toBeNull();

		byId('device-csv-export-download-button')?.click();
		await vi.waitFor(() => expect(byId('device-csv-export-cancel-button')?.disabled).toBe(true));
		expect(closeButton()).toBeNull();
		expect(dialogOpen()).toBe(true);

		// Back once the export is over (here: the range had no data).
		release([]);
		await vi.waitFor(() => expect(closeButton()).not.toBeNull());
		closeButton()!.click();
		flushSync();
		expect(dialogOpen()).toBe(false);
		expect(downloads).toHaveLength(0);
	});

	it('exports nothing once the session has ended', () => {
		const { app } = render();
		byId('device-csv-export-open-button')?.click();
		flushSync();

		app.accessToken = undefined;
		flushSync();
		byId('device-csv-export-download-button')?.click();
		flushSync();

		expect(getRange()).not.toHaveBeenCalled();
		expect(byId('device-csv-export-open-button')?.disabled).toBe(true);
	});

	it('is disabled without a session or a device, or when told to', () => {
		for (const [props, token] of [
			[{}, null],
			[{ devEui: '' }, 'jwt-token'],
			[{ disabled: true }, 'jwt-token']
		] as const) {
			render(props, token);
			expect(byId('device-csv-export-open-button')?.disabled).toBe(true);
			view?.unmount();
		}
		view = null;

		render();
		expect(byId('device-csv-export-open-button')?.disabled).toBe(false);
	});
});

describe('downloadCsv', () => {
	it('quotes values with commas, quotes or line breaks, and writes dates and objects', async () => {
		downloadCsv(
			[
				{
					created_at: new Date('2026-10-21T00:00:00.000Z'),
					traffic_day: 'Mon, "busy"\nday',
					total_people: { adults: 2 },
					co2: null,
					humidity: 55.5,
					temperature_c: true
				},
				{ created_at: '2026-10-21 01:00:00', moisture: 30 }
			],
			{ locationName: ' ', devEui: 'DEV/1', rangeLabel: 'today', timeZone: TIME_ZONE }
		);

		expect(downloads[0].fileName).toBe('device-DEV_1-today-data.csv');
		expect((await downloads[0].csv).split('\n')).toEqual([
			'created_at,co2,humidity,temperature_c,moisture,traffic_day,total_people',
			'2026-10-21T09:00:00.000+09:00,,55.5,true,,"Mon, ""busy""',
			'day","{""adults"":2}"',
			'2026-10-21T10:00:00.000+09:00,,,,30,,'
		]);
		expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:csv-export');
		expect(document.querySelector('a[download]')).toBeNull();
	});

	it('writes dates and timestamps as given without a time zone, and nothing for no rows', async () => {
		downloadCsv([{ created_at: new Date('2026-10-21T00:00:00.000Z'), traffic_day: '2026-10-21' }], {
			locationName: 'Barn',
			devEui: 'DEV-1',
			rangeLabel: 'x'
		});
		downloadCsv([], { locationName: 'Barn', devEui: 'DEV-1', rangeLabel: 'x' });

		expect(downloads).toHaveLength(1);
		expect((await downloads[0].csv).split('\n')).toEqual([
			'created_at,traffic_day',
			'2026-10-21T00:00:00.000Z,2026-10-21'
		]);
	});
});
