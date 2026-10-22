import { flushSync, tick } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
	DeviceDto,
	LocationDto,
	RuleActionTypeDto,
	RuleFormContextDto,
	RuleTemplateActionDto,
	RuleTemplateDto
} from '$lib/api/api.dtos';
import { m } from '$lib/paraglide/messages.js';
import { createMockServices, type MockServices } from '$lib/testing/mock-services';
import { renderWithServices } from '$lib/testing/render';
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

/** The `<input>` whose label starts with `label` (the alert-point fields add a unit). */
function inputLabelled(label: string, within: ParentNode = view!.target) {
	const element = [...within.querySelectorAll('label')].find((candidate) =>
		candidate.textContent?.trim().startsWith(label)
	);
	return document.getElementById(element!.htmlFor) as HTMLInputElement;
}

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

/** Types the first condition's trigger and reset values. */
function fillCondition(trigger = '8', reset = '6') {
	type(inputLabelled(m.rules_trigger_value()), trigger);
	type(inputLabelled(m.rules_reset_value()), reset);
}

/** Picks the first condition's comparison in the alert-points editor. */
function chooseCondition(label: string) {
	const trigger = inputLabelled(m.rules_operator());
	click(trigger);
	const option = [...trigger.closest('.cw-dropdown')!.querySelectorAll('li[role="option"]')].find(
		(candidate) => candidate.textContent?.trim() === label
	);
	if (!option) throw new Error(`No condition "${label}"`);
	click(option);
}

/** The "revert on reset" checkboxes of the relay actions, found through their labels. */
const revertCheckboxes = () =>
	[...view!.target.querySelectorAll('label')]
		.filter((label) => label.textContent?.trim() === m.rule_action_revert_on_reset())
		.map((label) => document.getElementById(label.htmlFor) as HTMLInputElement | null);

beforeEach(() => {
	services = createMockServices();
	services.line.getLineRecipientCandidates.mockResolvedValue([]);
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
		expect(services.line.getLineRecipientCandidates).not.toHaveBeenCalled();
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

	it('looks up LINE and push recipients for the chosen devices', async () => {
		render();

		choose('rule-form-devices-multiselect', 'Freezer A (DEV-A)');

		await vi.waitFor(() =>
			expect(services.line.getLineRecipientCandidates).toHaveBeenCalledWith(['DEV-A'])
		);
		expect(services.push.getPushRecipientCandidates).toHaveBeenCalledWith(['DEV-A']);

		choose('rule-form-devices-multiselect', 'Relay B (DEV-B)');

		await vi.waitFor(() =>
			expect(services.line.getLineRecipientCandidates).toHaveBeenLastCalledWith(['DEV-A', 'DEV-B'])
		);
		expect(services.push.getPushRecipientCandidates).toHaveBeenLastCalledWith(['DEV-A', 'DEV-B']);
	});

	it('looks nothing up without a session', async () => {
		render({ preselectedDevEui: 'DEV-A' }, null);
		await tick();

		expect(services.line.getLineRecipientCandidates).not.toHaveBeenCalled();
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
			isActive: true,
			devEuis: ['DEV-A'],
			criteria: [
				{ id: 21, subject: 'temperature_c', operator: '>', triggerValue: 8, resetValue: 6 }
			],
			actions: [{ id: 31, actionType: 1, config: { recipient: 'ops@example.com' } }]
		});
		expect(view!.toasts()[0]?.message).toBe(m.rules_new_updated_success({ name: 'Cold room' }));
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

		choose('rule-form-action-0-type-select', 'LINE');
		expect(byId('rule-form-action-0-recipient-input')).toBeNull();
		expect(byId('rule-form-action-0-line-recipients')).not.toBeNull();

		choose('rule-form-action-0-type-select', 'Push');
		expect(byId('rule-form-action-0-line-recipients')).toBeNull();
		expect(byId('rule-form-action-0-push-recipients')).not.toBeNull();

		choose('rule-form-action-0-type-select', 'LoRaWAN');
		expect(byId('rule-form-action-0-push-recipients')).toBeNull();
		expect(revertCheckboxes()).toEqual([expect.any(HTMLInputElement)]);
	});

	it('gives each relay action its own "revert on reset" checkbox', () => {
		render();
		choose('rule-form-action-0-type-select', 'LoRaWAN');
		click(byId('rule-form-add-action-button'));
		choose('rule-form-action-1-type-select', 'LoRaWAN');

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
			equals: m.reports_create_alert_points_condition_equals()
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

		chooseCondition(m.reports_create_alert_points_condition_greater_than());

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

	it('sends LINE alerts to the chosen recipients', async () => {
		services.line.getLineRecipientCandidates.mockResolvedValue([
			{ userId: 'u-1', displayName: 'Ada', lineLinked: true },
			{ userId: 'u-2', displayName: 'Grace', lineLinked: false }
		]);
		services.rules.updateRuleTemplate.mockResolvedValue(template());
		render({ mode: 'edit', context: context({ template: template() }) });
		choose('rule-form-action-0-type-select', 'LINE');
		expect(submitButton().disabled).toBe(true);

		await vi.waitFor(() => {
			click(byId('rule-form-action-0-line-recipients'));
			const picker = byId('rule-form-action-0-line-recipients')!.closest('.cw-multiselect')!;
			expect(
				[...picker.querySelectorAll('li[role="option"]')].map((option) =>
					option.textContent?.trim()
				)
			).toEqual(['Ada', `Grace（${m.line_recipient_not_linked()}）`]);
		});
		choose('rule-form-action-0-line-recipients', 'Ada');
		expect(submitButton().disabled).toBe(false);

		click(byId('rule-form-advanced-show-button'));
		expect(text()).toContain('LINE: Ada');
		expect(byId('rule-form-advanced-show-button')).toBeNull();
		click(byId('rule-form-advanced-hide-button'));
		expect(text()).not.toContain('LINE: Ada');

		click(submitButton());

		await vi.waitFor(() => expect(services.rules.updateRuleTemplate).toHaveBeenCalled());
		expect(services.rules.updateRuleTemplate.mock.calls[0][1].actions).toEqual([
			{ id: 31, actionType: 2, config: { recipient: JSON.stringify({ userIds: ['u-1'] }) } }
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

		choose('rule-form-action-0-type-select', 'LoRaWAN');
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
});
