import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { useCwToast } from '@cropwatchdevelopment/cwui';
import { ApiError } from '$lib/api/api-error';
import { m } from '$lib/paraglide/messages.js';
import { createMockServices, type MockServices } from '$lib/testing/mock-services';
import { deviceHref, openReport } from './overview-links';

type Toast = ReturnType<typeof useCwToast>;

let reports: MockServices['reports'];
let toast: { add: ReturnType<typeof vi.fn> };
let open: ReturnType<typeof vi.fn>;

beforeEach(() => {
	reports = createMockServices().reports;
	toast = { add: vi.fn() };
	open = vi.fn();
	vi.stubGlobal('window', { open });
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe('deviceHref', () => {
	it("links to the device page under the device's location", () => {
		expect(deviceHref('DEV-1', 8)).toBe('/locations/8/devices/DEV-1');
		expect(deviceHref('DEV-1', 0)).toBe('/locations/0/devices/DEV-1');
	});

	it('is null without a device or a location', () => {
		expect(deviceHref(undefined, 8)).toBeNull();
		expect(deviceHref('', 8)).toBeNull();
		expect(deviceHref('DEV-1', null)).toBeNull();
		expect(deviceHref('DEV-1', undefined)).toBeNull();
	});
});

describe('openReport', () => {
	it("opens the report's signed URL in a new tab", async () => {
		reports.getReportTemplateDownloadUrl.mockResolvedValue({ url: 'https://files.test/r.pdf' });

		await openReport(reports, 'DEV-1', '2026_10_04-2026_10_10.pdf', toast as unknown as Toast);

		expect(reports.getReportTemplateDownloadUrl).toHaveBeenCalledWith(
			'DEV-1',
			'2026_10_04-2026_10_10.pdf'
		);
		expect(open).toHaveBeenCalledWith('https://files.test/r.pdf', '_blank', 'noopener');
		expect(toast.add).not.toHaveBeenCalled();
	});

	it('says the link is unavailable when the API returns no URL', async () => {
		for (const response of [{ url: '' }, {}, { url: 42 }]) {
			reports.getReportTemplateDownloadUrl.mockResolvedValueOnce(response as { url: string });
			await openReport(reports, 'DEV-1', 'r.pdf', toast as unknown as Toast);
		}

		expect(open).not.toHaveBeenCalled();
		expect(toast.add.mock.calls).toEqual([
			[{ tone: 'danger', message: m.reports_new_download_missing_url() }],
			[{ tone: 'danger', message: m.reports_new_download_missing_url() }],
			[{ tone: 'danger', message: m.reports_new_download_missing_url() }]
		]);
	});

	it("shows the API's message when the download fails", async () => {
		reports.getReportTemplateDownloadUrl.mockRejectedValue(
			new ApiError(404, 'Not Found', { url: 'x', payload: { message: 'Report not found' } })
		);

		await openReport(reports, 'DEV-1', 'r.pdf', toast as unknown as Toast);

		expect(open).not.toHaveBeenCalled();
		expect(toast.add).toHaveBeenCalledWith({ tone: 'danger', message: 'Report not found' });
	});

	it('falls back to the download message for an API error without one, or a network failure', async () => {
		// Neither carries text for users: not the API error's own English text,
		// nor the browser's "Failed to fetch".
		reports.getReportTemplateDownloadUrl
			.mockRejectedValueOnce(
				new ApiError(500, 'Internal Server Error', { url: 'x', payload: null })
			)
			.mockRejectedValueOnce(new TypeError('Failed to fetch'));

		await openReport(reports, 'DEV-1', 'r.pdf', toast as unknown as Toast);
		await openReport(reports, 'DEV-1', 'r.pdf', toast as unknown as Toast);

		expect(toast.add.mock.calls).toEqual([
			[{ tone: 'danger', message: m.reports_new_download_failed() }],
			[{ tone: 'danger', message: m.reports_new_download_failed() }]
		]);
	});

	it('falls back to the generic download message for an error without one', async () => {
		reports.getReportTemplateDownloadUrl.mockRejectedValue({});

		await openReport(reports, 'DEV-1', 'r.pdf', toast as unknown as Toast);

		expect(toast.add).toHaveBeenCalledWith({
			tone: 'danger',
			message: m.reports_new_download_failed()
		});
	});
});
