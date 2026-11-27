import { flushSync } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '#lib/api/api-error.ts';
import type {
	RuleTemplateActionDto,
	RuleTemplateAssignmentDto,
	RuleStatusDto,
	RuleTemplateCriterionDto,
	RuleTemplateDto
} from '#lib/api/api.dtos.ts';
import { m } from '#lib/paraglide/messages.js';
import { labelFor } from '#lib/sensor-labels/index.ts';
import { createMockServices, type MockServices } from '#lib/testing/mock-services.ts';
import { renderWithServices } from '#lib/testing/render.ts';
import RulesPage from './+page.svelte';
import { describeRuleStatus } from './rule-status.ts';

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

function status(overrides: Partial<RuleStatusDto> = {}): RuleStatusDto {
	return {
		state: 'running',
		since: '2026-10-01T08:00:00.000Z',
		reason: null,
		byUserName: null,
		byRule: null,
		autoPauseAt: null,
		thenStart: null,
		nextStart: null,
		...overrides
	};
}

let services: MockServices;
let view: ReturnType<typeof renderWithServices> | null = null;

function render() {
	view = renderWithServices(RulesPage, { services, app: { accessToken: 'jwt-token' } });
	// Wide enough for every column; the narrow layouts have their own tests.
	view.target.style.width = '1300px';
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
/** The status icon of a row: its state and the tooltip that explains it. */
const statusOf = (row: HTMLTableRowElement) => ({
	state: row.querySelector<HTMLElement>('.rule-status')?.dataset.state,
	tooltip: row.querySelector('[role="tooltip"]')?.textContent?.trim()
});
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
			// The status cell is an icon; its text is the tooltip.
			m.rules_status_tip_running(),
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
			m.rules_status_tip_running(),
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
			cells(rows()[0])[3]
		);
	});

	it('shows placeholders for a template with nothing configured yet', async () => {
		getTemplates().mockResolvedValue([
			template({ name: 'Empty', assignments: [], criteria: [], actions: [] })
		]);
		render();

		await vi.waitFor(() => expect(rows()).toHaveLength(1));
		expect(cells(rows()[0]).slice(0, 5)).toEqual([
			'Empty',
			m.rules_status_tip_running(),
			m.rules_new_no_assignments(),
			m.common_not_available(),
			m.common_not_available()
		]);
		expect(groupLabels()).toEqual([m.rules_new_unknown_location()]);
	});

	it('shows whether each rule is running, paused or scheduled, and why', async () => {
		const paused = status({ state: 'paused', reason: 'manual', byUserName: 'Mei' });
		const scheduled = status({
			state: 'scheduled',
			reason: 'auto_pause',
			nextStart: {
				at: '2026-12-01T00:00:00.000Z',
				source: 'chain',
				byRule: { id: 1, name: 'Summer' }
			}
		});
		const running = status({
			reason: 'auto_start',
			autoPauseAt: '2026-12-01T00:00:00.000Z',
			thenStart: { id: 3, name: 'Winter' }
		});
		getTemplates().mockResolvedValue([
			template({ id: 1, name: 'A summer', status: running }),
			template({ id: 2, name: 'B paused', isActive: false, status: paused }),
			template({ id: 3, name: 'C winter', isActive: false, status: scheduled }),
			// An API from before the status existed.
			template({ id: 4, name: 'D old API', isActive: false })
		]);
		render();

		await vi.waitFor(() => expect(rows()).toHaveLength(4));
		expect(rows().map(statusOf)).toEqual([
			{ state: 'running', tooltip: describeRuleStatus(running).tooltip },
			{ state: 'paused', tooltip: describeRuleStatus(paused).tooltip },
			{ state: 'scheduled', tooltip: describeRuleStatus(scheduled).tooltip },
			{ state: 'paused', tooltip: m.rules_status_tip_paused() }
		]);
		expect(statusOf(rows()[0]).tooltip).toContain('Winter');
		expect(statusOf(rows()[1]).tooltip).toContain('Mei');
		expect(statusOf(rows()[2]).tooltip).toContain('Summer');
		expect(text()).toContain(m.rules_new_status());
	});

	it('opens the status tooltip beside the icon in a wide table and below it in the card layout', async () => {
		getTemplates().mockResolvedValue([template()]);
		render();
		await vi.waitFor(() => expect(rows()).toHaveLength(1));
		const bubble = () => rows()[0].querySelector('[role="tooltip"]')!;

		view!.target.style.width = '1200px';
		await vi.waitFor(() =>
			expect(bubble().classList.contains('cw-tooltip__bubble--right')).toBe(true)
		);

		// Below the table's own phone breakpoint its rows become cards: no room beside.
		view!.target.style.width = '360px';
		await vi.waitFor(() =>
			expect(bubble().classList.contains('cw-tooltip__bubble--bottom')).toBe(true)
		);
	});

	it('drops the date column in a narrow table, so the row buttons stay in view, and brings it back when there is room', async () => {
		getTemplates().mockResolvedValue([template()]);
		render();
		await vi.waitFor(() => expect(rows()).toHaveLength(1));
		const headers = () =>
			[...view!.target.querySelectorAll('thead th')].map((cell) => cell.textContent?.trim());

		view!.target.style.width = '1300px';
		await vi.waitFor(() => expect(headers()).toContain(m.common_created()));

		view!.target.style.width = '950px';
		await vi.waitFor(() => expect(headers()).not.toContain(m.common_created()));
		// Everything else stays.
		expect(headers()).toEqual(
			expect.arrayContaining([m.common_name(), m.rules_new_status(), m.rules_conditions()])
		);

		view!.target.style.width = '1300px';
		await vi.waitFor(() => expect(headers()).toContain(m.common_created()));
	});

	it('sorts by status', async () => {
		getTemplates().mockResolvedValue([
			template({ id: 1, name: 'Running rule' }),
			template({ id: 2, name: 'Paused rule', isActive: false })
		]);
		render();
		await vi.waitFor(() => expect(rows()).toHaveLength(2));
		const labels = [m.rules_status_running(), m.rules_status_paused()].sort((a, b) =>
			a.localeCompare(b)
		);
		const expected = labels.map((label) =>
			label === m.rules_status_running() ? 'Running rule' : 'Paused rule'
		);

		click(
			[...view!.target.querySelectorAll('button.cw-data-table__sort-btn')].find((button) =>
				button.textContent?.includes(m.rules_new_status())
			)
		);

		await vi.waitFor(() => expect(rows().map((row) => cells(row)[0])).toEqual(expected));
	});

	it('pauses a rule from its row and shows it at once, without reloading the list', async () => {
		const paused = status({ state: 'paused', reason: 'manual', byUserName: 'Mei' });
		getTemplates().mockResolvedValue([
			template({ id: 1, name: 'Cold room', status: status() }),
			template({ id: 2, name: 'Warm room', status: status() })
		]);
		services.rules.pauseRule.mockResolvedValue(
			template({ id: 1, name: 'Cold room', isActive: false, status: paused })
		);
		render();
		await vi.waitFor(() => expect(rows()).toHaveLength(2));

		click(document.getElementById('rule-run-1-pause-button'));
		// Nothing happens before the question is answered.
		expect(services.rules.pauseRule).not.toHaveBeenCalled();
		click(document.getElementById('rule-run-1-confirm-pause-button'));

		await vi.waitFor(() =>
			expect(statusOf(rows()[0])).toEqual({
				state: 'paused',
				tooltip: describeRuleStatus(paused).tooltip
			})
		);
		expect(services.rules.pauseRule).toHaveBeenCalledWith(1);
		expect(statusOf(rows()[1]).state).toBe('running');
		// The row now offers Start; the other row still offers Pause.
		expect(document.getElementById('rule-run-1-start-button')).not.toBeNull();
		expect(document.getElementById('rule-run-1-pause-button')).toBeNull();
		expect(document.getElementById('rule-run-2-pause-button')).not.toBeNull();
		expect(getTemplates()).toHaveBeenCalledTimes(1);
	});

	it('starts a paused rule from its row', async () => {
		getTemplates().mockResolvedValue([
			template({ id: 5, isActive: false, status: status({ state: 'paused' }) })
		]);
		services.rules.startRule.mockResolvedValue(
			template({ id: 5, status: status({ reason: 'manual', byUserName: 'Aki' }) })
		);
		render();
		await vi.waitFor(() => expect(rows()).toHaveLength(1));
		expect(statusOf(rows()[0]).state).toBe('paused');

		click(document.getElementById('rule-run-5-start-button'));

		await vi.waitFor(() => expect(statusOf(rows()[0]).state).toBe('running'));
		expect(services.rules.startRule).toHaveBeenCalledWith(5);
		expect(statusOf(rows()[0]).tooltip).toContain('Aki');
		expect(document.getElementById('rule-run-5-pause-button')).not.toBeNull();
	});

	it('a reload shows what the API says, not what a row button changed earlier', async () => {
		getTemplates().mockResolvedValue([template({ id: 5, status: status() })]);
		services.rules.pauseRule.mockResolvedValue(
			template({ id: 5, isActive: false, status: status({ state: 'paused' }) })
		);
		render();
		await vi.waitFor(() => expect(rows()).toHaveLength(1));
		click(document.getElementById('rule-run-5-pause-button'));
		click(document.getElementById('rule-run-5-confirm-pause-button'));
		await vi.waitFor(() => expect(statusOf(rows()[0]).state).toBe('paused'));

		// Meanwhile someone else started it again; the next load must show that.
		const search = view!.target.querySelector<HTMLInputElement>(
			'.cw-data-table__search-wrapper input'
		)!;
		search.value = 'cold';
		search.dispatchEvent(new Event('input', { bubbles: true }));

		await vi.waitFor(() => expect(getTemplates()).toHaveBeenCalledTimes(2));
		await vi.waitFor(() => expect(statusOf(rows()[0]).state).toBe('running'));
		expect(document.getElementById('rule-run-5-pause-button')).not.toBeNull();
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
