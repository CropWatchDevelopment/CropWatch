import { flushSync } from 'svelte';
import { describe, expect, it, vi } from 'vitest';
import type { CwToastOptions } from '@cropwatchdevelopment/cwui';
import { ApiError } from '$lib/api/api-error';
import type {
	DeviceDto,
	LineRecipientCandidateDto,
	LocationDto,
	PushRecipientCandidateDto,
	RuleActionTypeDto,
	RuleFormContextDto,
	RuleTemplateActionDto,
	RuleTemplateAssignmentDto,
	RuleTemplateCriterionDto,
	RuleTemplateDto
} from '$lib/api/api.dtos';
import { m } from '$lib/paraglide/messages.js';
import { labelFor } from '$lib/sensor-labels';
import { createMockServices } from '$lib/testing/mock-services';
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

const line = (
	userId: string,
	displayName: string,
	lineLinked = true
): LineRecipientCandidateDto => ({
	userId,
	displayName,
	lineLinked
});

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
		line: services.line,
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
const baseLineOptions = (form: RuleTemplateFormController) =>
	form.lineRecipientOptionsFor({ lineRecipients: [] } as unknown as EditableTemplateAction);
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
				lineRecipients: [],
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
				lineRecipients: [],
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

	it('falls back to a blank action while the server has no Push action type', () => {
		const formContext = context({ actionTypes: [LINE, EMAIL] });
		const { form } = setup({ context: () => formContext, currentUserId: 'user-1' });

		expect(form.templateActions[0]).toMatchObject({
			actionType: 2,
			actionTypeName: 'LINE',
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
				lineRecipients: [],
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

	it('restores LINE and Push recipients from the saved user ids', () => {
		const { form } = editSetup({
			actions: [
				templateAction({
					id: 1,
					actionType: 2,
					actionTypeName: 'LINE',
					config: { recipient: JSON.stringify({ userIds: ['u-1', '', 7, 'u-2'] }) }
				}),
				templateAction({
					id: 2,
					actionType: 3,
					actionTypeName: 'Push',
					config: { recipient: JSON.stringify({ userIds: ['u-3'] }) }
				})
			]
		});

		expect(form.templateActions[0].lineRecipients).toEqual([
			{ id: 'u-1', label: 'u-1' },
			{ id: 'u-2', label: 'u-2' }
		]);
		expect(form.templateActions[0].pushRecipients).toEqual([]);
		expect(form.templateActions[1].pushRecipients).toEqual([{ id: 'u-3', label: 'u-3' }]);
		expect(form.templateActions[1].lineRecipients).toEqual([]);
	});

	it.each([
		['the legacy sentinel', 'linked-users'],
		['JSON without user ids', JSON.stringify({ users: ['u-1'] })],
		['user ids that are not a list', JSON.stringify({ userIds: 'u-1' })],
		['JSON null', 'null']
	])('asks for a fresh LINE recipient choice for %s', (_label, recipient) => {
		const { form } = editSetup({
			actions: [templateAction({ actionType: 2, actionTypeName: 'LINE', config: { recipient } })]
		});

		expect(form.templateActions[0].lineRecipients).toEqual([]);
		expect(form.isFormValid).toBe(false);
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

describe('RuleTemplateFormController — LINE recipients', () => {
	it('loads nothing until a device is selected', () => {
		const { form, services } = setup();

		form.syncLineRecipients();

		expect(services.line.getLineRecipientCandidates).not.toHaveBeenCalled();
		expect(baseLineOptions(form)).toEqual([]);
	});

	it('loads nothing without a session', () => {
		const { form, services } = setup({ accessToken: () => undefined, preselectedDevEui: 'DEV-A' });

		form.syncLineRecipients();

		expect(services.line.getLineRecipientCandidates).not.toHaveBeenCalled();
	});

	it("loads the selected devices' candidates once per selection", async () => {
		const { form, services } = setup();
		services.line.getLineRecipientCandidates.mockResolvedValue([
			line('u-1', 'Ada'),
			line('u-2', 'Grace', false)
		]);
		form.selectedDevices = [
			{ id: 'DEV-B', label: '' },
			{ id: ' DEV-A ', label: '' }
		];

		form.syncLineRecipients();
		form.syncLineRecipients();

		expect(services.line.getLineRecipientCandidates).toHaveBeenCalledTimes(1);
		expect(services.line.getLineRecipientCandidates).toHaveBeenCalledWith(['DEV-A', 'DEV-B']);
		await vi.waitFor(() =>
			expect(baseLineOptions(form)).toEqual([
				{ value: 'u-1', label: 'Ada' },
				{ value: 'u-2', label: `Grace（${m.line_recipient_not_linked()}）` }
			])
		);

		// The same devices in another order are the same selection.
		form.selectedDevices = [
			{ id: 'DEV-A', label: '' },
			{ id: 'DEV-B', label: '' }
		];
		form.syncLineRecipients();
		expect(services.line.getLineRecipientCandidates).toHaveBeenCalledTimes(1);
	});

	it('keeps saved recipients selectable before the candidates arrive', () => {
		const { form } = setup();
		const action = {
			lineRecipients: [
				{ id: 'u-9', label: 'Saved person' },
				{ id: 'u-8', label: '' }
			]
		} as unknown as EditableTemplateAction;

		expect(form.lineRecipientOptionsFor(action)).toEqual([
			{ value: 'u-9', label: 'Saved person' },
			{ value: 'u-8', label: 'u-8' }
		]);
		// Same for push.
		expect(
			form.pushRecipientOptionsFor({
				pushRecipients: [
					{ id: 'u-7', label: 'Saved push person' },
					{ id: 'u-6', label: '' }
				]
			} as unknown as EditableTemplateAction)
		).toEqual([
			{ value: 'u-7', label: 'Saved push person' },
			{ value: 'u-6', label: 'u-6' }
		]);
	});

	it('names saved LINE recipients once the candidates arrive', async () => {
		const { form, services } = editSetup({
			actions: [
				templateAction({
					id: 1,
					actionType: 2,
					actionTypeName: 'LINE',
					config: { recipient: JSON.stringify({ userIds: ['u-1', 'u-2', 'u-3'] }) }
				}),
				templateAction({
					id: 2,
					actionType: 3,
					actionTypeName: 'Push',
					config: { recipient: JSON.stringify({ userIds: ['u-1'] }) }
				})
			]
		});
		form.templateActions[0].lineRecipients[1].label = 'Renamed';
		services.line.getLineRecipientCandidates.mockResolvedValue([
			line('u-1', 'Ada'),
			line('u-2', 'Grace')
		]);

		form.syncLineRecipients();

		await vi.waitFor(() => expect(form.templateActions[0].lineRecipients[0].label).toBe('Ada'));
		expect(form.templateActions[0].lineRecipients.map((item) => item.label)).toEqual([
			'Ada',
			'Renamed',
			'u-3'
		]);
		// Push selections are left to the push lookup.
		expect(form.templateActions[1].pushRecipients[0].label).toBe('u-1');
		// The saved, unknown recipient stays selectable.
		expect(form.lineRecipientOptionsFor(form.templateActions[0])).toEqual([
			{ value: 'u-3', label: 'u-3' },
			{ value: 'u-1', label: 'Ada' },
			{ value: 'u-2', label: 'Grace' }
		]);
	});

	it('ignores a response for a selection that has since changed', async () => {
		const { form, services } = setup();
		const first = deferred<LineRecipientCandidateDto[]>();
		const second = deferred<LineRecipientCandidateDto[]>();
		services.line.getLineRecipientCandidates
			.mockReturnValueOnce(first.promise)
			.mockReturnValueOnce(second.promise);

		form.selectedDevices = [{ id: 'DEV-A', label: '' }];
		form.syncLineRecipients();
		form.selectedDevices = [{ id: 'DEV-B', label: '' }];
		form.syncLineRecipients();

		second.resolve([line('u-2', 'Newest')]);
		await vi.waitFor(() =>
			expect(baseLineOptions(form)).toEqual([{ value: 'u-2', label: 'Newest' }])
		);

		first.resolve([line('u-1', 'Stale')]);
		await settle();
		expect(baseLineOptions(form)).toEqual([{ value: 'u-2', label: 'Newest' }]);

		// A stale failure is ignored too.
		const third = deferred<LineRecipientCandidateDto[]>();
		const fourth = deferred<LineRecipientCandidateDto[]>();
		services.line.getLineRecipientCandidates
			.mockReturnValueOnce(third.promise)
			.mockReturnValueOnce(fourth.promise);
		form.selectedDevices = [{ id: 'DEV-A', label: '' }];
		form.syncLineRecipients();
		form.selectedDevices = [{ id: 'DEV-B', label: '' }];
		form.syncLineRecipients();
		fourth.resolve([line('u-4', 'Latest')]);
		third.reject(new Error('stale failure'));
		await vi.waitFor(() =>
			expect(baseLineOptions(form)).toEqual([{ value: 'u-4', label: 'Latest' }])
		);
		await settle();
		expect(baseLineOptions(form)).toEqual([{ value: 'u-4', label: 'Latest' }]);
	});

	it('offers no candidates when the lookup fails', async () => {
		const { form, services } = setup();
		services.line.getLineRecipientCandidates.mockResolvedValueOnce([line('u-1', 'Ada')]);
		form.selectedDevices = [{ id: 'DEV-A', label: '' }];
		form.syncLineRecipients();
		await vi.waitFor(() => expect(baseLineOptions(form)).toHaveLength(1));

		services.line.getLineRecipientCandidates.mockRejectedValueOnce(new Error('down'));
		form.selectedDevices = [{ id: 'DEV-B', label: '' }];
		form.syncLineRecipients();

		await vi.waitFor(() => expect(baseLineOptions(form)).toEqual([]));
	});

	it('clears the candidates when every device is deselected', async () => {
		const { form, services } = setup();
		services.line.getLineRecipientCandidates.mockResolvedValue([line('u-1', 'Ada')]);
		form.selectedDevices = [{ id: 'DEV-A', label: '' }];
		form.syncLineRecipients();
		await vi.waitFor(() => expect(baseLineOptions(form)).toHaveLength(1));

		form.selectedDevices = [];
		form.syncLineRecipients();

		expect(baseLineOptions(form)).toEqual([]);
		expect(services.line.getLineRecipientCandidates).toHaveBeenCalledTimes(1);
	});

	it('stores the chosen recipients as user ids', () => {
		const { form } = setup();
		const action = form.templateActions[0];

		form.setLineRecipients(action, [
			{ id: 'u-1', label: 'Ada' },
			{ id: 'u-2', label: 'Grace' }
		]);
		expect(action.lineRecipients).toEqual([
			{ id: 'u-1', label: 'Ada' },
			{ id: 'u-2', label: 'Grace' }
		]);
		expect(action.config.recipient).toBe(JSON.stringify({ userIds: ['u-1', 'u-2'] }));

		form.setLineRecipients(action, []);
		expect(action.config.recipient).toBe('');
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

	it('ignores stale and failed lookups like the LINE lookup', async () => {
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
			{ label: 'EMail', value: '1' },
			{ label: 'LoRaWAN', value: '4' }
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
			{ label: 'EMail', value: '1' },
			{ label: 'LINE', value: '2' },
			{ label: 'Push', value: '3' },
			{ label: 'LoRaWAN', value: '4' }
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

	it('switching to LINE asks for LINE recipients', () => {
		const { form } = setup();
		const action = form.templateActions[0];
		action.config.recipient = 'ops@example.com';

		form.selectActionType(action, '2');

		expect(action).toMatchObject({
			actionType: 2,
			actionTypeName: 'LINE',
			actionTypeValue: 'line',
			lineRecipients: [],
			config: { recipient: '' }
		});
	});

	it('switching away from LINE or Push clears the recipients', () => {
		const { form } = setup({ currentUserId: 'me' });
		const action = form.templateActions[0];
		expect(action.actionTypeName).toBe('Push');

		form.selectActionType(action, '2');
		expect(action.pushRecipients).toEqual([]);
		form.setLineRecipients(action, [{ id: 'u-1', label: 'Ada' }]);

		form.selectActionType(action, '1');
		expect(action).toMatchObject({
			actionType: 1,
			actionTypeName: 'EMail',
			lineRecipients: [],
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
			'a LINE action has no LINE recipients',
			(form: RuleTemplateFormController) => {
				form.templateActions[0].actionTypeName = 'LINE';
			}
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
					id: 2,
					actionType: 2,
					actionTypeName: 'LINE',
					config: { recipient: JSON.stringify({ userIds: ['u-1', 'u-2'] }) }
				}),
				templateAction({ id: 3, actionType: 2, actionTypeName: 'LINE', config: { recipient: '' } }),
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
				'EMail: ops@example.com',
				'LINE: u-1, u-2',
				`LINE: ${m.line_recipient_preview_count({ count: '0' })}`,
				'Push: u-3',
				`Push: ${m.push_recipient_preview_count({ count: '0' })}`,
				'SMS: 555',
				'fax: 123',
				'6: '
			].join(', ')
		);
	});

	it('names LINE and push recipients in the summary once known', async () => {
		const { form, services } = editSetup({
			actions: [
				templateAction({
					id: 2,
					actionType: 2,
					actionTypeName: 'LINE',
					config: { recipient: JSON.stringify({ userIds: ['u-1'] }) }
				}),
				templateAction({
					id: 4,
					actionType: 3,
					actionTypeName: 'Push',
					config: { recipient: JSON.stringify({ userIds: ['u-3'] }) }
				})
			]
		});
		services.line.getLineRecipientCandidates.mockResolvedValue([line('u-1', 'Ada')]);
		services.push.getPushRecipientCandidates.mockResolvedValue([push('u-3', 'Grace')]);

		form.syncLineRecipients();
		form.syncPushRecipients();

		await vi.waitFor(() => expect(form.actionSummary).toBe('LINE: Ada, Push: Grace'));
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
			isActive: false,
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
		services.line.getLineRecipientCandidates.mockResolvedValue([]);
		services.push.getPushRecipientCandidates.mockResolvedValue([]);
		const cleanup = $effect.root(() => {
			$effect(() => {
				form.syncLineRecipients();
			});
			$effect(() => {
				form.syncPushRecipients();
			});
		});

		try {
			flushSync();
			expect(services.line.getLineRecipientCandidates).toHaveBeenLastCalledWith(['DEV-A']);
			expect(services.push.getPushRecipientCandidates).toHaveBeenLastCalledWith(['DEV-A']);

			form.selectedDevices.push({ id: 'DEV-B', label: '' });
			flushSync();
			expect(services.line.getLineRecipientCandidates).toHaveBeenLastCalledWith(['DEV-A', 'DEV-B']);
			expect(services.push.getPushRecipientCandidates).toHaveBeenLastCalledWith(['DEV-A', 'DEV-B']);

			// Renaming the rule does not refetch.
			form.ruleName = 'Cold room';
			flushSync();
			expect(services.line.getLineRecipientCandidates).toHaveBeenCalledTimes(2);
			expect(services.push.getPushRecipientCandidates).toHaveBeenCalledTimes(2);
		} finally {
			cleanup();
		}
	});
});
