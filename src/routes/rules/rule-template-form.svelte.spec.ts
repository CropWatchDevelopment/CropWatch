import { flushSync } from 'svelte';
import { describe, expect, it, vi } from 'vitest';
import type { CwToastOptions } from '@cropwatchdevelopment/cwui';
import { ApiError } from '#lib/api/api-error.ts';
import type {
	DeviceDto,
	LocationDto,
	PushRecipientCandidateDto,
	RuleActionTypeDto,
	RuleFormContextDto,
	RuleTemplateActionDto,
	RuleTemplateAssignmentDto,
	RuleTemplateCriterionDto,
	RuleTemplateDto
} from '#lib/api/api.dtos.ts';
import { m } from '#lib/paraglide/messages.js';
import { labelFor } from '#lib/sensor-labels/index.ts';
import { createMockServices } from '#lib/testing/mock-services.ts';
import { fromInstant } from './rule-auto-dates.ts';
import { DATE_TIME_SUBJECT, describeSchedule } from './rule-schedule-text.ts';
import {
	RuleTemplateFormController,
	type EditableTemplateAction,
	type RuleTemplateFormOptions
} from './rule-template-form.svelte';

const EMAIL: RuleActionTypeDto = { id: 1, name: 'EMail', value: 'email', createdAt: '' };
const LINE: RuleActionTypeDto = { id: 2, name: 'LINE', value: 'line', createdAt: '' };
const PUSH: RuleActionTypeDto = { id: 3, name: 'Push', value: 'push', createdAt: '' };
const LORAWAN: RuleActionTypeDto = { id: 4, name: 'LoRaWAN', value: null, createdAt: '' };

function device(devEui: string, overrides: Partial<DeviceDto> = {}): DeviceDto {
	return {
		dev_eui: devEui,
		name: `Sensor ${devEui}`,
		location_id: 10,
		type: 5,
		...overrides
	} as DeviceDto;
}

function location(locationId: number, name: unknown): LocationDto {
	return { location_id: locationId, name, created_at: '' } as LocationDto;
}

function context(overrides: Partial<RuleFormContextDto> = {}): RuleFormContextDto {
	return {
		devices: [device('DEV-A', { name: 'Freezer A' }), device('DEV-B', { name: 'Freezer B' })],
		locations: [location(10, 'North barn')],
		actionTypes: [EMAIL, LINE, PUSH, LORAWAN],
		template: null,
		...overrides
	};
}

function assignment(devEui: string): RuleTemplateAssignmentDto {
	return {
		id: 1,
		devEui,
		templateId: 7,
		isActive: true,
		createdAt: null,
		deviceName: null,
		locationName: null,
		permissionLevel: null,
		state: null
	};
}

function criterion(overrides: Partial<RuleTemplateCriterionDto> = {}): RuleTemplateCriterionDto {
	return {
		id: 21,
		templateId: 7,
		subject: 'temperature_c',
		operator: '>',
		triggerValue: 8,
		resetValue: 6,
		createdAt: null,
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
		description: 'Keep it cold',
		deviceTypeId: 5,
		isActive: false,
		createdAt: null,
		assignments: [assignment('DEV-A')],
		criteria: [criterion()],
		actions: [templateAction()],
		...overrides
	};
}

const push = (
	userId: string,
	displayName: string,
	pushEnabled = true
): PushRecipientCandidateDto => ({
	userId,
	displayName,
	pushEnabled
});

function setup(overrides: Partial<RuleTemplateFormOptions> = {}) {
	const services = createMockServices();
	const toast = { add: vi.fn<(toast: CwToastOptions) => string>(() => 'toast-id') };
	const goto = vi.fn<(href: string) => Promise<void>>(async () => {});
	const formContext = context();
	const form = new RuleTemplateFormController({
		mode: () => 'create',
		context: () => formContext,
		preselectedDevEui: null,
		currentUserId: null,
		currentUserName: null,
		rules: services.rules,
		push: services.push,
		accessToken: () => 'jwt-token',
		toast,
		goto,
		...overrides
	});
	return { form, services, toast, goto };
}

function editSetup(
	templateOverrides: Partial<RuleTemplateDto> = {},
	extra: Partial<RuleTemplateFormOptions> = {}
) {
	const formContext = context({ template: template(templateOverrides) });
	return setup({ mode: () => 'edit', context: () => formContext, ...extra });
}

/** Completes the blank create form: a name, a device and the condition's values. */
function fillIn(form: RuleTemplateFormController) {
	form.ruleName = '  Cold room ';
	form.selectedDevices = [{ id: 'DEV-A', label: 'Freezer A (DEV-A)' }];
	const point = form.criteriaGroups[0].alertPoints.points[0];
	point.value = '8';
	point.reset = '6';
	form.templateActions[0].config.recipient = ' ops@example.com ';
}

function deferred<T>() {
	let resolve!: (value: T) => void;
	let reject!: (reason: unknown) => void;
	const promise = new Promise<T>((res, rej) => {
		resolve = res;
		reject = rej;
	});
	return { promise, resolve, reject };
}

/** Lets pending promise callbacks run. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

/** The fetched (base) options: what an action without saved recipients is offered. */
const basePushOptions = (form: RuleTemplateFormController) =>
	form.pushRecipientOptionsFor({ pushRecipients: [] } as unknown as EditableTemplateAction);

describe('RuleTemplateFormController — a new rule', () => {
	it('starts blank, active, with one empty condition and a blank action of the first type', () => {
		const { form } = setup();

		expect(form.ruleName).toBe('');
		expect(form.description).toBe('');
		expect(form.isActive).toBe(true);
		expect(form.submitting).toBe(false);
		expect(form.showAdvanced).toBe(false);
		expect(form.selectedDevices).toEqual([]);
		expect(form.criteriaGroups).toHaveLength(1);
		expect(form.criteriaGroups[0]).toMatchObject({ localId: 1, subject: 'temperature_c' });
		expect(form.nextCriteriaGroupId).toBe(2);
		expect(form.templateActions).toEqual([
			{
				id: 0,
				templateId: 0,
				actionType: 1,
				actionTypeName: 'EMail',
				actionTypeValue: 'email',
				config: { recipient: '' },
				pushRecipients: [],
				createdAt: null
			}
		]);
		expect(form.isFormValid).toBe(false);
	});

	it('defaults to a Push action addressed to the creator', () => {
		const { form } = setup({ currentUserId: 'user-1', currentUserName: 'Ada' });

		expect(form.templateActions).toEqual([
			{
				id: 0,
				templateId: 0,
				actionType: 3,
				actionTypeName: 'Push',
				actionTypeValue: 'push',
				config: { recipient: JSON.stringify({ userIds: ['user-1'] }) },
				pushRecipients: [{ id: 'user-1', label: 'Ada' }],
				createdAt: null
			}
		]);
	});

	it('labels the preselected creator by id until a name is known', () => {
		const { form } = setup({ currentUserId: 'user-1', currentUserName: '' });

		expect(form.templateActions[0].pushRecipients).toEqual([{ id: 'user-1', label: 'user-1' }]);
	});

	it('uses a Push type without a value', () => {
		const formContext = context({ actionTypes: [EMAIL, { ...PUSH, value: undefined }] });
		const { form } = setup({ context: () => formContext, currentUserId: 'user-1' });

		expect(form.templateActions[0]).toMatchObject({ actionType: 3, actionTypeValue: null });
	});

	it('falls back to a blank action of the first offered type while the server has no Push action type', () => {
		const formContext = context({ actionTypes: [LINE, EMAIL] });
		const { form } = setup({ context: () => formContext, currentUserId: 'user-1' });

		// LINE is listed first, but it is no longer offered.
		expect(form.templateActions[0]).toMatchObject({
			actionType: 1,
			actionTypeName: 'EMail',
			pushRecipients: []
		});
	});

	it('has an action without a type when the server lists no action types', () => {
		const formContext = context({ actionTypes: [] });
		const { form } = setup({ context: () => formContext });

		expect(form.templateActions[0]).toMatchObject({
			actionType: 0,
			actionTypeName: null,
			actionTypeValue: null
		});
		expect(form.actionTypeOptionsFor(form.templateActions[0])).toEqual([]);
	});

	it('preselects the device it was opened for', () => {
		const { form } = setup({ preselectedDevEui: 'DEV-B' });

		expect(form.selectedDevices).toEqual([{ id: 'DEV-B', label: 'Freezer B (DEV-B)' }]);
	});

	it('keeps a preselected device the user cannot see, by its EUI', () => {
		const { form } = setup({ preselectedDevEui: 'DEV-GONE' });

		expect(form.selectedDevices).toEqual([{ id: 'DEV-GONE', label: 'DEV-GONE' }]);
		expect(form.deviceOptions[0]).toEqual({ label: 'DEV-GONE', value: 'DEV-GONE' });
	});
});

describe('RuleTemplateFormController — editing a rule', () => {
	it('starts from the saved template', () => {
		const { form } = editSetup({
			assignments: [
				assignment(' DEV-B '),
				assignment('DEV-A'),
				assignment('DEV-B'),
				assignment('  ')
			]
		});

		expect(form.ruleName).toBe('Cold room');
		expect(form.description).toBe('Keep it cold');
		expect(form.isActive).toBe(false);
		// Trimmed, de-duplicated, blanks dropped.
		expect(form.selectedDevices).toEqual([
			{ id: 'DEV-B', label: 'Freezer B (DEV-B)' },
			{ id: 'DEV-A', label: 'Freezer A (DEV-A)' }
		]);
		expect(form.criteriaGroups).toHaveLength(1);
		expect(form.criteriaGroups[0].alertPoints.points[0]).toMatchObject({
			id: 'criterion-21',
			condition: 'greaterThan',
			value: '8',
			reset: '6'
		});
		expect(form.nextCriteriaGroupId).toBe(2);
		expect(form.templateActions).toEqual([
			{
				...templateAction(),
				config: { recipient: 'ops@example.com' },
				pushRecipients: []
			}
		]);
		expect(form.isFormValid).toBe(true);
	});

	it('groups saved conditions by data field', () => {
		const { form } = editSetup({
			criteria: [
				criterion({ id: 1, subject: 'humidity' }),
				criterion({ id: 2, subject: 'temperature_c' }),
				criterion({ id: 3, subject: 'humidity', operator: '<' })
			]
		});

		expect(form.criteriaGroups.map((group) => group.subject)).toEqual([
			'humidity',
			'temperature_c'
		]);
		expect(form.criteriaGroups[0].alertPoints.points).toHaveLength(2);
		expect(form.nextCriteriaGroupId).toBe(3);
	});

	it('has no description and no devices when the template has none', () => {
		const { form } = editSetup({ description: null, assignments: [] });

		expect(form.description).toBe('');
		expect(form.selectedDevices).toEqual([]);
	});

	it('reads the recipient from the legacy config keys', () => {
		const { form } = editSetup({
			actions: [
				templateAction({
					id: 1,
					config: { recipient: '  ', action_recipient: 'legacy@example.com' }
				}),
				templateAction({ id: 2, config: { to: 'to@example.com', cc: 'keep-me' } }),
				templateAction({ id: 3, config: 'not-an-object' }),
				templateAction({ id: 4, config: ['a', 'b'] }),
				templateAction({ id: 5, config: null }),
				templateAction({ id: 6, config: { recipient: 42 } })
			]
		});

		expect(form.templateActions.map((action) => action.config)).toEqual([
			{ recipient: 'legacy@example.com', action_recipient: 'legacy@example.com' },
			{ to: 'to@example.com', cc: 'keep-me', recipient: 'to@example.com' },
			{ recipient: '' },
			{ recipient: '' },
			{ recipient: '' },
			{ recipient: '' }
		]);
	});

	it('restores Push recipients from the saved user ids', () => {
		const recipient = JSON.stringify({ userIds: ['u-1', '', 7, 'u-2'] });
		const { form } = editSetup({
			actions: [
				templateAction({ id: 1, actionType: 3, actionTypeName: 'Push', config: { recipient } }),
				templateAction({ id: 2 })
			]
		});

		expect(form.templateActions[0].pushRecipients).toEqual([
			{ id: 'u-1', label: 'u-1' },
			{ id: 'u-2', label: 'u-2' }
		]);
		expect(form.templateActions[1].pushRecipients).toEqual([]);
	});

	it.each([
		['the legacy sentinel', 'linked-users'],
		['JSON without user ids', JSON.stringify({ users: ['u-1'] })],
		['user ids that are not a list', JSON.stringify({ userIds: 'u-1' })],
		['JSON null', 'null']
	])('asks for a fresh Push recipient choice for %s', (_label, recipient) => {
		const { form } = editSetup({
			actions: [templateAction({ actionType: 3, actionTypeName: 'Push', config: { recipient } })]
		});

		expect(form.templateActions[0].pushRecipients).toEqual([]);
		expect(form.isFormValid).toBe(false);
	});

	it('keeps a saved LINE action as it is, so saving does not change it', () => {
		const recipient = JSON.stringify({ userIds: ['u-1'] });
		const { form } = editSetup({
			actions: [templateAction({ actionType: 2, actionTypeName: 'LINE', config: { recipient } })]
		});

		expect(form.templateActions[0]).toMatchObject({
			actionTypeName: 'LINE',
			config: { recipient },
			pushRecipients: []
		});
	});

	it('starts with a blank action, not the creator Push action, when the template has no actions', () => {
		const { form } = editSetup({ actions: [] }, { currentUserId: 'user-1' });

		expect(form.templateActions).toEqual([
			expect.objectContaining({ id: 0, templateId: 7, actionType: 1, pushRecipients: [] })
		]);
	});

	it('gives added actions the template id', () => {
		const { form } = editSetup();

		expect(form.createBlankTemplateAction()).toMatchObject({ id: 0, templateId: 7, actionType: 1 });
	});
});

describe('RuleTemplateFormController — devices', () => {
	it('offers every device, grouped by location, with saved devices the list lacks first', () => {
		const formContext = context({
			devices: [
				device('DEV-A', { name: 'Freezer A', location_id: 10 }),
				device('DEV-B', { name: '', location_id: 11 }),
				device('DEV-C', { name: 'Loose', location_id: null }),
				device('DEV-D', { name: 'Back', location_id: 12 }),
				device('DEV-E', { name: 'Also north', location_id: 10 })
			],
			locations: [location(10, ' North barn '), location(11, 'Annex'), location(12, '  ')]
		});
		const { form } = setup({ context: () => formContext });
		form.selectedDevices = [
			{ id: 'DEV-A', label: 'Freezer A (DEV-A)' },
			{ id: 'DEV-OLD', label: '' },
			{ id: 'DEV-GONE', label: 'Gone sensor' }
		];

		expect(form.deviceOptions).toEqual([
			{ label: 'DEV-OLD', value: 'DEV-OLD' },
			{ label: 'Gone sensor', value: 'DEV-GONE' },
			{ label: 'Freezer A (DEV-A)', value: 'DEV-A', group: 10 },
			{ label: 'DEV-B', value: 'DEV-B', group: 11 },
			{ label: 'Loose (DEV-C)', value: 'DEV-C', group: undefined },
			{ label: 'Back (DEV-D)', value: 'DEV-D', group: 12 },
			{ label: 'Also north (DEV-E)', value: 'DEV-E', group: 10 }
		]);
		// Sorted by name; a location without a name gets a numbered one.
		expect(form.deviceGroups).toEqual(
			[
				{ value: 11, label: 'Annex' },
				{ value: 12, label: m.locations_location_with_id({ id: '12' }) },
				{ value: 10, label: 'North barn' }
			].sort((a, b) => a.label.localeCompare(b.label))
		);
	});

	it('names a location the context does not list by its id', () => {
		const formContext = context({ locations: [location(99, 'Elsewhere'), location(10, 42)] });
		const { form } = setup({ context: () => formContext });

		expect(form.deviceGroups).toEqual([
			{ value: 10, label: m.locations_location_with_id({ id: '10' }) }
		]);
	});

	it('has no options without devices', () => {
		const formContext = context({ devices: [] });
		const { form } = setup({ context: () => formContext });

		expect(form.deviceOptions).toEqual([]);
		expect(form.deviceGroups).toEqual([]);
	});

	it('copes with a form context without a device list', async () => {
		const formContext = context({ devices: undefined as never });
		const { form, services } = setup({ context: () => formContext, preselectedDevEui: 'DEV-A' });
		services.rules.createRuleTemplate.mockResolvedValue(template());

		// The preselected device is labelled by its EUI.
		expect(form.selectedDevices).toEqual([{ id: 'DEV-A', label: 'DEV-A' }]);
		expect(form.deviceOptions).toEqual([{ label: 'DEV-A', value: 'DEV-A' }]);
		expect(form.assignmentSummary).toBe('DEV-A');

		fillIn(form);
		form.selectedDevices = [{ id: 'DEV-A', label: '' }];
		await form.handleSubmit();

		expect(services.rules.createRuleTemplate.mock.calls[0][0]).toMatchObject({
			devEuis: ['DEV-A'],
			deviceTypeId: null
		});
	});

	it('follows the context prop', () => {
		let formContext = $state(context({ devices: [device('DEV-A', { name: 'Freezer A' })] }));
		const { form } = setup({ context: () => formContext });
		expect(form.deviceOptions.map((option) => option.value)).toEqual(['DEV-A']);

		formContext = context({ devices: [device('DEV-Z', { name: 'Zed', location_id: 10 })] });

		expect(form.deviceOptions).toEqual([{ label: 'Zed (DEV-Z)', value: 'DEV-Z', group: 10 }]);
	});

	it('summarises the selected devices, labelling unnamed selections from the device list', () => {
		const { form } = setup();
		form.selectedDevices = [
			{ id: 'DEV-A', label: '' },
			{ id: 'DEV-B', label: 'Custom label' },
			{ id: 'DEV-X', label: '' }
		];

		expect(form.assignmentSummary).toBe('Freezer A (DEV-A), Custom label, DEV-X');
	});
});

describe('RuleTemplateFormController — push recipients', () => {
	it('loads nothing until a device is selected, or without a session', () => {
		const { form, services } = setup();
		form.syncPushRecipients();

		const { form: signedOut, services: signedOutServices } = setup({
			accessToken: () => null,
			preselectedDevEui: 'DEV-A'
		});
		signedOut.syncPushRecipients();

		expect(services.push.getPushRecipientCandidates).not.toHaveBeenCalled();
		expect(signedOutServices.push.getPushRecipientCandidates).not.toHaveBeenCalled();
		expect(basePushOptions(form)).toEqual([]);
	});

	it('lists every candidate and disables the ones without push', async () => {
		const { form, services } = setup({ preselectedDevEui: 'DEV-A' });
		services.push.getPushRecipientCandidates.mockResolvedValue([
			push('u-1', 'Ada'),
			push('u-2', 'Grace', false)
		]);

		form.syncPushRecipients();
		form.syncPushRecipients();

		expect(services.push.getPushRecipientCandidates).toHaveBeenCalledTimes(1);
		expect(services.push.getPushRecipientCandidates).toHaveBeenCalledWith(['DEV-A']);
		await vi.waitFor(() =>
			expect(basePushOptions(form)).toEqual([
				{ value: 'u-1', label: 'Ada', disabled: false },
				{ value: 'u-2', label: `Grace（${m.push_recipient_not_enabled()}）`, disabled: true }
			])
		);
	});

	it('flags an unsubscribed creator on a new rule, and drops them once someone is chosen', async () => {
		const { form, services } = setup({
			preselectedDevEui: 'DEV-A',
			currentUserId: 'me',
			currentUserName: 'Me'
		});
		services.push.getPushRecipientCandidates.mockResolvedValue([
			push('me', 'Me myself', false),
			push('u-1', 'Ada')
		]);
		const action = form.templateActions[0];

		expect(form.pushRecipientError(action)).toBeUndefined();

		form.syncPushRecipients();

		await vi.waitFor(() =>
			expect(form.pushRecipientError(action)).toBe(
				m.push_recipient_not_subscribed_error({ names: 'Me myself' })
			)
		);
		// The creator chip shows the name now known.
		expect(action.pushRecipients).toEqual([{ id: 'me', label: 'Me' }]);
		expect(form.pushRecipientOptionsFor(action)[0]).toEqual({
			value: 'me',
			label: `Me myself（${m.push_recipient_not_enabled()}）`,
			disabled: true
		});

		form.setPushRecipients(action, [
			{ id: 'me', label: 'Me' },
			{ id: 'u-1', label: 'Ada' }
		]);

		expect(action.pushRecipients).toEqual([{ id: 'u-1', label: 'Ada' }]);
		expect(action.config.recipient).toBe(JSON.stringify({ userIds: ['u-1'] }));
		expect(form.pushRecipientError(action)).toBeUndefined();
	});

	it('names an unsubscribed recipient by its label when the lookup did not name them', async () => {
		const { form, services } = setup({ preselectedDevEui: 'DEV-A' });
		services.push.getPushRecipientCandidates
			.mockResolvedValueOnce([push('u-2', 'Grace', false)])
			.mockResolvedValueOnce([push('u-1', 'Ada')]);
		form.syncPushRecipients();
		await vi.waitFor(() => expect(basePushOptions(form)).toHaveLength(1));
		const action = form.templateActions[0];
		action.pushRecipients = [{ id: 'u-2', label: 'Grace (saved)' }];

		// Another selection: Grace is no longer a candidate, but still unsubscribed.
		form.selectedDevices = [{ id: 'DEV-B', label: '' }];
		form.syncPushRecipients();
		await vi.waitFor(() =>
			expect(basePushOptions(form)).toEqual([{ value: 'u-1', label: 'Ada', disabled: false }])
		);

		expect(form.pushRecipientError(action)).toBe(
			m.push_recipient_not_subscribed_error({ names: 'Grace (saved)' })
		);
	});

	it('remembers that a user turned push on again', async () => {
		const { form, services } = setup({ preselectedDevEui: 'DEV-A' });
		services.push.getPushRecipientCandidates
			.mockResolvedValueOnce([push('u-1', 'Ada', false)])
			.mockResolvedValueOnce([push('u-1', 'Ada', true)]);
		const action = form.templateActions[0];
		form.syncPushRecipients();
		await vi.waitFor(() => expect(basePushOptions(form)[0]).toMatchObject({ disabled: true }));

		form.selectedDevices = [{ id: 'DEV-B', label: '' }];
		form.syncPushRecipients();
		await vi.waitFor(() => expect(basePushOptions(form)[0]).toMatchObject({ disabled: false }));

		form.setPushRecipients(action, [{ id: 'u-1', label: 'Ada' }]);
		expect(action.pushRecipients).toEqual([{ id: 'u-1', label: 'Ada' }]);
	});

	it('keeps every saved recipient of an existing rule', async () => {
		const { form, services } = editSetup({
			actions: [
				templateAction({
					actionType: 3,
					actionTypeName: 'Push',
					config: { recipient: JSON.stringify({ userIds: ['u-2'] }) }
				}),
				templateAction({ id: 32 })
			]
		});
		services.push.getPushRecipientCandidates.mockResolvedValue([push('u-2', 'Grace', false)]);
		const action = form.templateActions[0];

		form.syncPushRecipients();
		await vi.waitFor(() => expect(action.pushRecipients[0].label).toBe('Grace'));

		expect(form.pushRecipientError(action)).toBeUndefined();
		form.setPushRecipients(action, [{ id: 'u-2', label: 'Grace' }]);
		expect(action.pushRecipients).toEqual([{ id: 'u-2', label: 'Grace' }]);
		expect(form.isFormValid).toBe(true);
	});

	it('requires a push recipient once a device is chosen', () => {
		const { form } = setup();
		const action = form.templateActions[0];
		form.selectActionType(action, '3');

		expect(form.pushRecipientError(action)).toBeUndefined();

		form.selectedDevices = [{ id: 'DEV-A', label: '' }];
		expect(form.pushRecipientError(action)).toBe(m.push_recipient_required_error());

		form.setPushRecipients(action, []);
		expect(action.config.recipient).toBe('');
	});

	it('ignores stale and failed lookups', async () => {
		const { form, services } = setup();
		const first = deferred<PushRecipientCandidateDto[]>();
		services.push.getPushRecipientCandidates
			.mockReturnValueOnce(first.promise)
			.mockResolvedValueOnce([push('u-2', 'Newest')]);

		form.selectedDevices = [{ id: 'DEV-A', label: '' }];
		form.syncPushRecipients();
		form.selectedDevices = [{ id: 'DEV-B', label: '' }];
		form.syncPushRecipients();
		await vi.waitFor(() => expect(basePushOptions(form)).toHaveLength(1));

		first.resolve([push('u-1', 'Stale')]);
		await settle();
		expect(basePushOptions(form)).toEqual([{ value: 'u-2', label: 'Newest', disabled: false }]);

		const stale = deferred<PushRecipientCandidateDto[]>();
		services.push.getPushRecipientCandidates
			.mockReturnValueOnce(stale.promise)
			.mockRejectedValueOnce(new Error('down'));
		form.selectedDevices = [{ id: 'DEV-A', label: '' }];
		form.syncPushRecipients();
		form.selectedDevices = [];
		form.syncPushRecipients();
		expect(basePushOptions(form)).toEqual([]);
		form.selectedDevices = [{ id: 'DEV-B', label: '' }];
		form.syncPushRecipients();
		await settle();
		expect(basePushOptions(form)).toEqual([]);

		stale.reject(new Error('stale'));
		await settle();
		expect(basePushOptions(form)).toEqual([]);
	});
});

describe('RuleTemplateFormController — action types', () => {
	it('offers the valid action types', () => {
		const formContext = context({
			actionTypes: [EMAIL, { ...LINE, id: 0 }, { ...PUSH, id: 2.5 }, LORAWAN]
		});
		const { form } = setup({ context: () => formContext });

		expect(form.actionTypeOptionsFor(form.templateActions[0])).toEqual([
			{ label: m.rules_action_type_email(), value: '1' },
			{ label: m.rules_action_type_relay(), value: '4' }
		]);
	});

	it('no longer offers LINE, but shows a saved LINE action under its own name', () => {
		const { form } = editSetup({
			actions: [
				templateAction({ id: 1 }),
				templateAction({ id: 2, actionType: 2, actionTypeName: 'LINE' })
			]
		});
		const offered = [
			{ label: m.rules_action_type_email(), value: '1' },
			{ label: m.rules_action_type_push(), value: '3' },
			{ label: m.rules_action_type_relay(), value: '4' }
		];

		expect(form.actionTypeOptionsFor(form.templateActions[0])).toEqual(offered);
		expect(form.actionTypeOptionsFor(form.templateActions[1])).toEqual([
			{ label: 'LINE', value: '2' },
			...offered
		]);
	});

	it("keeps a saved action's type selectable when the server no longer lists it", () => {
		const { form } = editSetup({
			actions: [
				templateAction({ id: 1, actionType: 9, actionTypeName: 'SMS', actionTypeValue: 'sms' }),
				templateAction({ id: 2, actionType: 8, actionTypeName: null, actionTypeValue: 'fax' }),
				templateAction({ id: 3, actionType: 6, actionTypeName: null, actionTypeValue: null })
			]
		});
		const base = [
			{ label: m.rules_action_type_email(), value: '1' },
			{ label: m.rules_action_type_push(), value: '3' },
			{ label: m.rules_action_type_relay(), value: '4' }
		];

		expect(form.actionTypeOptionsFor(form.templateActions[0])).toEqual([
			{ label: 'SMS', value: '9' },
			...base
		]);
		expect(form.actionTypeOptionsFor(form.templateActions[1])[0]).toEqual({
			label: 'fax',
			value: '8'
		});
		expect(form.actionTypeOptionsFor(form.templateActions[2])[0]).toEqual({
			label: '6',
			value: '6'
		});
	});

	it('switching away from Push clears the recipients', () => {
		const { form } = setup({ currentUserId: 'me' });
		const action = form.templateActions[0];
		expect(action.actionTypeName).toBe('Push');

		form.selectActionType(action, '1');

		expect(action).toMatchObject({
			actionType: 1,
			actionTypeName: 'EMail',
			pushRecipients: [],
			config: { recipient: '' }
		});
	});

	it('switching a saved LINE action to another type clears its LINE recipients', () => {
		const recipient = JSON.stringify({ userIds: ['u-1'] });
		const { form } = editSetup({
			actions: [templateAction({ actionType: 2, actionTypeName: 'LINE', config: { recipient } })]
		});
		const action = form.templateActions[0];

		form.selectActionType(action, '1');

		expect(action).toMatchObject({
			actionType: 1,
			actionTypeName: 'EMail',
			config: { recipient: '' }
		});
	});

	it('keeps the recipient when switching between other types', () => {
		const { form } = setup();
		const action = form.templateActions[0];
		action.config.recipient = 'ops@example.com';

		form.selectActionType(action, '4');

		expect(action).toMatchObject({
			actionType: 4,
			actionTypeName: 'LoRaWAN',
			actionTypeValue: null,
			config: { recipient: 'ops@example.com' }
		});
	});

	it('records an unknown type by its number, and a non-number as no type', () => {
		const { form } = setup();
		const action = form.templateActions[0];

		form.selectActionType(action, '77');
		expect(action).toMatchObject({ actionType: 77, actionTypeName: null, actionTypeValue: null });

		form.selectActionType(action, 'abc');
		expect(action.actionType).toBe(0);
	});
});

describe('RuleTemplateFormController — validity and summary', () => {
	it('is valid once named, assigned, with complete conditions and actions', () => {
		const { form } = setup();
		fillIn(form);

		expect(form.isFormValid).toBe(true);
	});

	it.each([
		['the name is blank', (form: RuleTemplateFormController) => (form.ruleName = '   ')],
		['no device is selected', (form: RuleTemplateFormController) => (form.selectedDevices = [])],
		[
			'a selected device id is blank',
			(form: RuleTemplateFormController) => (form.selectedDevices = [{ id: '  ', label: 'x' }])
		],
		[
			'a condition has no value',
			(form: RuleTemplateFormController) =>
				(form.criteriaGroups[0].alertPoints.points[0].value = '')
		],
		[
			'a condition is a range',
			(form: RuleTemplateFormController) =>
				(form.criteriaGroups[0].alertPoints.points[0].condition = 'range')
		],
		['there are no conditions', (form: RuleTemplateFormController) => (form.criteriaGroups = [])],
		[
			'an action has no type',
			(form: RuleTemplateFormController) => (form.templateActions[0].actionType = 0)
		],
		[
			'an action has no recipient',
			(form: RuleTemplateFormController) => (form.templateActions[0].config.recipient = '  ')
		],
		[
			'a Push action has no push recipients',
			(form: RuleTemplateFormController) => {
				form.templateActions[0].actionTypeName = 'Push';
			}
		]
	])('is not valid when %s', (_label, breakIt) => {
		const { form } = setup();
		fillIn(form);

		breakIt(form);

		expect(form.isFormValid).toBe(false);
	});

	it('flags a range condition as unsupported', () => {
		const { form } = setup();
		expect(form.hasUnsupportedCriteria).toBe(false);

		form.criteriaGroups[0].alertPoints.points[0].condition = 'range';

		expect(form.hasUnsupportedCriteria).toBe(true);
	});

	it('is not valid when a Push recipient has push turned off', async () => {
		const { form, services } = setup({ currentUserId: 'me', currentUserName: 'Me' });
		fillIn(form);
		form.templateActions[0].config.recipient = JSON.stringify({ userIds: ['me'] });
		expect(form.isFormValid).toBe(true);
		services.push.getPushRecipientCandidates.mockResolvedValue([push('me', 'Me', false)]);

		form.syncPushRecipients();

		await vi.waitFor(() => expect(form.isFormValid).toBe(false));
	});

	it('describes the conditions', () => {
		const { form } = setup();
		fillIn(form);
		form.criteriaGroups.push({
			localId: 2,
			subject: 'battery_level',
			alertPoints: {
				unit: 'C',
				center: '0',
				points: [
					{
						id: 'a',
						name: 'x',
						color: '#000000',
						condition: 'lessThanOrEqual',
						value: '3',
						min: '',
						max: '',
						reset: ''
					},
					{
						id: 'b',
						name: 'y',
						color: '#000000',
						condition: 'range',
						value: '',
						min: '1',
						max: '2',
						reset: '4'
					}
				]
			}
		});
		form.criteriaGroups.push({
			localId: 3,
			subject: 'mystery_field',
			alertPoints: {
				unit: 'C',
				center: '0',
				points: [
					{
						id: 'c',
						name: 'z',
						color: '#000000',
						condition: 'equals',
						value: '1',
						min: '',
						max: '',
						reset: '0'
					}
				]
			}
		});

		const reset = m.rules_reset_value();
		expect(form.criteriaSummary).toBe(
			[
				`${m.rule_subject_temperature()} ${m.rule_operator_greater_than()} 8 (${reset}: 6)`,
				`${labelFor('battery_level').label()} ${m.rule_operator_less_or_equal()} 3 (${reset}: 0)`,
				`${labelFor('battery_level').label()} range 1 (${reset}: 4)`,
				`mystery_field ${m.rule_operator_equal_to()} 1 (${reset}: 0)`
			].join(', ')
		);
	});

	it('describes the actions and their recipients', () => {
		const { form } = editSetup({
			actions: [
				templateAction({ id: 1 }),
				templateAction({
					id: 4,
					actionType: 3,
					actionTypeName: 'Push',
					config: { recipient: JSON.stringify({ userIds: ['u-3'] }) }
				}),
				templateAction({ id: 5, actionType: 3, actionTypeName: 'Push', config: { recipient: '' } }),
				templateAction({
					id: 6,
					actionType: 9,
					actionTypeName: 'SMS',
					config: { recipient: '555' }
				}),
				templateAction({
					id: 7,
					actionType: 8,
					actionTypeName: null,
					actionTypeValue: 'fax',
					config: { to: '123' }
				}),
				templateAction({
					id: 8,
					actionType: 6,
					actionTypeName: null,
					actionTypeValue: null,
					config: {}
				})
			]
		});

		expect(form.actionSummary).toBe(
			[
				`${m.rules_action_type_email()}: ops@example.com`,
				`${m.rules_action_type_push()}: u-3`,
				`${m.rules_action_type_push()}: ${m.push_recipient_preview_count({ count: '0' })}`,
				// A type this app does not know keeps its database name.
				'SMS: 555',
				'fax: 123',
				'6: '
			].join(', ')
		);
	});

	it('names push recipients in the summary once known', async () => {
		const { form, services } = editSetup({
			actions: [
				templateAction({
					id: 4,
					actionType: 3,
					actionTypeName: 'Push',
					config: { recipient: JSON.stringify({ userIds: ['u-3'] }) }
				})
			]
		});
		services.push.getPushRecipientCandidates.mockResolvedValue([push('u-3', 'Grace')]);

		form.syncPushRecipients();

		await vi.waitFor(() => expect(form.actionSummary).toBe(`${m.rules_action_type_push()}: Grace`));
	});
});

describe('RuleTemplateFormController — saving', () => {
	it('does nothing while the form is incomplete', async () => {
		const { form, services, toast } = setup();

		await form.handleSubmit();

		expect(services.rules.createRuleTemplate).not.toHaveBeenCalled();
		expect(toast.add).not.toHaveBeenCalled();
		expect(form.submitting).toBe(false);
	});

	it('creates the rule, confirms it and goes back to the rules list', async () => {
		const { form, services, toast, goto } = setup();
		services.rules.createRuleTemplate.mockResolvedValue(template());
		fillIn(form);
		form.description = '  ';
		form.isActive = false;

		await form.handleSubmit();

		expect(services.rules.createRuleTemplate).toHaveBeenCalledWith({
			name: 'Cold room',
			description: null,
			deviceTypeId: 5,
			isActive: false,
			devEuis: ['DEV-A'],
			criteria: [
				{ id: null, subject: 'temperature_c', operator: '>', triggerValue: 8, resetValue: 6 }
			],
			actions: [{ id: null, actionType: 1, config: { recipient: 'ops@example.com' } }]
		});
		expect(services.rules.updateRuleTemplate).not.toHaveBeenCalled();
		expect(toast.add).toHaveBeenCalledWith({
			tone: 'success',
			message: m.rules_new_created_success({ name: 'Cold room' }),
			duration: 4000,
			dismissible: true
		});
		expect(goto).toHaveBeenCalledWith('/rules');
		expect(form.submitting).toBe(false);
	});

	it('shows the save as in progress and ignores a second submit meanwhile', async () => {
		const { form, services } = setup();
		const save = deferred<RuleTemplateDto>();
		services.rules.createRuleTemplate.mockReturnValue(save.promise);
		fillIn(form);

		const first = form.handleSubmit();
		expect(form.submitting).toBe(true);
		await form.handleSubmit();
		expect(services.rules.createRuleTemplate).toHaveBeenCalledTimes(1);

		save.resolve(template());
		await first;
		expect(form.submitting).toBe(false);
	});

	it('updates the edited rule, keeping saved ids and extra action settings', async () => {
		const { form, services, toast, goto } = editSetup({
			description: ' Keep it cold ',
			assignments: [assignment('DEV-A'), assignment('DEV-B')],
			actions: [
				templateAction({
					id: 31,
					config: { recipient: ' ops@example.com ', cc: 'boss@example.com' }
				})
			]
		});
		services.rules.updateRuleTemplate.mockResolvedValue(template());
		form.ruleName = 'Colder room ';

		await form.handleSubmit();

		expect(services.rules.updateRuleTemplate).toHaveBeenCalledWith(7, {
			name: 'Colder room',
			description: 'Keep it cold',
			deviceTypeId: 5,
			// The status was not touched, so it is not sent: the API keeps it.
			devEuis: ['DEV-A', 'DEV-B'],
			criteria: [
				{ id: 21, subject: 'temperature_c', operator: '>', triggerValue: 8, resetValue: 6 }
			],
			actions: [
				{ id: 31, actionType: 1, config: { recipient: 'ops@example.com', cc: 'boss@example.com' } }
			]
		});
		expect(services.rules.createRuleTemplate).not.toHaveBeenCalled();
		expect(toast.add).toHaveBeenCalledWith({
			tone: 'success',
			message: m.rules_new_updated_success({ name: 'Colder room' }),
			duration: 4000,
			dismissible: true
		});
		expect(goto).toHaveBeenCalledWith('/rules');
	});

	it('creates rather than updates in edit mode without a template', async () => {
		const { form, services } = setup({ mode: () => 'edit' });
		services.rules.createRuleTemplate.mockResolvedValue(template());
		fillIn(form);

		await form.handleSubmit();

		expect(services.rules.createRuleTemplate).toHaveBeenCalledTimes(1);
		expect(services.rules.updateRuleTemplate).not.toHaveBeenCalled();
	});

	it.each([
		['one device type', [device('DEV-A', { type: 5 }), device('DEV-B', { type: 5 })], 5],
		['mixed device types', [device('DEV-A', { type: 5 }), device('DEV-B', { type: 6 })], null],
		[
			'no device type',
			[device('DEV-A', { type: null }), device('DEV-B', { type: undefined })],
			null
		],
		[
			'a non-finite device type',
			[device('DEV-A', { type: Number.NaN }), device('DEV-B', { type: 5 })],
			5
		]
	])('sends the device type for %s', async (_label, devices, deviceTypeId) => {
		const formContext = context({ devices });
		const { form, services } = setup({ context: () => formContext });
		services.rules.createRuleTemplate.mockResolvedValue(template());
		fillIn(form);
		form.selectedDevices = [
			{ id: 'DEV-A', label: '' },
			{ id: 'DEV-B', label: '' },
			{ id: 'DEV-UNKNOWN', label: '' }
		];

		await form.handleSubmit();

		expect(services.rules.createRuleTemplate.mock.calls[0][0]).toMatchObject({ deviceTypeId });
	});

	it("shows the API's message when the save fails, and stays on the form", async () => {
		const { form, services, toast, goto } = setup();
		services.rules.createRuleTemplate.mockRejectedValue(
			new ApiError(409, 'Conflict', {
				url: 'https://api.cropwatch.test/rules',
				payload: { message: 'A rule with this name exists' }
			})
		);
		fillIn(form);

		await form.handleSubmit();

		expect(toast.add).toHaveBeenCalledWith({
			tone: 'danger',
			message: 'A rule with this name exists',
			duration: 5000,
			dismissible: true
		});
		expect(goto).not.toHaveBeenCalled();
		expect(form.submitting).toBe(false);
	});

	it.each([
		// Only the API's own message is shown; anything else gets the translated fallback.
		[
			'an API error without a message',
			new ApiError(500, 'Internal Server Error', {
				url: 'https://api.cropwatch.test/rules',
				payload: null
			})
		],
		['a network failure', new TypeError('Failed to fetch')],
		['a value without a message', {}]
	])('reports %s with the generic message', async (_label, failure) => {
		const { form, services, toast } = setup();
		services.rules.createRuleTemplate.mockRejectedValue(failure);
		fillIn(form);

		await form.handleSubmit();

		expect(toast.add).toHaveBeenCalledWith(
			expect.objectContaining({ tone: 'danger', message: m.rules_new_save_failed() })
		);
	});

	it('does not report a failed navigation after a successful save as a failed save', async () => {
		const { form, services, toast, goto } = setup();
		services.rules.createRuleTemplate.mockResolvedValue(template());
		const navigationError = new Error('Navigation aborted');
		goto.mockRejectedValue(navigationError);
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
		fillIn(form);

		try {
			await form.handleSubmit();

			expect(toast.add.mock.calls.map(([added]) => added.tone)).toEqual(['success']);
			expect(consoleError).toHaveBeenCalledWith(
				'Failed to open the rules list after saving:',
				navigationError
			);
			expect(form.submitting).toBe(false);
		} finally {
			consoleError.mockRestore();
		}
	});

	it('keeps a "not equal" condition when the rule is saved unchanged', async () => {
		const { form, services } = editSetup({
			criteria: [criterion({ id: 21, operator: '!=', triggerValue: 0, resetValue: 1 })]
		});
		services.rules.updateRuleTemplate.mockResolvedValue(template());
		expect(form.criteriaSummary).toBe(
			`${m.rule_subject_temperature()} ${m.rule_operator_not_equal()} 0 (${m.rules_reset_value()}: 1)`
		);

		await form.handleSubmit();

		expect(services.rules.updateRuleTemplate.mock.calls[0][1].criteria).toEqual([
			{ id: 21, subject: 'temperature_c', operator: '!=', triggerValue: 0, resetValue: 1 }
		]);
	});
});

describe('RuleTemplateFormController — reactive wiring', () => {
	it('refetches the recipients when run in effects and the device selection changes', async () => {
		const { form, services } = setup({ preselectedDevEui: 'DEV-A' });
		services.push.getPushRecipientCandidates.mockResolvedValue([]);
		const cleanup = $effect.root(() => {
			$effect(() => {
				form.syncPushRecipients();
			});
		});

		try {
			flushSync();
			expect(services.push.getPushRecipientCandidates).toHaveBeenLastCalledWith(['DEV-A']);

			form.selectedDevices.push({ id: 'DEV-B', label: '' });
			flushSync();
			expect(services.push.getPushRecipientCandidates).toHaveBeenLastCalledWith(['DEV-A', 'DEV-B']);

			// Renaming the rule does not refetch.
			form.ruleName = 'Cold room';
			flushSync();
			expect(services.push.getPushRecipientCandidates).toHaveBeenCalledTimes(2);
		} finally {
			cleanup();
		}
	});
});

describe('RuleTemplateFormController — status, dates and the rule to start', () => {
	// Far from "now" on purpose, so the tests do not depend on the clock.
	const PAST = '2001-01-01T00:00:00.000Z';
	const START = '2099-03-01T00:30:00.000Z';
	const PAUSE = '2099-09-01T15:00:00.000Z';
	const lastSave = (mock: { mock: { calls: unknown[][] } }) =>
		mock.mock.calls.at(-1)?.at(-1) as Record<string, unknown>;

	it('a new rule sends its status, and no dates or rule to start when none are chosen', async () => {
		const { form, services } = setup();
		services.rules.createRuleTemplate.mockResolvedValue(template());
		fillIn(form);

		await form.handleSubmit();

		const payload = lastSave(services.rules.createRuleTemplate);
		expect(payload.isActive).toBe(true);
		// Fields an older API would refuse stay out unless they are used.
		expect(payload).not.toHaveProperty('autoStartAt');
		expect(payload).not.toHaveProperty('autoPauseAt');
		expect(payload).not.toHaveProperty('onAutoPauseStartTemplateId');
		expect(form.autoStartAt).toBeNull();
		expect(form.autoPauseAt).toBeNull();
	});

	it('a new rule sends the chosen dates as instants, and the rule to start', async () => {
		const formContext = context({ ruleOptions: [{ id: 12, name: 'Winter' }] });
		const { form, services } = setup({ context: () => formContext });
		services.rules.createRuleTemplate.mockResolvedValue(template());
		fillIn(form);
		form.isActive = false;
		form.autoStart = fromInstant(START);
		form.autoPause = fromInstant(PAUSE);
		form.chainRuleId = '12';
		flushSync();

		expect(form.isFormValid).toBe(true);
		await form.handleSubmit();

		expect(lastSave(services.rules.createRuleTemplate)).toMatchObject({
			isActive: false,
			autoStartAt: START,
			autoPauseAt: PAUSE,
			onAutoPauseStartTemplateId: 12
		});
		expect(form.chainRuleName).toBe('Winter');
	});

	it('reads the picker in the browser time zone: date and time of day make one instant', () => {
		const { form } = setup();
		form.autoStart = { date: new Date(2099, 2, 1), time: { hours: 9, minutes: 30 } };
		flushSync();

		expect(form.autoStartAt).toBe(new Date(2099, 2, 1, 9, 30).toISOString());
		expect(form.timeZone).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone);
	});

	it('an edit sends nothing about status or dates the user left alone', async () => {
		const { form, services } = editSetup({
			isActive: true,
			// Saved with seconds: the picker only knows minutes, and that is not a change.
			autoStartAt: '2001-01-01T00:00:42.000Z',
			autoPauseAt: PAUSE,
			onAutoPauseStartTemplateId: 12
		});
		services.rules.updateRuleTemplate.mockResolvedValue(template());
		expect(form.chainRuleId).toBe('12');
		// A date that has just passed is the scheduler's business, not an error.
		expect(form.autoStartError).toBeUndefined();
		expect(form.isFormValid).toBe(true);

		await form.handleSubmit();

		const payload = lastSave(services.rules.updateRuleTemplate);
		expect(payload).not.toHaveProperty('isActive');
		expect(payload).not.toHaveProperty('autoStartAt');
		expect(payload).not.toHaveProperty('autoPauseAt');
		expect(payload).not.toHaveProperty('onAutoPauseStartTemplateId');
	});

	it('an edit sends exactly what changed', async () => {
		const { form, services } = editSetup({
			isActive: true,
			autoStartAt: START,
			autoPauseAt: PAUSE,
			onAutoPauseStartTemplateId: 12
		});
		services.rules.updateRuleTemplate.mockResolvedValue(template());

		form.isActive = false;
		form.autoStart = undefined;
		form.chainRuleId = '';
		flushSync();
		await form.handleSubmit();

		const payload = lastSave(services.rules.updateRuleTemplate);
		expect(payload).toMatchObject({
			isActive: false,
			autoStartAt: null,
			onAutoPauseStartTemplateId: null
		});
		expect(payload).not.toHaveProperty('autoPauseAt');
	});

	it('clearing the pause date also lets go of the rule to start', async () => {
		const { form, services } = editSetup({ autoPauseAt: PAUSE, onAutoPauseStartTemplateId: 12 });
		services.rules.updateRuleTemplate.mockResolvedValue(template());

		form.autoPause = undefined;
		flushSync();
		expect(form.chainRuleName).toBe('');
		await form.handleSubmit();

		expect(lastSave(services.rules.updateRuleTemplate)).toMatchObject({
			autoPauseAt: null,
			onAutoPauseStartTemplateId: null
		});
	});

	it('a rule to start chosen without a pause date is not sent', async () => {
		const { form, services } = setup();
		services.rules.createRuleTemplate.mockResolvedValue(template());
		fillIn(form);
		form.chainRuleId = '12';
		flushSync();

		await form.handleSubmit();

		expect(lastSave(services.rules.createRuleTemplate)).not.toHaveProperty(
			'onAutoPauseStartTemplateId'
		);
	});

	it('refuses a newly chosen date in the past, and saves nothing', async () => {
		const { form, services } = setup();
		fillIn(form);
		expect(form.isFormValid).toBe(true);

		form.autoStart = fromInstant(PAST);
		flushSync();
		expect(form.autoStartError).toBe(m.rules_auto_error_past());
		expect(form.isFormValid).toBe(false);
		await form.handleSubmit();
		expect(services.rules.createRuleTemplate).not.toHaveBeenCalled();

		form.autoStart = undefined;
		form.autoPause = fromInstant(PAST);
		flushSync();
		expect(form.autoStartError).toBeUndefined();
		expect(form.autoPauseError).toBe(m.rules_auto_error_past());
		expect(form.isFormValid).toBe(false);
	});

	it('refuses a start date and a pause date at the same moment', () => {
		const { form } = setup();
		fillIn(form);
		form.autoStart = fromInstant(START);
		form.autoPause = fromInstant(START);
		flushSync();

		expect(form.autoPauseError).toBe(m.rules_auto_error_same());
		expect(form.autoStartError).toBeUndefined();
		expect(form.isFormValid).toBe(false);

		form.autoPause = fromInstant(PAUSE);
		flushSync();
		expect(form.autoPauseError).toBeUndefined();
		expect(form.isFormValid).toBe(true);
	});

	it('warns when a start date cannot do anything because the rule is running', () => {
		const { form } = setup();
		expect(form.startDateNeedsPause).toBe(false);

		form.autoStart = fromInstant(START);
		flushSync();
		expect(form.startDateNeedsPause).toBe(true);

		// Running until the pause date, which comes after the start date: still nothing to start.
		form.autoPause = fromInstant(PAUSE);
		flushSync();
		expect(form.startDateNeedsPause).toBe(true);

		// Pause first, start again later: the start date has work to do.
		form.autoStart = fromInstant(PAUSE);
		form.autoPause = fromInstant(START);
		flushSync();
		expect(form.startDateNeedsPause).toBe(false);

		form.autoPause = undefined;
		form.isActive = false;
		flushSync();
		expect(form.startDateNeedsPause).toBe(false);
	});

	it('offers the rules of the form context, never the rule itself', () => {
		const formContext = context({
			template: template({ id: 7 }),
			ruleOptions: [
				{ id: 7, name: 'Cold room' },
				{ id: 12, name: 'Winter' },
				{ id: 13, name: null }
			]
		});
		const { form } = setup({ mode: () => 'edit', context: () => formContext });

		expect(form.chainOptions).toEqual([
			{ label: m.rules_auto_then_none(), value: '' },
			{ label: 'Winter', value: '12' },
			{ label: m.rules_auto_then_unknown({ id: '13' }), value: '13' }
		]);
		expect(form.chainRuleId).toBe('');
	});

	it('keeps a saved rule to start visible when it is no longer on offer', () => {
		const { form } = editSetup({ autoPauseAt: PAUSE, onAutoPauseStartTemplateId: 99 });

		// An API without ruleOptions: only "No rule" and the saved one.
		expect(form.chainOptions).toEqual([
			{ label: m.rules_auto_then_none(), value: '' },
			{ label: m.rules_auto_then_unknown({ id: '99' }), value: '99' }
		]);
		expect(form.chainRuleName).toBe(m.rules_auto_then_unknown({ id: '99' }));
	});
});

describe('RuleTemplateFormController — Date/Time rules and rule switches', () => {
	const RULE_ON: RuleActionTypeDto = { id: 6, name: 'RuleActivate', value: null, createdAt: '' };
	const RULE_OFF: RuleActionTypeDto = { id: 7, name: 'RuleDeactivate', value: null, createdAt: '' };
	const RULE_OFF_SELF: RuleActionTypeDto = {
		id: 8,
		name: 'RuleDeactivateSelf',
		value: null,
		createdAt: ''
	};
	const ALL_TYPES = [EMAIL, LINE, PUSH, LORAWAN, RULE_ON, RULE_OFF, RULE_OFF_SELF];
	const RULES = [
		{ id: 7, name: 'Cold room', orgId: 'org-a', triggerKind: 'sensor' as const },
		{ id: 12, name: 'Winter', orgId: 'org-a', triggerKind: 'sensor' as const },
		{ id: 13, name: null, orgId: 'org-a', triggerKind: 'schedule' as const }
	];
	const lastSave = (mock: { mock: { calls: unknown[][] } }) =>
		mock.mock.calls.at(-1)?.at(-1) as Record<string, unknown>;

	function dateTimeSetup(overrides: Partial<RuleFormContextDto> = {}) {
		const formContext = context({
			actionTypes: ALL_TYPES,
			ruleOptions: RULES,
			canManageDateTimeRules: true,
			...overrides
		});
		return setup({ context: () => formContext });
	}

	function editDateTime(templateOverrides: Partial<RuleTemplateDto> = {}) {
		const formContext = context({
			actionTypes: ALL_TYPES,
			ruleOptions: RULES,
			canManageDateTimeRules: true,
			template: template({
				triggerKind: 'schedule',
				orgId: 'org-a',
				deviceTypeId: null,
				assignments: [],
				criteria: [],
				schedule: {
					timeOfDay: '18:30',
					daysOfWeek: [6, 7],
					timezone: 'America/New_York',
					nextFireAt: '2099-01-03T23:30:00.000Z',
					lastFiredAt: null
				},
				actions: [
					templateAction({
						id: 41,
						actionType: 6,
						actionTypeName: 'RuleActivate',
						actionTypeValue: null,
						config: { recipient: '12', targetTemplateId: 12 }
					})
				],
				...templateOverrides
			})
		});
		return setup({ mode: () => 'edit', context: () => formContext });
	}

	it('offers "Date/Time" as a data field to those who may manage such rules, for a new rule with one condition', () => {
		const dateTime = { label: m.rule_subject_date_time(), value: DATE_TIME_SUBJECT };

		const allowed = dateTimeSetup().form;
		expect(allowed.firstSubjectOptions).toEqual([...allowed.subjectOptions, dateTime]);
		// The other conditions never offer it.
		expect(allowed.subjectOptions).not.toContainEqual(dateTime);

		const notAllowed = dateTimeSetup({ canManageDateTimeRules: false }).form;
		expect(notAllowed.firstSubjectOptions).toEqual(notAllowed.subjectOptions);
		// An API that does not say: no.
		expect(setup().form.firstSubjectOptions).not.toContainEqual(dateTime);

		// A sensor rule that exists stays a sensor rule.
		const formContext = context({ canManageDateTimeRules: true, template: template() });
		const editing = setup({ mode: () => 'edit', context: () => formContext }).form;
		expect(editing.firstSubjectOptions).not.toContainEqual(dateTime);
		// And a Date/Time rule stays one.
		expect(editDateTime().form.firstSubjectOptions).toEqual([dateTime]);
	});

	it('stops offering it once the rule has a second condition', () => {
		const { form } = dateTimeSetup();
		form.criteriaGroups.push({ ...form.criteriaGroups[0], localId: 99 });
		flushSync();

		expect(form.firstSubjectOptions).toEqual(form.subjectOptions);
	});

	it('choosing it turns the rule into a Date/Time rule: no devices, one condition, only actions such a rule can run', () => {
		const { form } = dateTimeSetup();
		form.selectedDevices = [{ id: 'DEV-A', label: 'Freezer A (DEV-A)' }];
		form.templateActions.push({
			...form.createBlankTemplateAction(),
			actionType: 4,
			actionTypeName: 'LoRaWAN'
		});
		expect(form.isDateTime).toBe(false);
		expect(form.templateActions.map((action) => action.actionTypeName)).toEqual([
			'EMail',
			'LoRaWAN'
		]);

		form.selectSubject(0, DATE_TIME_SUBJECT);
		flushSync();

		expect(form.isDateTime).toBe(true);
		expect(form.selectedDevices).toEqual([]);
		expect(form.criteriaGroups).toHaveLength(1);
		// The e-mail action goes; the relay stays.
		expect(form.templateActions.map((action) => action.actionTypeName)).toEqual(['LoRaWAN']);
		expect(form.assignmentSummary).toBe(m.rules_dt_no_devices());
	});

	it('gives a Date/Time rule a blank switch action when none of its actions can stay', () => {
		const { form } = dateTimeSetup();

		form.selectSubject(0, DATE_TIME_SUBJECT);
		flushSync();

		// LoRaWAN is the first type on offer for a Date/Time rule in this list.
		expect(form.templateActions).toHaveLength(1);
		expect(form.templateActions[0]).toMatchObject({
			id: 0,
			actionTypeName: 'LoRaWAN',
			config: { recipient: '' }
		});
		expect(form.actionTypeOptionsFor(form.templateActions[0])).toEqual([
			{ label: m.rules_action_type_relay(), value: '4' },
			{ label: m.rules_action_type_rule_activate(), value: '6' },
			{ label: m.rules_action_type_rule_deactivate(), value: '7' },
			{ label: m.rules_action_type_rule_deactivate_self(), value: '8' }
		]);
	});

	it('choosing a sensor field, or a field of another condition, changes nothing else', () => {
		const { form } = dateTimeSetup();
		form.selectedDevices = [{ id: 'DEV-A', label: 'Freezer A (DEV-A)' }];

		form.selectSubject(0, 'humidity');
		form.selectSubject(5, DATE_TIME_SUBJECT);
		flushSync();

		expect(form.criteriaGroups[0].subject).toBe('humidity');
		expect(form.isDateTime).toBe(false);
		expect(form.selectedDevices).toHaveLength(1);
		expect(form.templateActions[0].actionTypeName).toBe('EMail');
	});

	it('starts a new Date/Time rule at 09:00 every day in the browser time zone', () => {
		const { form } = dateTimeSetup();
		form.selectSubject(0, DATE_TIME_SUBJECT);
		flushSync();

		expect(form.schedule).toEqual({
			timeOfDay: '09:00',
			daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
			timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
		});
		expect(form.weekdayOptions.map((option) => option.value)).toEqual([
			'1',
			'2',
			'3',
			'4',
			'5',
			'6',
			'7'
		]);
		expect(form.weekdayOptions[0].label).toBe(m.common_day_monday());
		expect(form.criteriaSummary).toBe(describeSchedule(form.schedule));
	});

	it('keeps the time zone in use selectable even when it is not one of the listed cities', () => {
		const { form } = dateTimeSetup();
		form.scheduleTimezone = 'Asia/Tokyo';
		flushSync();
		const listed = form.timezoneOptions.length;
		expect(form.timezoneOptions.some((option) => option.value === 'Asia/Tokyo')).toBe(true);

		form.scheduleTimezone = 'Europe/Berlin';
		flushSync();
		expect(form.timezoneOptions).toHaveLength(listed + 1);
		expect(form.timezoneOptions[0]).toEqual({ label: 'Europe/Berlin', value: 'Europe/Berlin' });

		form.scheduleTimezone = '';
		flushSync();
		expect(form.timezoneOptions).toHaveLength(listed);
	});

	it('is valid with a name, a day, a zone and a complete action; devices are not needed', () => {
		const { form } = dateTimeSetup();
		form.selectSubject(0, DATE_TIME_SUBJECT);
		form.ruleName = 'Every morning';
		form.selectActionType(form.templateActions[0], '6');
		flushSync();
		// The switch action still needs its rule.
		expect(form.isFormValid).toBe(false);

		form.setSwitchTarget(form.templateActions[0], '12');
		flushSync();
		expect(form.isFormValid).toBe(true);
		expect(form.scheduleDaysError).toBeUndefined();

		form.scheduleDays = [];
		flushSync();
		expect(form.isFormValid).toBe(false);
		expect(form.scheduleDaysError).toBe(m.rules_dt_days_required());

		form.scheduleDays = [{ id: '1', label: 'Monday' }];
		form.scheduleTimezone = '';
		flushSync();
		expect(form.isFormValid).toBe(false);

		form.scheduleTimezone = 'Asia/Tokyo';
		form.templateActions = [];
		flushSync();
		expect(form.isFormValid).toBe(false);
	});

	it('saves a Date/Time rule with its schedule and without devices or conditions', async () => {
		const { form, services } = dateTimeSetup();
		services.rules.createRuleTemplate.mockResolvedValue(template());
		form.selectSubject(0, DATE_TIME_SUBJECT);
		form.ruleName = ' Every morning ';
		form.scheduleTime = { hours: 6, minutes: 5 };
		form.scheduleDays = [
			{ id: '5', label: 'Friday' },
			{ id: '1', label: 'Monday' }
		];
		form.scheduleTimezone = 'Asia/Tokyo';
		form.selectActionType(form.templateActions[0], '7');
		form.setSwitchTarget(form.templateActions[0], '12');
		form.templateActions.push(form.createBlankTemplateAction());
		form.selectActionType(form.templateActions[1], '8');
		flushSync();

		await form.handleSubmit();

		expect(lastSave(services.rules.createRuleTemplate)).toEqual({
			name: 'Every morning',
			description: null,
			isActive: true,
			deviceTypeId: null,
			triggerKind: 'schedule',
			schedule: { timeOfDay: '06:05', daysOfWeek: [1, 5], timezone: 'Asia/Tokyo' },
			devEuis: [],
			criteria: [],
			actions: [
				{ id: null, actionType: 7, config: { recipient: '12', targetTemplateId: 12 } },
				{ id: null, actionType: 8, config: { recipient: 'self' } }
			]
		});
	});

	it('does not send a rule kind for a sensor rule: an older API does not know the field', async () => {
		const { form, services } = dateTimeSetup();
		services.rules.createRuleTemplate.mockResolvedValue(template());
		fillIn(form);

		await form.handleSubmit();

		const payload = lastSave(services.rules.createRuleTemplate);
		expect(payload).not.toHaveProperty('triggerKind');
		expect(payload).not.toHaveProperty('schedule');
		expect(payload.devEuis).toEqual(['DEV-A']);
	});

	it('opens a saved Date/Time rule with its schedule and its target', async () => {
		const { form, services } = editDateTime();
		services.rules.updateRuleTemplate.mockResolvedValue(template());

		expect(form.isDateTime).toBe(true);
		expect(form.criteriaGroups).toHaveLength(1);
		expect(form.scheduleTime).toEqual({ hours: 18, minutes: 30 });
		expect(form.scheduleDays.map((day) => day.id)).toEqual(['6', '7']);
		expect(form.scheduleDays[0].label).toBe(m.common_day_saturday());
		expect(form.scheduleTimezone).toBe('America/New_York');
		expect(form.switchTargetValue(form.templateActions[0])).toBe('12');
		expect(form.isFormValid).toBe(true);
		expect(form.criteriaSummary).toBe(
			describeSchedule({ timeOfDay: '18:30', daysOfWeek: [6, 7], timezone: 'America/New_York' })
		);
		expect(form.actionSummary).toBe(`${m.rules_action_type_rule_activate()}: Winter`);

		await form.handleSubmit();

		expect(lastSave(services.rules.updateRuleTemplate)).toMatchObject({
			triggerKind: 'schedule',
			schedule: { timeOfDay: '18:30', daysOfWeek: [6, 7], timezone: 'America/New_York' },
			devEuis: [],
			criteria: [],
			actions: [{ id: 41, actionType: 6, config: { recipient: '12', targetTemplateId: 12 } }]
		});
	});

	it('opens a Date/Time rule that lost its schedule with the defaults, so it can be repaired', () => {
		const { form } = editDateTime({ schedule: null });

		expect(form.isDateTime).toBe(true);
		expect(form.schedule.timeOfDay).toBe('09:00');
		expect(form.schedule.daysOfWeek).toHaveLength(7);
	});

	it('does not accept a notification on a saved Date/Time rule', () => {
		const { form } = editDateTime({ actions: [templateAction()] });

		expect(form.isFormValid).toBe(false);
		// It stays visible under its name, so it can be changed or removed.
		expect(form.actionTypeOptionsFor(form.templateActions[0])[0]).toEqual({
			label: m.rules_action_type_email(),
			value: '1'
		});
	});

	it('offers the rules of the form context as targets, never the rule itself', () => {
		const { form } = editDateTime();
		const action = form.templateActions[0];

		expect(form.switchTargetOptionsFor(action)).toEqual([
			{ label: 'Winter', value: '12' },
			{ label: m.rules_auto_then_unknown({ id: '13' }), value: '13' }
		]);

		// A saved target that is no longer on offer stays visible.
		form.setSwitchTarget(action, '99');
		expect(form.switchTargetOptionsFor(action)[0]).toEqual({
			label: m.rules_auto_then_unknown({ id: '99' }),
			value: '99'
		});
		expect(form.actionSummary).toBe(
			`${m.rules_action_type_rule_activate()}: ${m.rules_auto_then_unknown({ id: '99' })}`
		);
	});

	it('has no targets with an API that sends no rule options', () => {
		const { form } = setup();
		expect(form.switchTargetOptionsFor(form.templateActions[0])).toEqual([]);
	});

	it('sets and clears the target of a switch action', () => {
		const { form } = dateTimeSetup();
		const action = form.templateActions[0];
		form.selectActionType(action, '6');

		form.setSwitchTarget(action, '12');
		expect(action.config).toEqual({ recipient: '12', targetTemplateId: 12 });
		expect(form.switchTargetValue(action)).toBe('12');

		for (const nothing of ['', '0', 'abc', '-3', '1.5']) {
			form.setSwitchTarget(action, '12');
			form.setSwitchTarget(action, nothing);
			expect(action.config).toEqual({ recipient: '' });
			expect(form.switchTargetValue(action)).toBe('');
		}
	});

	it('resets the setting when the action changes kind, but keeps the rule between activate and deactivate', () => {
		const { form } = dateTimeSetup();
		const action = form.templateActions[0];
		action.config.recipient = 'ops@example.com';

		// E-mail -> activate another rule: the address means nothing there.
		form.selectActionType(action, '6');
		expect(action.config).toEqual({ recipient: '' });

		form.setSwitchTarget(action, '12');
		form.selectActionType(action, '7');
		expect(action.config).toEqual({ recipient: '12', targetTemplateId: 12 });

		form.selectActionType(action, '8');
		expect(action.config).toEqual({ recipient: 'self' });

		// "This rule" -> e-mail: no "self" left behind as an address.
		form.selectActionType(action, '1');
		expect(action.config).toEqual({ recipient: '' });

		// Deactivate another rule -> relay: the target goes.
		form.selectActionType(action, '7');
		form.setSwitchTarget(action, '12');
		form.selectActionType(action, '4');
		expect(action.config).toEqual({ recipient: '' });
	});

	it('a sensor rule may carry rule switches next to its notifications', async () => {
		const { form, services } = dateTimeSetup();
		services.rules.createRuleTemplate.mockResolvedValue(template());
		fillIn(form);
		form.templateActions.push(form.createBlankTemplateAction());
		form.selectActionType(form.templateActions[1], '6');
		form.templateActions.push(form.createBlankTemplateAction());
		form.selectActionType(form.templateActions[2], '8');
		flushSync();
		expect(form.isFormValid).toBe(false);

		form.setSwitchTarget(form.templateActions[1], '12');
		flushSync();
		expect(form.isFormValid).toBe(true);
		expect(form.actionSummary).toBe(
			[
				`${m.rules_action_type_email()}: ${form.templateActions[0].config.recipient}`,
				`${m.rules_action_type_rule_activate()}: Winter`,
				m.rules_action_type_rule_deactivate_self()
			].join(', ')
		);

		await form.handleSubmit();

		expect(lastSave(services.rules.createRuleTemplate).actions).toEqual([
			{ id: null, actionType: 1, config: { recipient: 'ops@example.com' } },
			{ id: null, actionType: 6, config: { recipient: '12', targetTemplateId: 12 } },
			{ id: null, actionType: 8, config: { recipient: 'self' } }
		]);
	});
});

describe('RuleTemplateFormController — sending again while the alarm continues', () => {
	const RULE_ON: RuleActionTypeDto = { id: 6, name: 'RuleActivate', value: null, createdAt: '' };
	const TYPES = [EMAIL, LINE, PUSH, LORAWAN, RULE_ON];
	const TIMED = JSON.stringify({ devEui: 'RELAY', action: 'ro1_on_timed', onTimeSeconds: 15 });
	const FIXED = JSON.stringify({ devEui: 'RELAY', action: 'ro1_on_permanent' });
	const lastSave = (mock: { mock: { calls: unknown[][] } }) =>
		mock.mock.calls.at(-1)?.at(-1) as Record<string, unknown> & {
			actions: { actionType: number; config: Record<string, unknown> }[];
		};
	const relayAction = (id: number, recipient: string, extra: Record<string, unknown> = {}) =>
		templateAction({
			id,
			actionType: 4,
			actionTypeName: 'LoRaWAN',
			actionTypeValue: null,
			config: { recipient, ...extra }
		});

	function resendSetup(overrides: Partial<RuleFormContextDto> = {}) {
		const formContext = context({
			actionTypes: TYPES,
			ruleOptions: [{ id: 12, name: 'Winter', orgId: 'org-a', triggerKind: 'sensor' }],
			...overrides
		});
		return setup({ context: () => formContext });
	}

	function editResend(templateOverrides: Partial<RuleTemplateDto> = {}) {
		const formContext = context({
			actionTypes: TYPES,
			template: template({ isActive: true, ...templateOverrides })
		});
		return setup({ mode: () => 'edit', context: () => formContext });
	}

	it('is off for a new rule, and then nothing about it is sent', async () => {
		const { form, services } = resendSetup();
		services.rules.createRuleTemplate.mockResolvedValue(template());
		fillIn(form);

		expect(form.resendEnabled).toBe(false);
		expect(form.resendActive).toBe(false);
		expect(form.resendSummary).toBe('');
		expect(form.resendNothingRepeats).toBe(false);
		await form.handleSubmit();

		const payload = lastSave(services.rules.createRuleTemplate);
		// An older API does not know these fields.
		expect(payload).not.toHaveProperty('resendAfterReports');
		expect(payload).not.toHaveProperty('resendMax');
		expect(payload.actions[0].config).toEqual({ recipient: 'ops@example.com' });
	});

	it('switched on, it proposes every 3 reports and at most 5 times, and says so in the summary', async () => {
		const { form, services } = resendSetup();
		services.rules.createRuleTemplate.mockResolvedValue(template());
		fillIn(form);

		form.resendEnabled = true;
		flushSync();

		expect(form.resendEvery).toBe('3');
		expect(form.resendMax).toBe('5');
		expect(form.resendEveryError).toBeUndefined();
		expect(form.resendMaxError).toBeUndefined();
		expect(form.isFormValid).toBe(true);
		expect(form.resendSummary).toBe(m.rules_resend_summary({ reports: '3', times: '5' }));
		await form.handleSubmit();

		const payload = lastSave(services.rules.createRuleTemplate);
		expect(payload.resendAfterReports).toBe(3);
		// The cap is the API's default: not sent.
		expect(payload).not.toHaveProperty('resendMax');
	});

	it('sends the numbers the user entered', async () => {
		const { form, services } = resendSetup();
		services.rules.createRuleTemplate.mockResolvedValue(template());
		fillIn(form);
		form.resendEnabled = true;
		form.resendEvery = ' 12 ';
		form.resendMax = '2';

		await form.handleSubmit();

		expect(lastSave(services.rules.createRuleTemplate)).toMatchObject({
			resendAfterReports: 12,
			resendMax: 2
		});
	});

	it.each([
		['fewer than 3 reports', '2', '5', 'every'],
		['more than 1000 reports', '1001', '5', 'every'],
		['half a report', '3.5', '5', 'every'],
		['no number of reports', '', '5', 'every'],
		['no re-sends', '3', '0', 'max'],
		['more than 50 re-sends', '3', '51', 'max'],
		['a cap that is not a number', '3', 'five', 'max']
	])('refuses %s, and saves nothing', async (_name, every, max, field) => {
		const { form, services } = resendSetup();
		fillIn(form);
		form.resendEnabled = true;
		form.resendEvery = every;
		form.resendMax = max;
		flushSync();

		expect(form.resendEveryError).toBe(
			field === 'every' ? m.rules_resend_every_error() : undefined
		);
		expect(form.resendMaxError).toBe(field === 'max' ? m.rules_resend_max_error() : undefined);
		expect(form.isFormValid).toBe(false);
		expect(form.resendSummary).toBe('');
		await form.handleSubmit();
		expect(services.rules.createRuleTemplate).not.toHaveBeenCalled();

		// Switched off again, the numbers no longer matter.
		form.resendEnabled = false;
		flushSync();
		expect(form.resendEveryError).toBeUndefined();
		expect(form.resendMaxError).toBeUndefined();
		expect(form.isFormValid).toBe(true);
	});

	it('marks notifications to be sent again, a relay only when asked, and a rule switch never', async () => {
		const { form, services } = resendSetup();
		services.rules.createRuleTemplate.mockResolvedValue(template());
		fillIn(form);
		const [email] = form.templateActions;
		const add = (typeId: string, recipient: string) => {
			const action = form.createBlankTemplateAction();
			form.templateActions.push(action);
			const added = form.templateActions.at(-1)!;
			form.selectActionType(added, typeId);
			added.config.recipient = recipient;
			return added;
		};
		const timed = add('4', TIMED);
		const fixed = add('4', FIXED);
		const other = add('6', '');
		form.setSwitchTarget(other, '12');
		form.resendEnabled = true;
		flushSync();

		expect(form.canRepeat(email)).toBe(true);
		expect(form.actionRepeats(email)).toBe(true);
		expect(form.canRepeat(timed)).toBe(true);
		expect(form.actionRepeats(timed)).toBe(false);
		// A fixed on/off command is never sent again, whatever the switch says.
		fixed.config.repeat = true;
		expect(form.canRepeat(fixed)).toBe(false);
		expect(form.actionRepeats(fixed)).toBe(false);
		expect(form.canRepeat(other)).toBe(false);
		expect(form.actionRepeats(other)).toBe(false);

		await form.handleSubmit();

		expect(lastSave(services.rules.createRuleTemplate).actions).toEqual([
			{ id: null, actionType: 1, config: { recipient: 'ops@example.com', repeat: true } },
			{ id: null, actionType: 4, config: { recipient: TIMED, repeat: false } },
			{ id: null, actionType: 4, config: { recipient: FIXED, repeat: false } },
			{ id: null, actionType: 6, config: { recipient: '12', targetTemplateId: 12 } }
		]);
	});

	it('warns when it is on but no action would be sent again', () => {
		const { form } = resendSetup();
		fillIn(form);
		form.resendEnabled = true;
		flushSync();
		expect(form.resendNothingRepeats).toBe(false);

		form.templateActions[0].config.repeat = false;
		flushSync();
		expect(form.resendNothingRepeats).toBe(true);

		form.templateActions[0].config.repeat = true;
		flushSync();
		expect(form.resendNothingRepeats).toBe(false);
	});

	it('a choice belongs to the action type it was made for', () => {
		const { form } = resendSetup();
		fillIn(form);
		form.resendEnabled = true;
		const [action] = form.templateActions;
		action.config.repeat = false;

		form.selectActionType(action, '4');
		action.config.recipient = TIMED;
		// A relay starts from "not sent again", not from the e-mail's choice…
		expect(action.config).not.toHaveProperty('repeat');
		expect(form.actionRepeats(action)).toBe(false);

		action.config.repeat = true;
		expect(form.actionRepeats(action)).toBe(true);
		form.selectActionType(action, '1');
		// …and an e-mail from "sent again", not from the relay's.
		expect(action.config).not.toHaveProperty('repeat');
		expect(form.actionRepeats(action)).toBe(true);
	});

	it('opens a saved rule with its setting, and sends nothing about it when it is left alone', async () => {
		const { form, services } = editResend({
			resendAfterReports: 6,
			resendMax: 2,
			actions: [
				templateAction({ config: { recipient: 'ops@example.com', repeat: false } }),
				relayAction(32, TIMED, { repeat: true })
			]
		});
		services.rules.updateRuleTemplate.mockResolvedValue(template());

		expect(form.resendEnabled).toBe(true);
		expect(form.resendEvery).toBe('6');
		expect(form.resendMax).toBe('2');
		expect(form.actionRepeats(form.templateActions[0])).toBe(false);
		expect(form.actionRepeats(form.templateActions[1])).toBe(true);
		expect(form.resendSummary).toBe(m.rules_resend_summary({ reports: '6', times: '2' }));
		await form.handleSubmit();

		const payload = lastSave(services.rules.updateRuleTemplate);
		// Unchanged: the API keeps the setting, and the counters of open alarms.
		expect(payload).not.toHaveProperty('resendAfterReports');
		expect(payload).not.toHaveProperty('resendMax');
		expect(payload.actions.map((action) => action.config.repeat)).toEqual([false, true]);
	});

	it('an edit sends exactly the half that changed', async () => {
		const reports = editResend({ resendAfterReports: 6, resendMax: 2 });
		reports.services.rules.updateRuleTemplate.mockResolvedValue(template());
		reports.form.resendEvery = '9';
		await reports.form.handleSubmit();
		const first = lastSave(reports.services.rules.updateRuleTemplate);
		expect(first.resendAfterReports).toBe(9);
		expect(first).not.toHaveProperty('resendMax');

		const cap = editResend({ resendAfterReports: 6, resendMax: 2 });
		cap.services.rules.updateRuleTemplate.mockResolvedValue(template());
		cap.form.resendMax = '7';
		await cap.form.handleSubmit();
		const second = lastSave(cap.services.rules.updateRuleTemplate);
		expect(second.resendMax).toBe(7);
		expect(second).not.toHaveProperty('resendAfterReports');
	});

	it('switching it off sends "off", keeps the cap, and leaves the saved choices of the actions alone', async () => {
		const { form, services } = editResend({
			resendAfterReports: 6,
			resendMax: 2,
			actions: [templateAction({ config: { recipient: 'ops@example.com', repeat: false } })]
		});
		services.rules.updateRuleTemplate.mockResolvedValue(template());

		form.resendEnabled = false;
		// Whatever was typed before it was switched off is not sent.
		form.resendMax = '40';
		flushSync();
		expect(form.resendSummary).toBe('');
		await form.handleSubmit();

		const payload = lastSave(services.rules.updateRuleTemplate);
		expect(payload.resendAfterReports).toBeNull();
		expect(payload).not.toHaveProperty('resendMax');
		expect(payload.actions[0].config).toEqual({ recipient: 'ops@example.com', repeat: false });
	});

	it('switching it on for a saved rule sends the setting', async () => {
		const { form, services } = editResend();
		services.rules.updateRuleTemplate.mockResolvedValue(template());
		expect(form.resendEnabled).toBe(false);

		form.resendEnabled = true;
		form.resendMax = '8';
		await form.handleSubmit();

		const payload = lastSave(services.rules.updateRuleTemplate);
		expect(payload).toMatchObject({ resendAfterReports: 3, resendMax: 8 });
		expect(payload.actions[0].config).toEqual({ recipient: 'ops@example.com', repeat: true });
	});

	it('is off for a rule from an API that does not send the setting', () => {
		const { form } = editResend({ resendAfterReports: undefined, resendMax: undefined });

		expect(form.resendEnabled).toBe(false);
		expect(form.resendEvery).toBe('3');
		expect(form.resendMax).toBe('5');
	});

	it('a Date/Time rule never sends again: it has no reports to count', async () => {
		const { form, services } = resendSetup({ canManageDateTimeRules: true });
		services.rules.createRuleTemplate.mockResolvedValue(template());
		form.ruleName = 'Evening pulse';
		form.resendEnabled = true;
		form.resendEvery = '1';
		form.selectSubject(0, DATE_TIME_SUBJECT);
		form.selectActionType(form.templateActions[0], '4');
		form.templateActions[0].config.recipient = TIMED;
		form.templateActions[0].config.repeat = true;
		flushSync();

		expect(form.isDateTime).toBe(true);
		expect(form.resendActive).toBe(false);
		// The number typed for a sensor rule is not held against it.
		expect(form.resendEveryError).toBeUndefined();
		expect(form.resendNothingRepeats).toBe(false);
		expect(form.resendSummary).toBe('');
		expect(form.isFormValid).toBe(true);
		await form.handleSubmit();

		const payload = lastSave(services.rules.createRuleTemplate);
		expect(payload.triggerKind).toBe('schedule');
		expect(payload).not.toHaveProperty('resendAfterReports');
		expect(payload).not.toHaveProperty('resendMax');
	});
});
