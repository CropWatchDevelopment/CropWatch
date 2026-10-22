import { flushSync } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '$lib/api/api-error';
import type {
	RuleTemplateActionDto,
	RuleTemplateAssignmentDto,
	RuleTemplateCriterionDto,
	RuleTemplateDto
} from '$lib/api/api.dtos';
import { m } from '$lib/paraglide/messages.js';
import { labelFor } from '$lib/sensor-labels';
import { createMockServices, type MockServices } from '$lib/testing/mock-services';
import { renderWithServices } from '$lib/testing/render';
import RulesPage from './+page.svelte';

const nav = vi.hoisted(() => ({ goto: vi.fn(), url: new URL('http://localhost/rules') }));
vi.mock('$app/navigation', () => ({ goto: nav.goto }));
vi.mock('$app/state', () => ({
	page: {
		get url() {
			return nav.url;
		}
	}
}));

function assignment(overrides: Partial<RuleTemplateAssignmentDto> = {}): RuleTemplateAssignmentDto {
	return {
		id: 1,
		devEui: 'DEV-A',
		templateId: 1,
		isActive: true,
		createdAt: null,
		deviceName: 'Freezer A',
		locationName: 'North barn',
		permissionLevel: 1,
		state: null,
		...overrides
	};
}

function criterion(overrides: Partial<RuleTemplateCriterionDto> = {}): RuleTemplateCriterionDto {
	return {
		id: 1,
		templateId: 1,
		subject: 'temperature_c',
		operator: '>',
		triggerValue: 8,
		resetValue: 6,
		createdAt: null,
		...overrides
	};
}

function action(overrides: Partial<RuleTemplateActionDto> = {}): RuleTemplateActionDto {
	return {
		id: 1,
		templateId: 1,
		actionType: 2,
		actionTypeName: 'EMail',
		actionTypeValue: 'email',
		config: { recipient: 'ops@example.com' },
		createdAt: null,
		...overrides
	};
}

function template(overrides: Partial<RuleTemplateDto> = {}): RuleTemplateDto {
	return {
		id: 1,
		name: 'Cold room',
		description: null,
		deviceTypeId: null,
		isActive: true,
		createdAt: '2026-10-01T08:00:00.000Z',
		assignments: [assignment()],
		criteria: [criterion()],
		actions: [action()],
		...overrides
	};
}

let services: MockServices;
let view: ReturnType<typeof renderWithServices> | null = null;

function render() {
	view = renderWithServices(RulesPage, { services, app: { accessToken: 'jwt-token' } });
	return view;
}

const getTemplates = () => services.rules.getRuleTemplates;
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
	nav.url = new URL('http://localhost/rules');
});

afterEach(() => {
	view?.unmount();
	view = null;
	nav.goto.mockReset();
});

describe('rules page', () => {
	it('lists the rule templates the API returns', async () => {
		getTemplates().mockResolvedValue([template()]);
		render();

		await vi.waitFor(() => expect(rows()).toHaveLength(1));
		expect(getTemplates()).toHaveBeenCalledWith(
			{ search: undefined },
			{ signal: expect.any(AbortSignal) }
		);
		expect(cells(rows()[0])).toEqual([
			'Cold room',
			'Freezer A (DEV-A)',
			`${m.rule_subject_temperature()} > 8`,
			'EMail',
			new Date('2026-10-01T08:00:00.000Z').toLocaleString()
		]);
		expect(groupLabels()).toEqual(['North barn']);
		expect(document.title).toBe(m.rules_new_page_title());
	});

	it('summarises long lists and falls back for missing names and labels', async () => {
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
				criteria: [
					criterion({ subject: 'battery_level', operator: '<', triggerValue: 3 }),
					criterion({ id: 2, subject: 'humidity', operator: '>=', triggerValue: 90 }),
					criterion({ id: 3 }),
					criterion({ id: 4 })
				],
				actions: [
					action({ actionTypeName: null, actionTypeValue: 'sms' }),
					action({ id: 2, actionTypeName: null, actionTypeValue: null, actionType: 9 })
				]
			})
		]);
		render();

		await vi.waitFor(() => expect(rows()).toHaveLength(1));
		expect(cells(rows()[0])).toEqual([
			'Many devices',
			m.rules_new_summary_more({ summary: 'Freezer A (DEV-A), DEV-B', count: '1' }),
			m.rules_new_summary_more({
				summary: `${labelFor('battery_level').label()} < 3, ${m.rule_subject_humidity()} >= 90`,
				count: '2'
			}),
			'sms, 9',
			m.common_not_available()
		]);
		// The full conditions text is kept as the cell's tooltip.
		expect(rows()[0].querySelector('.rules-new-page__truncate')?.getAttribute('title')).toBe(
			cells(rows()[0])[2]
		);
	});

	it('shows placeholders for a template with nothing configured yet', async () => {
		getTemplates().mockResolvedValue([
			template({ name: 'Empty', assignments: [], criteria: [], actions: [] })
		]);
		render();

		await vi.waitFor(() => expect(rows()).toHaveLength(1));
		expect(cells(rows()[0]).slice(0, 4)).toEqual([
			'Empty',
			m.rules_new_no_assignments(),
			m.common_not_available(),
			m.common_not_available()
		]);
		expect(groupLabels()).toEqual([m.rules_new_unknown_location()]);
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
		expect(groupLabels()).toEqual(['North barn, South barn', m.rules_new_unknown_location()]);
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
				template({ id: index + 1, name: `Rule ${String(index + 1).padStart(2, '0')}` })
			)
		);
		render();

		await vi.waitFor(() => expect(rows()).toHaveLength(20));
		expect(cells(rows()[0])[0]).toBe('Rule 01');

		click(view!.target.querySelector(`button[aria-label="${m.cwui_table_next_page()}"]`));

		await vi.waitFor(() => expect(rows()).toHaveLength(5));
		expect(rows().map((row) => cells(row)[0])).toEqual([
			'Rule 21',
			'Rule 22',
			'Rule 23',
			'Rule 24',
			'Rule 25'
		]);
	});

	it("shows the API's error message when the templates cannot be loaded", async () => {
		getTemplates().mockRejectedValue({ message: 'Rules service unavailable' });
		render();

		await vi.waitFor(() =>
			expect(text()).toContain(m.cwui_table_error_prefix({ message: 'Rules service unavailable' }))
		);
	});

	it('falls back to the generic load error', async () => {
		getTemplates().mockRejectedValue({});
		render();

		await vi.waitFor(() =>
			expect(text()).toContain(m.cwui_table_error_prefix({ message: m.rules_new_load_failed() }))
		);
	});

	it.each([
		[
			"the API's message",
			new ApiError(503, 'Service Unavailable', {
				url: 'https://api.cropwatch.test/rules',
				payload: { message: 'Rules service unavailable' }
			}),
			'Rules service unavailable'
		],
		[
			'the generic load error for an API error without a message',
			new ApiError(500, 'Internal Server Error', {
				url: 'https://api.cropwatch.test/rules',
				payload: null
			}),
			undefined
		],
		['the generic load error for a network failure', new TypeError('Failed to fetch'), undefined]
	])('shows %s when the API refuses the list', async (_label, failure, message) => {
		getTemplates().mockRejectedValue(failure);
		render();

		await vi.waitFor(() =>
			expect(text()).toContain(
				m.cwui_table_error_prefix({ message: message ?? m.rules_new_load_failed() })
			)
		);
	});

	it('drops a deleted template from the list even if the API still returns it', async () => {
		getTemplates().mockResolvedValue([
			template({ id: 1, name: 'Cold room' }),
			template({ id: 2, name: 'Warm room' })
		]);
		services.rules.deleteRuleTemplate.mockResolvedValue({ id: 1 });
		render();
		await vi.waitFor(() => expect(rows()).toHaveLength(2));

		click(document.getElementById('rule-delete-1-open-button'));
		click(document.getElementById('rule-delete-1-delete-button'));

		await vi.waitFor(() => expect(rows().map((row) => cells(row)[0])).toEqual(['Warm room']));
		expect(services.rules.deleteRuleTemplate).toHaveBeenCalledWith(1);
		expect(getTemplates()).toHaveBeenCalledTimes(2);
		await vi.waitFor(() =>
			expect(view!.toasts().map((toast) => toast.message)).toContain(
				m.rules_new_deleted_success({ name: 'Cold room' })
			)
		);
	});

	it('opens a template for editing', async () => {
		getTemplates().mockResolvedValue([template({ id: 12 })]);
		render();
		await vi.waitFor(() => expect(rows()).toHaveLength(1));

		click(document.getElementById('rules-row-12-edit-button'));

		expect(nav.goto).toHaveBeenCalledWith('/rules/edit/12');
	});

	it('offers each row its history dialog', async () => {
		getTemplates().mockResolvedValue([template({ id: 12, name: 'Cold room' })]);
		services.rules.getRuleTemplateHistory.mockResolvedValue([]);
		render();
		await vi.waitFor(() => expect(rows()).toHaveLength(1));

		click(document.getElementById('rule-history-12-open-button'));

		expect(services.rules.getRuleTemplateHistory).toHaveBeenCalledWith(12);
	});

	it('creates a new template from the toolbar', async () => {
		getTemplates().mockResolvedValue([]);
		render();
		await vi.waitFor(() => expect(getTemplates()).toHaveBeenCalled());

		click(document.getElementById('rules-add-button'));

		expect(nav.goto).toHaveBeenCalledWith('/rules/create');
	});

	it('goes back to the dashboard, or to where the user came from', async () => {
		getTemplates().mockResolvedValue([]);
		render();

		click(document.getElementById('rules-back-button'));
		expect(nav.goto).toHaveBeenLastCalledWith('/');
		expect(text()).toContain(m.action_back_to_dashboard());

		nav.url = new URL('http://localhost/rules?backTo=/locations/3');
		click(document.getElementById('rules-back-button'));
		expect(nav.goto).toHaveBeenLastCalledWith('/locations/3');
	});
});
