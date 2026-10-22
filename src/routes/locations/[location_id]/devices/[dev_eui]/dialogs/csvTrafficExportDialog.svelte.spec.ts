import { flushSync } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TrafficMonthlyReportDto } from '$lib/api/api.dtos';
import { m } from '$lib/paraglide/messages.js';
import { createMockServices, type MockServices } from '$lib/testing/mock-services';
import { renderWithServices } from '$lib/testing/render';
import CsvTrafficExportDialog from './csvTrafficExportDialog.svelte';

const TIME_ZONE = 'Asia/Tokyo';

let services: MockServices;
let view: ReturnType<typeof renderWithServices> | null = null;
let downloads: Array<{ fileName: string; csv: Promise<string> }> = [];

function render(
	props: Partial<{ devEui: string; disabled: boolean }> = {},
	accessToken: string | null = 'jwt-token'
) {
	view = renderWithServices(CsvTrafficExportDialog, {
		props: { devEui: 'TRAFFIC-1', locationName: 'Main gate', timeZone: TIME_ZONE, ...props },
		services,
		app: { accessToken: accessToken ?? undefined }
	});
	return view;
}

const byId = (id: string) => document.getElementById(id) as HTMLButtonElement | null;
const input = (id: string) => document.getElementById(id) as HTMLInputElement;
const dialogOpen = () =>
	(document.querySelector('dialog') as HTMLDialogElement | null)?.open ?? false;
const text = () => document.body.textContent ?? '';
const getReport = () => services.telemetry.getTrafficMonthlyReport;

function type(id: string, value: string) {
	input(id).value = value;
	input(id).dispatchEvent(new Event('input', { bubbles: true }));
	flushSync();
}

function open() {
	byId('device-csv-traffic-export-open-button')?.click();
	flushSync();
}

function download() {
	byId('device-csv-traffic-export-download-button')?.click();
	flushSync();
}

const day = (traffic_day: string, people: number): TrafficMonthlyReportDto =>
	({
		traffic_day,
		total_people: people,
		total_bicycles: 2,
		total_vehicles: 3,
		extra: 'not exported'
	}) as unknown as TrafficMonthlyReportDto;

beforeEach(() => {
	vi.useFakeTimers({ toFake: ['Date'] });
	vi.setSystemTime(new Date(2026, 9, 21, 12, 0));
	services = createMockServices();
	downloads = [];
	let blob: Blob | null = null;
	vi.spyOn(URL, 'createObjectURL').mockImplementation((value) => {
		blob = value as Blob;
		return 'blob:traffic-export';
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

describe('traffic CSV export dialog', () => {
	it("downloads this month's daily totals by default", async () => {
		getReport().mockResolvedValue([day('2026-10-01', 10), day('2026-10-02', 12)]);
		render();
		open();

		expect(dialogOpen()).toBe(true);
		expect(text()).toContain(m.devices_export_traffic_dialog_title());
		expect(input('device-csv-traffic-export-year-input').value).toBe('2026');
		expect(input('device-csv-traffic-export-month-input').value).toBe('10');
		// No month after the current one can be picked this year.
		expect(input('device-csv-traffic-export-month-input').getAttribute('aria-valuemax')).toBe('10');
		download();

		await vi.waitFor(() => expect(downloads).toHaveLength(1));
		expect(getReport()).toHaveBeenCalledWith('TRAFFIC-1', {
			year: 2026,
			month: 10,
			timezone: TIME_ZONE
		});
		expect(downloads[0].fileName).toBe('Main_gate-TRAFFIC-1-2026-10-data.csv');
		expect((await downloads[0].csv).split('\n')).toEqual([
			'traffic_day,total_people,total_bicycles,total_vehicles',
			'2026-10-01,10,2,3',
			'2026-10-02,12,2,3'
		]);
		expect(view?.toasts().at(-1)).toMatchObject({
			tone: 'success',
			message: m.devices_export_success({ count: '2' })
		});
		await vi.waitFor(() => expect(dialogOpen()).toBe(false));
	});

	it('exports the month that was typed in', async () => {
		getReport().mockResolvedValue([day('2025-03-01', 1)]);
		render();
		open();

		type('device-csv-traffic-export-year-input', '2025');
		type('device-csv-traffic-export-month-input', '3');
		expect(input('device-csv-traffic-export-month-input').getAttribute('aria-valuemax')).toBe('12');
		download();

		await vi.waitFor(() => expect(downloads).toHaveLength(1));
		expect(getReport()).toHaveBeenCalledWith('TRAFFIC-1', {
			year: 2025,
			month: 3,
			timezone: TIME_ZONE
		});
		expect(downloads[0].fileName).toBe('Main_gate-TRAFFIC-1-2025-03-data.csv');
	});

	it('rejects a month or year that is not valid, without asking the API', () => {
		render();
		open();

		for (const [year, month] of [
			['2026', '13'],
			['2026', '0'],
			['', '5']
		]) {
			type('device-csv-traffic-export-year-input', year);
			type('device-csv-traffic-export-month-input', month);
			download();
			expect(text()).toContain(m.devices_export_traffic_invalid_input());
		}
		expect(getReport()).not.toHaveBeenCalled();
		expect(view?.toasts()).toHaveLength(0);
	});

	it('says so when the month has no data', async () => {
		getReport()
			.mockResolvedValueOnce([])
			.mockResolvedValueOnce(null as never);
		render();
		open();

		download();
		await vi.waitFor(() => expect(text()).toContain(m.devices_export_no_data()));
		download();
		await vi.waitFor(() => expect(view?.toasts()).toHaveLength(2));

		expect(view?.toasts().map((toast) => toast.tone)).toEqual(['info', 'info']);
		expect(downloads).toHaveLength(0);
		expect(dialogOpen()).toBe(true);
	});

	it('reports a failed export', async () => {
		getReport().mockRejectedValue(new Error('down'));
		render();
		open();

		download();

		await vi.waitFor(() => expect(text()).toContain(m.devices_export_failed()));
		expect(view?.toasts().at(-1)).toMatchObject({
			tone: 'danger',
			message: m.devices_export_failed()
		});
		expect(console.error).toHaveBeenCalledWith(
			'Failed to export traffic monthly report as CSV:',
			new Error('down')
		);
	});

	it('cannot be closed or started again while an export is running', async () => {
		let release!: (value: TrafficMonthlyReportDto[]) => void;
		getReport().mockReturnValue(new Promise((resolve) => (release = resolve)));
		render();
		open();

		download();
		await vi.waitFor(() =>
			expect(byId('device-csv-traffic-export-cancel-button')?.disabled).toBe(true)
		);
		download();
		document.querySelector('dialog')?.dispatchEvent(new Event('cancel'));
		flushSync();
		expect(dialogOpen()).toBe(true);
		expect(getReport()).toHaveBeenCalledTimes(1);

		release([]);
		await vi.waitFor(() =>
			expect(byId('device-csv-traffic-export-cancel-button')?.disabled).toBe(false)
		);
		byId('device-csv-traffic-export-cancel-button')?.click();
		flushSync();
		expect(dialogOpen()).toBe(false);

		// Reopening clears the last message.
		open();
		expect(text()).not.toContain(m.devices_export_no_data());
	});

	it('hides its own close button while an export runs', async () => {
		const closeButton = () => document.querySelector<HTMLButtonElement>('dialog .cw-dialog__close');
		let release!: (value: TrafficMonthlyReportDto[]) => void;
		getReport().mockReturnValue(new Promise((resolve) => (release = resolve)));
		render();
		open();
		expect(closeButton()).not.toBeNull();

		download();
		await vi.waitFor(() =>
			expect(byId('device-csv-traffic-export-cancel-button')?.disabled).toBe(true)
		);
		expect(closeButton()).toBeNull();
		expect(dialogOpen()).toBe(true);

		// Back once the export is over (here: the month had no data).
		release([]);
		await vi.waitFor(() => expect(closeButton()).not.toBeNull());
		closeButton()!.click();
		flushSync();
		expect(dialogOpen()).toBe(false);
		expect(downloads).toHaveLength(0);
	});

	it('exports nothing once the session has ended', () => {
		const { app } = render();
		open();

		app.accessToken = undefined;
		flushSync();
		download();

		expect(getReport()).not.toHaveBeenCalled();
		expect(byId('device-csv-traffic-export-open-button')?.disabled).toBe(true);
	});

	it('is disabled without a session or a device, or when told to', () => {
		for (const [props, token] of [
			[{}, null],
			[{ devEui: '' }, 'jwt-token'],
			[{ disabled: true }, 'jwt-token']
		] as const) {
			render(props, token);
			expect(byId('device-csv-traffic-export-open-button')?.disabled).toBe(true);
			view?.unmount();
		}
		view = null;

		render();
		expect(byId('device-csv-traffic-export-open-button')?.disabled).toBe(false);
	});
});
