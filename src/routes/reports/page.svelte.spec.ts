import { flushSync } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '$lib/api/api-error';
import type {
	BillingEntitlements,
	ReportTemplateAssignmentDto,
	ReportTemplateDto,
	ReportTemplateRecipientDto,
	ReportTemplateScheduleDto
} from '$lib/api/api.dtos';
import { m } from '$lib/paraglide/messages.js';
import { createMockServices, type MockServices } from '$lib/testing/mock-services';
import { renderWithServices } from '$lib/testing/render';
import ReportsPage from './+page.svelte';

const nav = vi.hoisted(() => ({ goto: vi.fn(), url: new URL('http://localhost/reports') }));
vi.mock('$app/navigation', () => ({ goto: nav.goto }));
vi.mock('$app/state', () => ({
	page: {
		get url() {
			return nav.url;
		}
	}
}));

function assignment(
	overrides: Partial<ReportTemplateAssignmentDto> = {}
): ReportTemplateAssignmentDto {
	return {
		id: 1,
		devEui: 'DEV-A',
		templateId: 1,
		isActive: true,
		createdAt: null,
		deviceName: 'Freezer A',
		locationName: 'North barn',
		permissionLevel: 1,
		...overrides
	};
}

function recipient(
	overrides: Partial<ReportTemplateRecipientDto> = {}
): ReportTemplateRecipientDto {
	return {
		id: 1,
		templateId: 1,
		communicationMethod: 1,
		email: 'ops@example.com',
		name: 'Ops',
		createdAt: null,
		...overrides
	};
}

function schedule(overrides: Partial<ReportTemplateScheduleDto> = {}): ReportTemplateScheduleDto {
	return {
		id: 1,
		templateId: 1,
		endOfDay: false,
		endOfWeek: true,
		endOfMonth: false,
		utcOffset: 0,
		isActive: true,
		createdAt: null,
		...overrides
	};
}

function template(overrides: Partial<ReportTemplateDto> = {}): ReportTemplateDto {
	return {
		id: 1,
		name: 'Weekly cold room',
		description: null,
		deviceTypeId: null,
		dataPullInterval: 30,
		isActive: true,
		createdAt: '2026-10-01T08:00:00.000Z',
		assignments: [assignment()],
		schedule: [schedule()],
		recipients: [recipient()],
		alertPoints: [],
		dataProcessingSchedules: [],
		...overrides
	};
}

let services: MockServices;
let view: ReturnType<typeof renderWithServices> | null = null;

function render(entitlements: BillingEntitlements | null = null) {
	view = renderWithServices(ReportsPage, {
		props: { data: { entitlements } } as never,
		services,
		app: { accessToken: 'jwt-token' }
	});
	return view;
}

const getTemplates = () => services.reports.getReportTemplates;
const text = () => view?.target.textContent ?? '';
const rows = () => [...view!.target.querySelectorAll<HTMLTableRowElement>('tr.cw-data-table__row')];
/** The visible cell texts of a row (without the row-actions cell). */
const cells = (row: HTMLTableRowElement) =>
	[...row.querySelectorAll('td:not(.cw-data-table__td--actions)')].map((td) =>
		td.textContent?.trim()
	);
const groupLabels = () =>
	[...view!.target.querySelectorAll('.cw-data-table__group-label')].map((label) =>
		label.textContent?.trim()
	);

function click(element: Element | null | undefined) {
	(element as HTMLElement).click();
	flushSync();
}

beforeEach(() => {
	services = createMockServices();
	nav.url = new URL('http://localhost/reports');
});

afterEach(() => {
	view?.unmount();
	view = null;
	nav.goto.mockReset();
});

describe('reports page', () => {
	it('lists the report templates the API returns', async () => {
		getTemplates().mockResolvedValue([template()]);
		render();

		await vi.waitFor(() => expect(rows()).toHaveLength(1));
		expect(getTemplates()).toHaveBeenCalledWith(
			{ search: undefined },
			{ signal: expect.any(AbortSignal) }
		);
		expect(cells(rows()[0])).toEqual([
			'Weekly cold room',
			m.reports_new_active(),
			'Freezer A (DEV-A)',
			'North barn',
			'ops@example.com',
			m.reports_new_cadence_weekly(),
			new Date('2026-10-01T08:00:00.000Z').toLocaleString()
		]);
		expect(groupLabels()).toEqual(['North barn']);
		expect(rows()[0].querySelector('.cw-chip--success')?.textContent?.trim()).toBe(
			m.reports_new_active()
		);
		expect(document.title).toBe(m.reports_new_page_title());
		expect(text()).toContain(m.reports_new_configured_templates());
	});

	it('shows an inactive template with a warning chip', async () => {
		getTemplates().mockResolvedValue([template({ isActive: false })]);
		render();

		await vi.waitFor(() => expect(rows()).toHaveLength(1));
		expect(cells(rows()[0])[1]).toBe(m.reports_new_inactive());
		expect(rows()[0].querySelector('.cw-chip--warning')?.textContent?.trim()).toBe(
			m.reports_new_inactive()
		);
	});

	it('summarises long lists and falls back for missing names', async () => {
		getTemplates().mockResolvedValue([
			template({
				id: 2,
				name: 'Many devices',
				createdAt: null,
				assignments: [
					assignment({ devEui: 'DEV-A', deviceName: 'Freezer A' }),
					assignment({ id: 2, devEui: 'DEV-B', deviceName: null }),
					assignment({ id: 3, devEui: 'DEV-C', deviceName: 'Cooler C' })
				],
				recipients: [
					recipient({ email: null, name: 'Night shift' }),
					recipient({ id: 2, email: null, name: null, communicationMethod: 2 }),
					recipient({ id: 3, email: 'a@example.com' }),
					recipient({ id: 4, email: 'b@example.com' })
				],
				schedule: [
					schedule({ endOfDay: true, endOfWeek: true, endOfMonth: true }),
					// Repeated and inactive cadences are not listed twice.
					schedule({ id: 2, endOfDay: true, endOfWeek: false }),
					schedule({ id: 3, endOfMonth: true, isActive: false })
				]
			})
		]);
		render();

		await vi.waitFor(() => expect(rows()).toHaveLength(1));
		expect(cells(rows()[0]).slice(2)).toEqual([
			m.reports_new_summary_more({ summary: 'Freezer A (DEV-A), DEV-B', count: '1' }),
			'North barn',
			m.reports_new_summary_more({ summary: 'Night shift, 2', count: '2' }),
			[
				m.reports_new_cadence_daily(),
				m.reports_new_cadence_weekly(),
				m.reports_new_cadence_monthly()
			].join(', '),
			m.common_not_available()
		]);
	});

	it('lists two items in full', async () => {
		getTemplates().mockResolvedValue([
			template({
				assignments: [assignment(), assignment({ id: 2, devEui: 'DEV-B', deviceName: 'Cooler B' })],
				recipients: [recipient(), recipient({ id: 2, email: 'night@example.com' })]
			})
		]);
		render();

		await vi.waitFor(() => expect(rows()).toHaveLength(1));
		expect(cells(rows()[0])[2]).toBe('Freezer A (DEV-A), Cooler B (DEV-B)');
		expect(cells(rows()[0])[4]).toBe('ops@example.com, night@example.com');
	});

	it('shows placeholders for a template with nothing configured yet', async () => {
		getTemplates().mockResolvedValue([
			template({
				name: 'Empty',
				assignments: [],
				recipients: [],
				schedule: [schedule({ isActive: false })]
			})
		]);
		render();

		await vi.waitFor(() => expect(rows()).toHaveLength(1));
		expect(cells(rows()[0]).slice(2, 6)).toEqual([
			m.reports_new_no_assignments(),
			m.reports_unknown_location(),
			m.common_not_available(),
			m.common_not_available()
		]);
		expect(groupLabels()).toEqual([m.reports_unknown_location()]);
	});

	it('groups each template under the locations of its devices', async () => {
		getTemplates().mockResolvedValue([
			template({
				id: 1,
				name: 'Two places',
				assignments: [
					assignment({ locationName: 'North barn' }),
					assignment({ id: 2, devEui: 'DEV-B', locationName: 'South barn' }),
					assignment({ id: 3, devEui: 'DEV-C', locationName: 'North barn' }),
					assignment({ id: 4, devEui: 'DEV-D', locationName: '  ' })
				]
			}),
			template({ id: 2, name: 'Barn only', assignments: [assignment({ locationName: null })] })
		]);
		render();

		await vi.waitFor(() => expect(rows()).toHaveLength(2));
		expect(groupLabels()).toEqual(['North barn, South barn', m.reports_unknown_location()]);
	});

	it('searches through the API, sending the trimmed search text', async () => {
		getTemplates().mockResolvedValue([template()]);
		render();
		await vi.waitFor(() => expect(rows()).toHaveLength(1));

		const search = view!.target.querySelector<HTMLInputElement>(
			'.cw-data-table__search-wrapper input'
		)!;
		search.value = '  cold ';
		search.dispatchEvent(new Event('input', { bubbles: true }));

		await vi.waitFor(() =>
			expect(getTemplates()).toHaveBeenLastCalledWith(
				{ search: 'cold' },
				{ signal: expect.any(AbortSignal) }
			)
		);

		search.value = '   ';
		search.dispatchEvent(new Event('input', { bubbles: true }));

		await vi.waitFor(() => expect(getTemplates()).toHaveBeenCalledTimes(3));
		expect(getTemplates()).toHaveBeenLastCalledWith(
			{ search: undefined },
			{ signal: expect.any(AbortSignal) }
		);
	});

	it('sorts by a column', async () => {
		getTemplates().mockResolvedValue([
			template({ id: 1, name: 'Beta' }),
			template({ id: 2, name: 'Alpha' }),
			template({ id: 3, name: 'Gamma' })
		]);
		render();
		await vi.waitFor(() => expect(rows()).toHaveLength(3));
		const sortByName = () =>
			click(
				[...view!.target.querySelectorAll('button.cw-data-table__sort-btn')].find((button) =>
					button.textContent?.includes(m.common_name())
				)
			);

		sortByName();
		await vi.waitFor(() =>
			expect(rows().map((row) => cells(row)[0])).toEqual(['Alpha', 'Beta', 'Gamma'])
		);

		sortByName();
		await vi.waitFor(() =>
			expect(rows().map((row) => cells(row)[0])).toEqual(['Gamma', 'Beta', 'Alpha'])
		);
	});

	it('pages through the templates', async () => {
		getTemplates().mockResolvedValue(
			Array.from({ length: 25 }, (_, index) =>
				template({ id: index + 1, name: `Report ${String(index + 1).padStart(2, '0')}` })
			)
		);
		render();

		await vi.waitFor(() => expect(rows()).toHaveLength(20));
		expect(cells(rows()[0])[0]).toBe('Report 01');

		click(view!.target.querySelector(`button[aria-label="${m.cwui_table_next_page()}"]`));

		await vi.waitFor(() => expect(rows()).toHaveLength(5));
		expect(rows().map((row) => cells(row)[0])).toEqual([
			'Report 21',
			'Report 22',
			'Report 23',
			'Report 24',
			'Report 25'
		]);
	});

	it("shows the API's error message when the templates cannot be loaded", async () => {
		getTemplates().mockRejectedValue({ message: 'Reports service unavailable' });
		render();

		await vi.waitFor(() =>
			expect(text()).toContain(
				m.cwui_table_error_prefix({ message: 'Reports service unavailable' })
			)
		);
	});

	it('falls back to the generic load error', async () => {
		getTemplates().mockRejectedValue({});
		render();

		await vi.waitFor(() =>
			expect(text()).toContain(m.cwui_table_error_prefix({ message: m.reports_new_load_failed() }))
		);
	});

	it.each([
		[
			'an API error without a message',
			new ApiError(500, 'Internal Server Error', {
				url: 'https://api.cropwatch.test/reports',
				payload: null
			})
		],
		['a network failure', new TypeError('Failed to fetch')]
	])('shows the generic load error for %s', async (_label, failure) => {
		getTemplates().mockRejectedValue(failure);
		render();

		await vi.waitFor(() =>
			expect(text()).toContain(m.cwui_table_error_prefix({ message: m.reports_new_load_failed() }))
		);
	});

	it('drops a deleted template from the list even if the API still returns it', async () => {
		getTemplates().mockResolvedValue([
			template({ id: 1, name: 'Weekly cold room' }),
			template({ id: 2, name: 'Monthly warm room' })
		]);
		services.reports.deleteReportTemplate.mockResolvedValue({ id: 1 });
		render();
		await vi.waitFor(() => expect(rows()).toHaveLength(2));

		click(document.getElementById('report-delete-1-open-button'));
		click(document.getElementById('report-delete-1-delete-button'));

		await vi.waitFor(() =>
			expect(rows().map((row) => cells(row)[0])).toEqual(['Monthly warm room'])
		);
		expect(services.reports.deleteReportTemplate).toHaveBeenCalledWith(1);
		expect(getTemplates()).toHaveBeenCalledTimes(2);
		await vi.waitFor(() =>
			expect(view!.toasts().map((toast) => toast.message)).toContain(
				m.reports_new_deleted_success({ name: 'Weekly cold room' })
			)
		);
	});

	it('opens a template for editing', async () => {
		getTemplates().mockResolvedValue([template({ id: 12 })]);
		render();
		await vi.waitFor(() => expect(rows()).toHaveLength(1));

		click(document.getElementById('reports-row-12-edit-button'));

		expect(nav.goto).toHaveBeenCalledWith('/reports/edit/12');
	});

	it('offers each row its history dialog', async () => {
		getTemplates().mockResolvedValue([template({ id: 12 })]);
		services.reports.getReportTemplateHistory.mockResolvedValue([]);
		services.reports.getReportRegenerations.mockResolvedValue([]);
		render();
		await vi.waitFor(() => expect(rows()).toHaveLength(1));

		click(document.getElementById('report-history-12-open-button'));

		expect(services.reports.getReportTemplateHistory).toHaveBeenCalledWith(12);
	});

	it('creates a new template from the toolbar', async () => {
		getTemplates().mockResolvedValue([]);
		render();
		await vi.waitFor(() => expect(getTemplates()).toHaveBeenCalled());

		click(document.getElementById('reports-add-button'));

		expect(nav.goto).toHaveBeenCalledWith('/reports/create');
	});

	it('goes back to the dashboard, or to where the user came from', async () => {
		getTemplates().mockResolvedValue([]);
		render();

		click(document.getElementById('reports-back-button'));
		expect(nav.goto).toHaveBeenLastCalledWith('/');
		expect(text()).toContain(m.action_back_to_dashboard());

		nav.url = new URL('http://localhost/reports?backTo=/locations/3');
		click(document.getElementById('reports-back-button'));
		expect(nav.goto).toHaveBeenLastCalledWith('/locations/3');
	});

	it('offers the reporting subscription to a user without it', async () => {
		getTemplates().mockResolvedValue([]);
		render({ billingMode: 'stripe', isStaff: false, seats: 1, reporting: false });

		expect(text()).toContain(m.reports_upsell_title());
		expect(document.getElementById('reports-upsell-subscribe-button')).not.toBeNull();
	});

	it('has no upsell without entitlements', async () => {
		getTemplates().mockResolvedValue([]);
		render(null);

		expect(text()).not.toContain(m.reports_upsell_title());
		await vi.waitFor(() => expect(getTemplates()).toHaveBeenCalled());
	});
});
