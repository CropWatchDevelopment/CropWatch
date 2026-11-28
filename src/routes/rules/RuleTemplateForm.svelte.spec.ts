import { flushSync, tick } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
	DeviceDto,
	LocationDto,
	RuleActionTypeDto,
	RuleFormContextDto,
	RuleTemplateActionDto,
	RuleTemplateDto
} from '#lib/api/api.dtos.ts';
import { cwRuleConditionText } from '@cropwatchdevelopment/cwui';
import { ruleResetHelpUrl } from '#lib/i18n/help-urls.ts';
import { m } from '#lib/paraglide/messages.js';
import { createMockServices, type MockServices } from '#lib/testing/mock-services.ts';
import { renderWithServices } from '#lib/testing/render.ts';
import { describeSchedule } from './rule-schedule-text.ts';
import { formatRuleInstant } from './rule-status.ts';
import RuleTemplateForm from './RuleTemplateForm.svelte';

const { goto } = vi.hoisted(() => ({ goto: vi.fn(async () => {}) }));
vi.mock('$app/navigation', () => ({ goto }));

const ACTION_TYPES: RuleActionTypeDto[] = [
	{ id: 1, name: 'EMail', value: 'email', createdAt: '' },
	{ id: 2, name: 'LINE', value: 'line', createdAt: '' },
	{ id: 3, name: 'Push', value: 'push', createdAt: '' },
	{ id: 4, name: 'LoRaWAN', value: 'lorawan', createdAt: '' }
];

function context(overrides: Partial<RuleFormContextDto> = {}): RuleFormContextDto {
	return {
		devices: [
			{ dev_eui: 'DEV-A', name: 'Freezer A', location_id: 10, type: 5 } as DeviceDto,
			{ dev_eui: 'DEV-B', name: 'Relay B', location_id: 10, type: 6 } as DeviceDto
		],
		locations: [{ location_id: 10, name: 'North barn' } as LocationDto],
		actionTypes: ACTION_TYPES,
		template: null,
		...overrides
	};
}

function templateAction(overrides: Partial<RuleTemplateActionDto> = {}): RuleTemplateActionDto {
	return {
		id: 31,
		templateId: 7,
		actionType: 1,
		actionTypeName: 'EMail',
		actionTypeValue: 'email',
		config: { recipient: 'ops@example.com' },
		createdAt: null,
		...overrides
	};
}

function template(overrides: Partial<RuleTemplateDto> = {}): RuleTemplateDto {
	return {
		id: 7,
		name: 'Cold room',
		description: null,
		deviceTypeId: 5,
		isActive: true,
		createdAt: null,
		assignments: [
			{
				id: 1,
				devEui: 'DEV-A',
				templateId: 7,
				isActive: true,
				createdAt: null,
				deviceName: 'Freezer A',
				locationName: 'North barn',
				permissionLevel: 1,
				state: null
			}
		],
		criteria: [
			{
				id: 21,
				templateId: 7,
				subject: 'temperature_c',
				operator: '>',
				triggerValue: 8,
				resetValue: 6,
				createdAt: null
			}
		],
		actions: [templateAction()],
		...overrides
	};
}

let services: MockServices;
let view: ReturnType<typeof renderWithServices> | null = null;

function render(
	props: Partial<{
		mode: 'create' | 'edit';
		context: RuleFormContextDto;
		preselectedDevEui: string | null;
		currentUserId: string | null;
		currentUserName: string | null;
	}> = {},
	accessToken: string | null = 'jwt-token'
) {
	view = renderWithServices(RuleTemplateForm, {
		props: { mode: 'create', context: context(), ...props },
		services,
		app: { accessToken: accessToken ?? undefined }
	});
	return view;
}

const byId = <T extends HTMLElement = HTMLElement>(id: string) =>
	document.getElementById(id) as T | null;
const text = () => view?.target.textContent ?? '';
const submitButton = () => byId<HTMLButtonElement>('rule-form-submit-button')!;

function click(element: Element | null | undefined) {
	(element as HTMLElement).click();
	flushSync();
}

function type(input: HTMLInputElement | HTMLTextAreaElement, value: string) {
	input.value = value;
	input.dispatchEvent(new Event('input', { bubbles: true }));
	flushSync();
}

/** The rule editor's own text, in the language the tests run in. */
const conditionText = cwRuleConditionText('ja');

/** A field of the first condition's limit number `limit`: its alert value, reset value or comparison. */
const conditionField = <T extends HTMLElement = HTMLInputElement>(
	field: 'value' | 'reset' | 'condition',
	limit = 0
) => byId<T>(`rule-form-criteria-0-${limit}-${field}`);

/** Opens a cwui dropdown / multiselect by its trigger id and clicks the option labelled `label`. */
function choose(triggerId: string, label: string) {
	const trigger = byId(triggerId)!;
	const root = trigger.closest('.cw-dropdown, .cw-multiselect')!;
	if (trigger.getAttribute('aria-expanded') !== 'true') click(trigger);
	const option = [...root.querySelectorAll('li[role="option"]')].find(
		(candidate) => candidate.textContent?.trim() === label
	);
	if (!option) throw new Error(`No option "${label}" in ${triggerId}`);
	click(option);
}

/** Types the first condition's alert and reset values. */
function fillCondition(trigger = '8', reset = '6') {
	type(conditionField('value')!, trigger);
	type(conditionField('reset')!, reset);
}

/** Picks the first condition's comparison ("rises above", "drops below", …). */
function chooseCondition(label: string) {
	choose('rule-form-criteria-0-0-condition', label);
}

/** The "revert on reset" checkboxes of the relay actions, found through their labels. */
const revertCheckboxes = () =>
	[...view!.target.querySelectorAll('label')]
		.filter((label) => label.textContent?.trim() === m.rule_action_revert_on_reset())
		.map((label) => document.getElementById(label.htmlFor) as HTMLInputElement | null);

beforeEach(() => {
	services = createMockServices();
	services.push.getPushRecipientCandidates.mockResolvedValue([]);
});

afterEach(() => {
	view?.unmount();
	view = null;
	goto.mockClear();
});

describe('RuleTemplateForm', () => {
	it('renders the four steps of a new rule', () => {
		render();

		expect(text()).toContain(m.rules_new_step_template());
		expect(text()).toContain(m.rules_new_step_assignments());
		expect(text()).toContain(m.rules_step_3_title());
		expect(text()).toContain(m.rules_new_step_actions());
		expect(text()).toContain(m.rules_step_4_title());
		expect(byId('rule-form-name-input')).not.toBeNull();
		expect(byId('rule-form-description-textarea')).not.toBeNull();
		expect(byId<HTMLInputElement>('rule-form-active-switch')?.checked).toBe(true);
		expect(byId('rule-form-devices-multiselect')).not.toBeNull();
		expect(text()).toContain(m.rules_condition_number({ count: '1' }));
		expect(text()).toContain(m.rules_new_action_number({ count: '1' }));
		// One condition and one action: nothing to remove yet.
		expect(byId('rule-form-criteria-0-remove-button')).toBeNull();
		expect(byId('rule-form-action-0-remove-button')).toBeNull();
		expect(text()).toContain(m.rules_complete_required_fields());
		expect(submitButton().disabled).toBe(true);
		expect(submitButton().textContent?.trim()).toBe(m.rules_create_rule());
		expect(services.push.getPushRecipientCandidates).not.toHaveBeenCalled();
	});

	it('says when there are no devices to assign', () => {
		render({ context: context({ devices: [] }) });

		expect(text()).toContain(m.rules_no_devices_available());
		expect(byId('rule-form-devices-multiselect')).toBeNull();
	});

	it('leaves the action type empty when the server offers none', () => {
		render({ context: context({ actionTypes: [] }) });

		const typeSelect = byId('rule-form-action-0-type-select')!;
		expect(typeSelect.classList.contains('cw-dropdown__trigger--placeholder')).toBe(true);
		expect(byId('rule-form-action-0-recipient-input')).toBeNull();
	});

	it('groups the devices by location in the device picker', () => {
		render();

		click(byId('rule-form-devices-multiselect'));

		const picker = byId('rule-form-devices-multiselect')!.closest('.cw-multiselect')!;
		expect(picker.querySelector('.cw-multiselect__group-header-label')?.textContent?.trim()).toBe(
			'North barn'
		);
		expect(
			[...picker.querySelectorAll('li[role="option"]')].map((option) => option.textContent?.trim())
		).toEqual(['Freezer A (DEV-A)', 'Relay B (DEV-B)']);
	});

	it('looks up push recipients for the chosen devices', async () => {
		render();

		choose('rule-form-devices-multiselect', 'Freezer A (DEV-A)');

		await vi.waitFor(() =>
			expect(services.push.getPushRecipientCandidates).toHaveBeenCalledWith(['DEV-A'])
		);

		choose('rule-form-devices-multiselect', 'Relay B (DEV-B)');

		await vi.waitFor(() =>
			expect(services.push.getPushRecipientCandidates).toHaveBeenLastCalledWith(['DEV-A', 'DEV-B'])
		);
	});

	it('looks nothing up without a session', async () => {
		render({ preselectedDevEui: 'DEV-A' }, null);
		await tick();

		expect(services.push.getPushRecipientCandidates).not.toHaveBeenCalled();
	});

	it('creates a complete rule and returns to the rules list', async () => {
		services.rules.createRuleTemplate.mockResolvedValue(template());
		render({ preselectedDevEui: 'DEV-A' });

		type(byId<HTMLInputElement>('rule-form-name-input')!, ' Cold room ');
		type(byId<HTMLTextAreaElement>('rule-form-description-textarea')!, 'Keep it cold');
		fillCondition();
		type(byId<HTMLInputElement>('rule-form-action-0-recipient-input')!, 'ops@example.com');

		expect(submitButton().disabled).toBe(false);
		const summary = view!.target.querySelector('.rules-new-form__summary')!;
		expect(summary.textContent).toContain(' Cold room ');
		expect(summary.textContent).toContain(m.rules_new_active());
		expect(summary.textContent).toContain('Freezer A (DEV-A)');
		expect(summary.textContent).toContain(
			`${m.rule_subject_temperature()} ${m.rule_operator_greater_than()} 8 (${m.rules_reset_value()}: 6)`
		);

		click(submitButton());

		await vi.waitFor(() => expect(goto).toHaveBeenCalledWith('/rules'));
		expect(services.rules.createRuleTemplate).toHaveBeenCalledWith({
			name: 'Cold room',
			description: 'Keep it cold',
			deviceTypeId: 5,
			isActive: true,
			devEuis: ['DEV-A'],
			criteria: [
				{ id: null, subject: 'temperature_c', operator: '>', triggerValue: 8, resetValue: 6 }
			],
			actions: [{ id: null, actionType: 1, config: { recipient: 'ops@example.com' } }]
		});
		expect(view!.toasts()[0]).toMatchObject({
			tone: 'success',
			message: m.rules_new_created_success({ name: 'Cold room' })
		});
	});

	it('marks the rule inactive with the switch', () => {
		render({ mode: 'edit', context: context({ template: template() }) });

		click(byId('rule-form-active-switch'));

		expect(view!.target.querySelector('.rules-new-form__summary')?.textContent).toContain(
			m.rules_new_inactive()
		);
	});

	it('shows the save in progress, and the API error when it fails', async () => {
		let failSave!: (reason: unknown) => void;
		services.rules.updateRuleTemplate.mockReturnValue(
			new Promise((_resolve, reject) => (failSave = reject))
		);
		render({ mode: 'edit', context: context({ template: template() }) });
		expect(submitButton().textContent?.trim()).toBe(m.action_save_changes());

		click(submitButton());

		expect(services.rules.updateRuleTemplate).toHaveBeenCalledWith(7, expect.any(Object));
		expect(submitButton().textContent?.trim()).toBe(m.action_saving());
		expect(submitButton().disabled).toBe(true);
		expect(byId<HTMLButtonElement>('rule-form-cancel-button')?.disabled).toBe(true);

		failSave({ message: 'Name already used' });

		await vi.waitFor(() =>
			expect(view!.toasts()[0]).toMatchObject({ tone: 'danger', message: 'Name already used' })
		);
		expect(submitButton().textContent?.trim()).toBe(m.action_save_changes());
		expect(goto).not.toHaveBeenCalled();
	});

	it('edits an existing rule', async () => {
		services.rules.updateRuleTemplate.mockResolvedValue(template());
		render({ mode: 'edit', context: context({ template: template() }), currentUserId: 'me' });

		expect(text()).toContain(m.rules_step_4_review_save_title());
		expect(byId<HTMLInputElement>('rule-form-name-input')?.value).toBe('Cold room');
		expect(byId<HTMLInputElement>('rule-form-action-0-recipient-input')?.value).toBe(
			'ops@example.com'
		);

		click(submitButton());

		await vi.waitFor(() => expect(goto).toHaveBeenCalledWith('/rules'));
		expect(services.rules.updateRuleTemplate).toHaveBeenCalledWith(7, {
			name: 'Cold room',
			description: null,
			deviceTypeId: 5,
			devEuis: ['DEV-A'],
			criteria: [
				{ id: 21, subject: 'temperature_c', operator: '>', triggerValue: 8, resetValue: 6 }
			],
			actions: [{ id: 31, actionType: 1, config: { recipient: 'ops@example.com' } }]
		});
		expect(view!.toasts()[0]?.message).toBe(m.rules_new_updated_success({ name: 'Cold room' }));
	});

	describe('start date, pause date and the rule to start', () => {
		const START = '2099-03-01T00:30:00.000Z';
		const PAUSE = '2099-09-01T15:00:00.000Z';
		const section = () => byId('rule-form-auto-dates')!;
		const thenSelect = () => byId<HTMLButtonElement>('rule-form-auto-then-select')!;

		it('offers both dates, says which time zone they are in, and waits for a pause date', () => {
			render();

			expect(section().textContent).toContain(m.rules_auto_section_title());
			expect(section().textContent).toContain(
				m.rules_auto_section_hint({ zone: Intl.DateTimeFormat().resolvedOptions().timeZone })
			);
			expect(byId('rule-form-auto-start-picker')).not.toBeNull();
			expect(byId('rule-form-auto-pause-picker')).not.toBeNull();
			expect(section().textContent).toContain(m.rules_auto_start_hint());
			expect(section().textContent).toContain(m.rules_auto_pause_hint());
			// Nothing to clear, nothing to follow yet.
			expect(byId('rule-form-auto-start-clear-button')).toBeNull();
			expect(byId('rule-form-auto-pause-clear-button')).toBeNull();
			expect(thenSelect().disabled).toBe(true);
			expect(section().textContent).toContain(m.rules_auto_then_needs_pause());
			expect(section().textContent).not.toContain(m.rules_auto_start_while_active());
		});

		it('shows a saved plan, in the summary too', () => {
			render({
				mode: 'edit',
				context: context({
					template: template({
						isActive: false,
						autoStartAt: START,
						autoPauseAt: PAUSE,
						onAutoPauseStartTemplateId: 12
					}),
					ruleOptions: [{ id: 12, name: 'Winter' }]
				})
			});

			expect(thenSelect().disabled).toBe(false);
			expect(thenSelect().textContent).toContain('Winter');
			expect(section().textContent).toContain(m.rules_auto_then_hint());
			// The picker's button shows the day only; the full time and zone are under it.
			expect(section().textContent).toContain(
				m.rules_auto_start_at_hint({ date: formatRuleInstant(START) })
			);
			expect(section().textContent).toContain(
				m.rules_auto_pause_at_hint({ date: formatRuleInstant(PAUSE) })
			);
			expect(section().textContent).not.toContain(m.rules_auto_start_hint());
			const summary = view!.target.querySelector('.rules-new-form__summary')!.textContent!;
			expect(summary).toContain(formatRuleInstant(START));
			expect(summary).toContain(formatRuleInstant(PAUSE));
			expect(summary).toContain('Winter');
			// Paused until the start date: nothing to warn about.
			expect(section().textContent).not.toContain(m.rules_auto_start_while_active());
		});

		it('warns that a start date does nothing while the rule is set to run', () => {
			render({
				mode: 'edit',
				context: context({ template: template({ isActive: true, autoStartAt: START }) })
			});

			expect(section().textContent).toContain(m.rules_auto_start_while_active());

			click(byId('rule-form-active-switch'));

			expect(section().textContent).not.toContain(m.rules_auto_start_while_active());
		});

		it('clears a date with its button, and sends that on save', async () => {
			services.rules.updateRuleTemplate.mockResolvedValue(template());
			render({
				mode: 'edit',
				context: context({
					template: template({
						isActive: false,
						autoStartAt: START,
						autoPauseAt: PAUSE,
						onAutoPauseStartTemplateId: 12
					}),
					ruleOptions: [{ id: 12, name: 'Winter' }]
				})
			});

			click(byId('rule-form-auto-pause-clear-button'));

			expect(byId('rule-form-auto-pause-clear-button')).toBeNull();
			expect(byId('rule-form-auto-start-clear-button')).not.toBeNull();
			expect(thenSelect().disabled).toBe(true);

			click(byId('rule-form-auto-start-clear-button'));
			click(submitButton());

			await vi.waitFor(() => expect(services.rules.updateRuleTemplate).toHaveBeenCalled());
			const payload = services.rules.updateRuleTemplate.mock.calls[0][1];
			expect(payload).toMatchObject({
				autoStartAt: null,
				autoPauseAt: null,
				onAutoPauseStartTemplateId: null
			});
			expect(payload).not.toHaveProperty('isActive');
		});

		it('chooses the rule to start from the list', async () => {
			services.rules.updateRuleTemplate.mockResolvedValue(template());
			render({
				mode: 'edit',
				context: context({
					template: template({ autoPauseAt: PAUSE }),
					ruleOptions: [
						{ id: 12, name: 'Winter' },
						{ id: 13, name: 'Spring' }
					]
				})
			});

			choose('rule-form-auto-then-select', 'Spring');
			click(submitButton());

			await vi.waitFor(() => expect(services.rules.updateRuleTemplate).toHaveBeenCalled());
			const payload = services.rules.updateRuleTemplate.mock.calls[0][1];
			expect(payload.onAutoPauseStartTemplateId).toBe(13);
			expect(payload).not.toHaveProperty('autoPauseAt');
		});
	});

	describe('Date/Time rules and rule switches', () => {
		const SWITCH_TYPES: RuleActionTypeDto[] = [
			...ACTION_TYPES,
			{ id: 6, name: 'RuleActivate', value: null, createdAt: '' },
			{ id: 7, name: 'RuleDeactivate', value: null, createdAt: '' },
			{ id: 8, name: 'RuleDeactivateSelf', value: null, createdAt: '' }
		];
		const managerContext = (overrides: Partial<RuleFormContextDto> = {}) =>
			context({
				actionTypes: SWITCH_TYPES,
				ruleOptions: [
					{ id: 12, name: 'Winter', orgId: 'org-a', triggerKind: 'sensor' },
					{ id: 13, name: 'Spring', orgId: 'org-a', triggerKind: 'sensor' }
				],
				canManageDateTimeRules: true,
				...overrides
			});
		const subjectOptions = () => {
			click(byId('rule-form-criteria-0-subject-select'));
			const picker = byId('rule-form-criteria-0-subject-select')!.closest('.cw-dropdown')!;
			const labels = [...picker.querySelectorAll('li[role="option"]')].map((option) =>
				option.textContent?.trim()
			);
			click(byId('rule-form-criteria-0-subject-select'));
			return labels;
		};

		it('offers the Date/Time data field only to those who may manage such rules', () => {
			render({ context: managerContext() });
			expect(subjectOptions()).toContain(m.rule_subject_date_time());
			view!.unmount();

			render({ context: managerContext({ canManageDateTimeRules: false }) });
			expect(subjectOptions()).not.toContain(m.rule_subject_date_time());
		});

		it('choosing it replaces devices and conditions with a time, weekdays and a time zone', () => {
			render({ context: managerContext() });
			expect(byId('rule-form-schedule')).toBeNull();
			expect(byId('rule-form-devices-multiselect')).not.toBeNull();
			expect(byId('rule-form-add-criteria-button')).not.toBeNull();

			choose('rule-form-criteria-0-subject-select', m.rule_subject_date_time());

			const schedule = byId('rule-form-schedule')!;
			expect(schedule.textContent).toContain(m.rules_dt_time_label());
			expect(byId('rule-form-schedule-days-multiselect')).not.toBeNull();
			expect(byId('rule-form-schedule-timezone-select')).not.toBeNull();
			// Says which zone the time is in, and that DST days are handled.
			expect(text()).toContain(
				m.rules_dt_hint({ zone: Intl.DateTimeFormat().resolvedOptions().timeZone })
			);
			// No devices, no thresholds, no second condition.
			expect(byId('rule-form-date-time-devices-notice')?.textContent).toBe(
				m.rules_dt_notice_devices()
			);
			expect(byId('rule-form-devices-multiselect')).toBeNull();
			expect(byId('rule-form-add-criteria-button')).toBeNull();
			expect(view!.target.querySelector('.cw-rule-condition')).toBeNull();
			expect(byId('rule-form-date-time-actions-notice')?.textContent).toBe(
				m.rules_dt_actions_hint()
			);
		});

		it('offers a Date/Time rule only the actions it can run', () => {
			render({ context: managerContext() });
			choose('rule-form-criteria-0-subject-select', m.rule_subject_date_time());

			click(byId('rule-form-action-0-type-select'));
			const picker = byId('rule-form-action-0-type-select')!.closest('.cw-dropdown')!;
			expect(
				[...picker.querySelectorAll('li[role="option"]')].map((option) =>
					option.textContent?.trim()
				)
			).toEqual([
				m.rules_action_type_relay(),
				m.rules_action_type_rule_activate(),
				m.rules_action_type_rule_deactivate(),
				m.rules_action_type_rule_deactivate_self()
			]);
		});

		it('a Date/Time rule\'s relay has no "revert on reset": the rule never resets', () => {
			render({ context: managerContext() });
			// A sensor rule's relay offers it…
			choose('rule-form-action-0-type-select', m.rules_action_type_relay());
			expect(revertCheckboxes()).toHaveLength(1);

			// …a Date/Time rule's does not.
			choose('rule-form-criteria-0-subject-select', m.rule_subject_date_time());
			choose('rule-form-action-0-type-select', m.rules_action_type_relay());
			expect(revertCheckboxes()).toHaveLength(0);
		});

		it('creates a Date/Time rule that switches another rule', async () => {
			services.rules.createRuleTemplate.mockResolvedValue(template());
			render({ context: managerContext() });
			type(byId<HTMLInputElement>('rule-form-name-input')!, 'Every morning');
			choose('rule-form-criteria-0-subject-select', m.rule_subject_date_time());
			choose('rule-form-action-0-type-select', m.rules_action_type_rule_activate());

			// The action needs its rule first.
			expect(submitButton().disabled).toBe(true);
			expect(text()).toContain(m.rules_switch_other_hint());
			choose('rule-form-action-0-target-select', 'Winter');
			expect(submitButton().disabled).toBe(false);

			// The summary shows the schedule in place of devices and conditions.
			const summary = view!.target.querySelector('.rules-new-form__summary')!.textContent!;
			expect(summary).toContain(m.rules_dt_no_devices());
			expect(summary).toContain(m.rules_dt_every_day());

			click(submitButton());

			await vi.waitFor(() => expect(services.rules.createRuleTemplate).toHaveBeenCalled());
			expect(services.rules.createRuleTemplate.mock.calls[0][0]).toMatchObject({
				name: 'Every morning',
				triggerKind: 'schedule',
				schedule: {
					timeOfDay: '09:00',
					daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
					timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
				},
				devEuis: [],
				criteria: [],
				actions: [{ id: null, actionType: 6, config: { recipient: '12', targetTemplateId: 12 } }]
			});
		});

		it('explains "Deactivate THIS rule" instead of asking for a target', () => {
			render({ context: managerContext() });

			choose('rule-form-action-0-type-select', m.rules_action_type_rule_deactivate_self());

			expect(text()).toContain(m.rules_switch_self_hint());
			expect(byId('rule-form-action-0-target-select')).toBeNull();
			expect(byId('rule-form-action-0-recipient-input')).toBeNull();
		});

		it('says so when there is no other rule to switch', () => {
			render({ context: managerContext({ ruleOptions: [] }) });

			choose('rule-form-action-0-type-select', m.rules_action_type_rule_deactivate());

			expect(text()).toContain(m.rules_switch_no_rules());
			expect(byId('rule-form-action-0-target-select')).toBeNull();
			expect(submitButton().disabled).toBe(true);
		});

		it('opens a saved Date/Time rule with its schedule, and keeps it a Date/Time rule', () => {
			const schedule = {
				timeOfDay: '18:30',
				daysOfWeek: [6, 7],
				timezone: 'America/New_York',
				nextFireAt: '2099-01-03T23:30:00.000Z',
				lastFiredAt: null
			};
			render({
				mode: 'edit',
				context: managerContext({
					template: template({
						triggerKind: 'schedule',
						orgId: 'org-a',
						assignments: [],
						criteria: [],
						schedule,
						actions: [
							templateAction({
								actionType: 7,
								actionTypeName: 'RuleDeactivate',
								config: { recipient: '13', targetTemplateId: 13 }
							})
						]
					})
				})
			});

			expect(byId('rule-form-schedule')).not.toBeNull();
			expect(byId('rule-form-schedule-timezone-select')?.textContent).toContain(
				m.unit_tz_new_york()
			);
			expect(
				byId('rule-form-schedule-days-multiselect')?.closest('.cw-multiselect')?.textContent
			).toContain(m.common_day_saturday());
			expect(byId('rule-form-action-0-target-select')?.textContent).toContain('Spring');
			// The only data field on offer is Date/Time.
			expect(subjectOptions()).toEqual([m.rule_subject_date_time()]);
			expect(view!.target.querySelector('.rules-new-form__summary')!.textContent).toContain(
				describeSchedule(schedule)
			);
			expect(submitButton().disabled).toBe(false);
		});
	});

	it('goes back to the rules list on cancel', () => {
		render();

		click(byId('rule-form-cancel-button'));

		expect(goto).toHaveBeenCalledWith('/rules');
		expect(services.rules.createRuleTemplate).not.toHaveBeenCalled();
	});

	it('adds and removes conditions', () => {
		render();

		click(byId('rule-form-add-criteria-button'));

		expect(text()).toContain(m.rules_condition_number({ count: '2' }));
		expect(byId('rule-form-criteria-1-subject-select')).not.toBeNull();
		expect(byId('rule-form-criteria-0-remove-button')).not.toBeNull();

		click(byId('rule-form-criteria-0-remove-button'));

		expect(text()).not.toContain(m.rules_condition_number({ count: '2' }));
		expect(byId('rule-form-criteria-0-remove-button')).toBeNull();
	});

	it('chooses the data field a condition watches', () => {
		render({ mode: 'edit', context: context({ template: template() }) });

		choose('rule-form-criteria-0-subject-select', m.rule_subject_humidity());

		expect(view!.target.querySelector('.rules-new-form__summary')?.textContent).toContain(
			`${m.rule_subject_humidity()} ${m.rule_operator_greater_than()} 8`
		);
	});

	it('warns about range conditions, which rules cannot use', () => {
		render({
			mode: 'edit',
			context: context({
				template: template({
					criteria: [
						{
							id: 21,
							templateId: 7,
							subject: 'temperature_c',
							operator: 'range',
							triggerValue: 1,
							resetValue: 0,
							createdAt: null
						}
					]
				})
			})
		});

		expect(text()).toContain(m.rules_new_test_reason_unsupported_operator());
		expect(submitButton().disabled).toBe(true);
	});

	it('adds and removes actions', () => {
		render();

		click(byId('rule-form-add-action-button'));

		expect(text()).toContain(m.rules_new_action_number({ count: '2' }));
		expect(byId('rule-form-action-1-recipient-input')).not.toBeNull();

		click(byId('rule-form-action-1-remove-button'));

		expect(text()).not.toContain(m.rules_new_action_number({ count: '2' }));
		expect(byId('rule-form-action-0-remove-button')).toBeNull();
	});

	it('shows the recipient field for the chosen action type', () => {
		render();
		expect(byId('rule-form-action-0-recipient-input')).not.toBeNull();

		choose('rule-form-action-0-type-select', m.rules_action_type_push());
		expect(byId('rule-form-action-0-recipient-input')).toBeNull();
		expect(byId('rule-form-action-0-push-recipients')).not.toBeNull();

		choose('rule-form-action-0-type-select', m.rules_action_type_relay());
		expect(byId('rule-form-action-0-push-recipients')).toBeNull();
		expect(revertCheckboxes()).toEqual([expect.any(HTMLInputElement)]);
	});

	it('gives each relay action its own "revert on reset" checkbox', () => {
		render();
		choose('rule-form-action-0-type-select', m.rules_action_type_relay());
		click(byId('rule-form-add-action-button'));
		choose('rule-form-action-1-type-select', m.rules_action_type_relay());

		const [first, second] = revertCheckboxes();
		expect(first).toBeInstanceOf(HTMLInputElement);
		expect(second).toBeInstanceOf(HTMLInputElement);
		expect(first).not.toBe(second);
	});

	it('keeps a saved "not equal" condition, which the editor shows as equals, until another is chosen', async () => {
		services.rules.updateRuleTemplate.mockResolvedValue(template());
		const saved = template().criteria[0];
		render({
			mode: 'edit',
			context: context({ template: template({ criteria: [{ ...saved, operator: '!=' }] }) })
		});
		const notice = m.rules_condition_not_equal_kept({
			names: m.rules_condition_number({ count: '1' }),
			notEqual: m.rule_operator_not_equal(),
			equals: conditionText.opEquals
		});
		const summary = () => view!.target.querySelector('.rules-new-form__summary')?.textContent;
		expect(view!.target.querySelector('.app-notice--neutral')?.textContent?.trim()).toBe(notice);
		expect(summary()).toContain(`${m.rule_subject_temperature()} ${m.rule_operator_not_equal()} 8`);

		click(submitButton());

		await vi.waitFor(() => expect(goto).toHaveBeenCalledTimes(1));
		expect(services.rules.updateRuleTemplate.mock.calls[0][1].criteria).toEqual([
			{ id: 21, subject: 'temperature_c', operator: '!=', triggerValue: 8, resetValue: 6 }
		]);
		await vi.waitFor(() => expect(submitButton().disabled).toBe(false));

		chooseCondition(conditionText.opAbove);

		expect(text()).not.toContain(notice);
		expect(summary()).toContain(
			`${m.rule_subject_temperature()} ${m.rule_operator_greater_than()} 8`
		);
		click(submitButton());
		await vi.waitFor(() => expect(services.rules.updateRuleTemplate).toHaveBeenCalledTimes(2));
		expect(services.rules.updateRuleTemplate.mock.calls[1][1].criteria).toEqual([
			{ id: 21, subject: 'temperature_c', operator: '>', triggerValue: 8, resetValue: 6 }
		]);
	});

	it('lists a saved action type the server no longer offers', () => {
		render({
			mode: 'edit',
			context: context({
				template: template({
					actions: [
						templateAction({ actionType: 9, actionTypeName: 'SMS', actionTypeValue: 'sms' })
					]
				})
			})
		});

		expect(byId('rule-form-action-0-type-select')?.textContent?.trim()).toBe('SMS');
		// No field for a type the form does not know.
		expect(byId('rule-form-action-0-recipient-input')).toBeNull();
	});

	it('does not offer LINE as an alert type', () => {
		render();

		click(byId('rule-form-action-0-type-select'));

		const picker = byId('rule-form-action-0-type-select')!.closest('.cw-dropdown')!;
		expect(
			[...picker.querySelectorAll('li[role="option"]')].map((option) => option.textContent?.trim())
		).toEqual([
			m.rules_action_type_email(),
			m.rules_action_type_push(),
			m.rules_action_type_relay()
		]);
	});

	it('preselects the creator for push alerts and explains when they cannot receive them', async () => {
		services.push.getPushRecipientCandidates.mockResolvedValue([
			{ userId: 'me', displayName: 'Me myself', pushEnabled: false },
			{ userId: 'u-1', displayName: 'Ada', pushEnabled: true }
		]);
		render({ preselectedDevEui: 'DEV-A', currentUserId: 'me', currentUserName: 'Me' });

		const field = () => byId('rule-form-action-0-push-recipients')!.closest('.cw-multiselect')!;
		expect(field().querySelector('.cw-multiselect__chip-label')?.textContent).toBe('Me');

		await vi.waitFor(() =>
			expect(field().textContent).toContain(
				m.push_recipient_not_subscribed_error({ names: 'Me myself' })
			)
		);

		choose('rule-form-action-0-push-recipients', 'Ada');

		expect(field().textContent).not.toContain(
			m.push_recipient_not_subscribed_error({ names: 'Me myself' })
		);
		expect(
			[...field().querySelectorAll('.cw-multiselect__chip-label')].map((chip) => chip.textContent)
		).toEqual(['Ada']);
	});

	it('sends a relay downlink for a LoRaWAN action', async () => {
		services.rules.updateRuleTemplate.mockResolvedValue(template());
		render({ mode: 'edit', context: context({ template: template() }) });

		choose('rule-form-action-0-type-select', m.rules_action_type_relay());
		click(submitButton());

		await vi.waitFor(() => expect(services.rules.updateRuleTemplate).toHaveBeenCalled());
		const [action] = services.rules.updateRuleTemplate.mock.calls[0][1].actions;
		expect(action.actionType).toBe(4);
		expect(JSON.parse((action.config as { recipient: string }).recipient)).toMatchObject({
			devEui: '',
			action: 'ro1_on_timed',
			onTimeSeconds: 5,
			downlink: { f_port: 2, priority: 'NORMAL' }
		});
	});

	describe('the condition editor', () => {
		const condition = () => view!.target.querySelector<HTMLElement>('.cw-rule-condition')!;

		it('shows a sensor rule its condition editor, with nothing complaining before anything is typed', () => {
			render();

			expect(condition()).not.toBeNull();
			expect(conditionField('value')!.value).toBe('');
			expect(conditionField('reset')!.value).toBe('');
			expect(condition().querySelectorAll('.cw-input__message--error')).toHaveLength(0);
			expect(condition().textContent).toContain(conditionText.summaryEmpty);
		});

		it('suggests a reset on the safe side as the alert value is typed', () => {
			render();

			type(conditionField('value')!, '30');
			expect(conditionField('reset')!.value).toBe('28');

			// The other way round, the safe side is the other side.
			chooseCondition(conditionText.opBelow);
			expect(conditionField('reset')!.value).toBe('32');
			expect(condition().querySelector('.cw-rule-example')).not.toBeNull();
		});

		it('keeps a reset the user typed when the alert value changes', () => {
			render();

			fillCondition('30', '25');
			type(conditionField('value')!, '31');

			expect(conditionField('reset')!.value).toBe('25');
		});

		it('refuses a reset on the alert side, and puts the safe one in on request', async () => {
			services.rules.createRuleTemplate.mockResolvedValue(template());
			render({ preselectedDevEui: 'DEV-A' });
			type(byId<HTMLInputElement>('rule-form-name-input')!, 'Hot room');
			type(byId<HTMLInputElement>('rule-form-action-0-recipient-input')!, 'ops@example.com');

			fillCondition('30', '35');

			expect(submitButton().disabled).toBe(true);
			const warning = condition().querySelector('.cw-rule-condition__warning')!;
			expect(warning.textContent).toContain('35 °C');
			expect(warning.textContent).toContain('30 °C');

			click(warning.querySelector('button'));

			expect(conditionField('reset')!.value).toBe('28');
			expect(condition().querySelector('.cw-rule-condition__warning')).toBeNull();
			expect(submitButton().disabled).toBe(false);

			click(submitButton());
			await vi.waitFor(() => expect(goto).toHaveBeenCalledWith('/rules'));
			expect(services.rules.createRuleTemplate.mock.calls[0][0].criteria).toEqual([
				{ id: null, subject: 'temperature_c', operator: '>', triggerValue: 30, resetValue: 28 }
			]);
		});

		it('opens the guide on resets, in the language of the UI, in a new tab', () => {
			render();

			const help = condition().querySelector<HTMLAnchorElement>('.cw-help__mark')!;

			expect(help.getAttribute('href')).toBe(ruleResetHelpUrl());
			expect(help.target).toBe('_blank');
			expect(help.getAttribute('aria-label')).toContain(conditionText.resetHelp);
		});

		it('shows the unit of a reading that is not a temperature, and stores what is typed', async () => {
			services.rules.createRuleTemplate.mockResolvedValue(template());
			render({ preselectedDevEui: 'DEV-A' });
			type(byId<HTMLInputElement>('rule-form-name-input')!, 'Damp');
			type(byId<HTMLInputElement>('rule-form-action-0-recipient-input')!, 'ops@example.com');

			// A temperature may be typed in °F; nothing else may.
			expect(condition().querySelector('.cw-rule-condition__units')).not.toBeNull();
			choose('rule-form-criteria-0-subject-select', m.rule_subject_humidity());
			expect(condition().querySelector('.cw-rule-condition__units')).toBeNull();
			expect(condition().querySelector('.cw-rule-condition__unit')?.textContent).toBe('%');

			// No reset is suggested for it: the user types both.
			type(conditionField('value')!, '80');
			expect(conditionField('reset')!.value).toBe('');
			expect(submitButton().disabled).toBe(true);
			type(conditionField('reset')!, '75');

			click(submitButton());
			await vi.waitFor(() => expect(goto).toHaveBeenCalledWith('/rules'));
			expect(services.rules.createRuleTemplate.mock.calls[0][0].criteria).toEqual([
				{ id: null, subject: 'humidity', operator: '>', triggerValue: 80, resetValue: 75 }
			]);
		});

		it('stores a temperature typed in °F as °C', async () => {
			services.rules.createRuleTemplate.mockResolvedValue(template());
			render({ preselectedDevEui: 'DEV-A' });
			type(byId<HTMLInputElement>('rule-form-name-input')!, 'Hot room');
			type(byId<HTMLInputElement>('rule-form-action-0-recipient-input')!, 'ops@example.com');

			click(
				[...condition().querySelectorAll('.cw-rule-condition__unit-button')].find(
					(button) => button.textContent?.trim() === '°F'
				)
			);
			fillCondition('86', '77');

			click(submitButton());
			await vi.waitFor(() => expect(goto).toHaveBeenCalledWith('/rules'));
			expect(services.rules.createRuleTemplate.mock.calls[0][0].criteria).toEqual([
				{ id: null, subject: 'temperature_c', operator: '>', triggerValue: 30, resetValue: 25 }
			]);
		});

		it('adds a second limit to the same reading, for "too cold or too hot"', async () => {
			services.rules.createRuleTemplate.mockResolvedValue(template());
			render({ preselectedDevEui: 'DEV-A' });
			type(byId<HTMLInputElement>('rule-form-name-input')!, 'Cold or hot');
			type(byId<HTMLInputElement>('rule-form-action-0-recipient-input')!, 'ops@example.com');
			fillCondition('35', '33');

			click(condition().querySelector('.cw-rule-condition__add button'));

			// The second limit starts on the other side of the first.
			expect(conditionField<HTMLButtonElement>('condition', 1)!.textContent?.trim()).toBe(
				conditionText.opBelow
			);
			expect(condition().querySelector('.cw-rule-condition__or-pill')?.textContent).toBe(
				conditionText.orLabel
			);
			expect(submitButton().disabled).toBe(true);
			type(conditionField('value', 1)!, '5');
			expect(conditionField('reset', 1)!.value).toBe('7');

			click(submitButton());
			await vi.waitFor(() => expect(goto).toHaveBeenCalledWith('/rules'));
			expect(services.rules.createRuleTemplate.mock.calls[0][0].criteria).toEqual([
				{ id: null, subject: 'temperature_c', operator: '>', triggerValue: 35, resetValue: 33 },
				{ id: null, subject: 'temperature_c', operator: '<', triggerValue: 5, resetValue: 7 }
			]);
		});

		it('joins a condition on another reading with AND, and says all must be true', () => {
			render();
			expect(view!.target.querySelector('.rules-new-form__and')).toBeNull();
			expect(text()).toContain(m.rules_conditions_all_hint());

			click(byId('rule-form-add-criteria-button'));

			expect(view!.target.querySelector('.rules-new-form__and')?.textContent).toContain(
				m.rules_conditions_and()
			);
			expect(view!.target.querySelectorAll('.cw-rule-condition')).toHaveLength(2);
		});
	});
});

describe('RuleTemplateForm: sending again while the alarm continues', () => {
	const relay = (id: number, action: string) =>
		templateAction({
			id,
			actionType: 4,
			actionTypeName: 'LoRaWAN',
			actionTypeValue: 'lorawan',
			config: { recipient: JSON.stringify({ devEui: 'DEV-B', action, onTimeSeconds: 15 }) }
		});
	const repeatSwitch = (index: number) =>
		byId<HTMLInputElement>(`rule-form-action-${index}-repeat-switch`);
	const editing = (overrides: Partial<RuleTemplateDto> = {}) =>
		render({ mode: 'edit', context: context({ template: template(overrides) }) });

	it('shows only the switch until it is on; then the two numbers, the note, and a switch on each action', () => {
		editing();

		expect(byId<HTMLInputElement>('rule-form-resend-switch')?.checked).toBe(false);
		expect(text()).toContain(m.rules_resend_switch_description());
		expect(byId('rule-form-resend-every-input')).toBeNull();
		expect(byId('rule-form-resend-max-input')).toBeNull();
		expect(byId('rule-form-resend-note')).toBeNull();
		expect(repeatSwitch(0)).toBeNull();
		expect(byId('rule-form-resend-summary')).toBeNull();

		click(byId('rule-form-resend-switch'));

		expect(byId<HTMLInputElement>('rule-form-resend-every-input')?.value).toBe('3');
		expect(byId<HTMLInputElement>('rule-form-resend-max-input')?.value).toBe('5');
		expect(text()).toContain(m.rules_resend_every_hint());
		expect(text()).toContain(m.rules_resend_max_hint());
		expect(byId('rule-form-resend-note')?.textContent).toBe(m.rules_resend_note());
		// An e-mail is sent again unless that is switched off.
		expect(repeatSwitch(0)?.checked).toBe(true);
		expect(repeatSwitch(0)?.disabled).toBe(false);
		expect(byId('rule-form-resend-summary')?.textContent).toBe(
			m.rules_resend_summary({ reports: '3', times: '5' })
		);
	});

	it('opens a saved rule with its setting', () => {
		editing({
			resendAfterReports: 6,
			resendMax: 2,
			actions: [templateAction({ config: { recipient: 'ops@example.com', repeat: false } })]
		});

		expect(byId<HTMLInputElement>('rule-form-resend-switch')?.checked).toBe(true);
		expect(byId<HTMLInputElement>('rule-form-resend-every-input')?.value).toBe('6');
		expect(byId<HTMLInputElement>('rule-form-resend-max-input')?.value).toBe('2');
		expect(repeatSwitch(0)?.checked).toBe(false);
		// On, but nothing would be sent again: the form says so.
		expect(byId('rule-form-resend-nothing-notice')?.textContent).toBe(
			m.rules_resend_none_selected()
		);
	});

	it('saves the numbers and which actions are sent again', async () => {
		services.rules.updateRuleTemplate.mockResolvedValue(template());
		editing({ actions: [templateAction(), templateAction({ id: 32 })] });

		click(byId('rule-form-resend-switch'));
		type(byId<HTMLInputElement>('rule-form-resend-every-input')!, '4');
		type(byId<HTMLInputElement>('rule-form-resend-max-input')!, '9');
		click(repeatSwitch(1));
		expect(repeatSwitch(1)?.checked).toBe(false);
		expect(byId('rule-form-resend-nothing-notice')).toBeNull();
		expect(byId('rule-form-resend-summary')?.textContent).toBe(
			m.rules_resend_summary({ reports: '4', times: '9' })
		);

		click(submitButton());

		await vi.waitFor(() => expect(services.rules.updateRuleTemplate).toHaveBeenCalled());
		const payload = services.rules.updateRuleTemplate.mock.calls[0][1];
		expect(payload).toMatchObject({ resendAfterReports: 4, resendMax: 9 });
		expect(payload.actions.map((action) => action.config)).toEqual([
			{ recipient: 'ops@example.com', repeat: true },
			{ recipient: 'ops@example.com', repeat: false }
		]);
	});

	it('warns when the last action is switched to "not sent again", and the warning goes when one is back', () => {
		editing();
		click(byId('rule-form-resend-switch'));
		expect(byId('rule-form-resend-nothing-notice')).toBeNull();

		click(repeatSwitch(0));
		expect(byId('rule-form-resend-nothing-notice')).not.toBeNull();

		click(repeatSwitch(0));
		expect(byId('rule-form-resend-nothing-notice')).toBeNull();
	});

	it('says what is wrong with a number outside the limits, and does not save it', () => {
		editing();
		click(byId('rule-form-resend-switch'));
		expect(submitButton().disabled).toBe(false);

		type(byId<HTMLInputElement>('rule-form-resend-every-input')!, '2');
		expect(text()).toContain(m.rules_resend_every_error());
		expect(submitButton().disabled).toBe(true);

		type(byId<HTMLInputElement>('rule-form-resend-every-input')!, '3');
		type(byId<HTMLInputElement>('rule-form-resend-max-input')!, '51');
		expect(text()).not.toContain(m.rules_resend_every_error());
		expect(text()).toContain(m.rules_resend_max_error());
		expect(submitButton().disabled).toBe(true);

		// Switched off, the numbers are gone and the rule can be saved again.
		click(byId('rule-form-resend-switch'));
		expect(text()).not.toContain(m.rules_resend_max_error());
		expect(submitButton().disabled).toBe(false);
	});

	it('a relay is not sent again unless asked, and a fixed on/off command cannot be', async () => {
		services.rules.updateRuleTemplate.mockResolvedValue(template());
		editing({ actions: [relay(31, 'ro1_on_timed'), relay(32, 'ro1_on_permanent')] });
		click(byId('rule-form-resend-switch'));

		expect(repeatSwitch(0)?.checked).toBe(false);
		expect(repeatSwitch(0)?.disabled).toBe(false);
		expect(text()).toContain(m.rules_resend_action_relay_hint());
		expect(repeatSwitch(1)?.checked).toBe(false);
		expect(repeatSwitch(1)?.disabled).toBe(true);
		expect(text()).toContain(m.rules_resend_action_relay_fixed());
		// Neither relay repeats yet.
		expect(byId('rule-form-resend-nothing-notice')).not.toBeNull();

		click(repeatSwitch(0));
		expect(byId('rule-form-resend-nothing-notice')).toBeNull();
		click(submitButton());

		await vi.waitFor(() => expect(services.rules.updateRuleTemplate).toHaveBeenCalled());
		const { actions } = services.rules.updateRuleTemplate.mock.calls[0][1];
		expect(actions.map((action) => (action.config as { repeat?: boolean }).repeat)).toEqual([
			true,
			false
		]);
	});

	it('a Date/Time rule has no re-send setting', () => {
		render({
			context: context({
				actionTypes: [...ACTION_TYPES, { id: 6, name: 'RuleActivate', value: null, createdAt: '' }],
				ruleOptions: [{ id: 12, name: 'Winter', orgId: 'org-a', triggerKind: 'sensor' }],
				canManageDateTimeRules: true
			})
		});
		click(byId('rule-form-resend-switch'));
		expect(byId('rule-form-resend-every-input')).not.toBeNull();

		choose('rule-form-criteria-0-subject-select', m.rule_subject_date_time());

		expect(byId('rule-form-resend')).toBeNull();
		expect(byId('rule-form-resend-switch')).toBeNull();
		expect(repeatSwitch(0)).toBeNull();
	});
});
