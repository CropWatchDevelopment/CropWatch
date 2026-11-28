import { resolve } from '$app/paths';
import { SvelteMap, SvelteSet } from 'svelte/reactivity';
import type { CwDateValue, CwTimeValue, CwToastApi } from '@cropwatchdevelopment/cwui';
import { apiErrorMessage } from '#lib/api/api-error.ts';
import type { RuleFormContextDto } from '#lib/api/api.dtos.ts';
import type { PushRepository } from '#lib/api/repositories/push.repository.ts';
import type { RuleRepository } from '#lib/api/repositories/rules.repository.ts';
import { getRuleOperatorOptions, getRuleSubjectOptions } from '#lib/i18n/options.ts';
import { m } from '#lib/paraglide/messages.js';
import type {
	Json,
	RuleScheduleInput,
	RuleTemplateActionDto,
	RuleTemplateActionInput,
	RuleTemplateDto,
	RuleTemplateSaveRequest
} from '#lib/rules/rule-template.types.ts';
import { getTimezoneOptions } from '#lib/units/index.ts';
import { labelFor } from '#lib/sensor-labels/index.ts';
import {
	areAlertCriteriaGroupsValid,
	buildInitialAlertCriteriaGroups,
	buildRuleTemplateCriteriaFromAlertGroups,
	hasUnsupportedAlertPointConditions,
	type RuleTemplateAlertCriteriaGroup
} from './rule-template-alert-points';
import { browserTimeZone, fromInstant, sameInstant, toInstant } from './rule-auto-dates.ts';
import {
	actionTypeLabel,
	allowedOnDateTimeRule,
	readTargetTemplateId,
	ruleActionKind,
	switchesAnotherRule
} from './rule-action-types.ts';
import {
	RESEND_REPORTS_DEFAULT,
	RESEND_REPORTS_MAX,
	RESEND_REPORTS_MIN,
	RESEND_TIMES_DEFAULT,
	RESEND_TIMES_MAX,
	RESEND_TIMES_MIN,
	canBeRepeated,
	readWholeNumber,
	relayIsTimedPulse,
	repeatsByDefault
} from './rule-resend.ts';
import {
	DATE_TIME_SUBJECT,
	ISO_WEEKDAYS,
	describeSchedule,
	formatTimeOfDay,
	parseTimeOfDay,
	weekdayLabel
} from './rule-schedule-text.ts';

export type RuleTemplateFormMode = 'create' | 'edit';

interface DeviceSelection {
	id: string;
	label: string;
}

interface RuleTemplateActionConfig {
	recipient: string;
	[key: string]: Json | undefined;
}

export type EditableTemplateAction = Omit<RuleTemplateActionDto, 'config'> & {
	config: RuleTemplateActionConfig;
	// Push actions only: the CwMultiSelect selection ({id,label} shape).
	// Serialized into config.recipient as {"userIds":[...]} on change.
	pushRecipients: { id: string; label: string }[];
};

interface DeviceOption {
	label: string;
	value: string;
	group?: number;
}

export interface RuleTemplateFormOptions {
	/** The form's `mode` prop, read on use. */
	mode: () => RuleTemplateFormMode;
	/** The form's `context` prop, read on use (devices, locations and action types follow it). */
	context: () => RuleFormContextDto;
	preselectedDevEui: string | null;
	// Used to preselect the rule creator on the default Push action.
	currentUserId: string | null;
	/** Shown on the preselected creator chip until the recipient list loads. */
	currentUserName: string | null;
	rules: Pick<RuleRepository, 'createRuleTemplate' | 'updateRuleTemplate'>;
	push: Pick<PushRepository, 'getPushRecipientCandidates'>;
	/** The session token the services send: the recipient lookups only run with one. */
	accessToken: () => string | null | undefined;
	toast: Pick<CwToastApi, 'add'>;
	goto: (href: string) => Promise<unknown>;
}

/**
 * State and behaviour of the rule template wizard (create and edit): the
 * fields, the device / condition / action editors, the recipient lookups
 * that depend on the device selection, and saving. The component renders
 * it and runs {@link syncPushRecipients} in an effect.
 */
export class RuleTemplateFormController {
	readonly #options: RuleTemplateFormOptions;
	readonly #initial: RuleTemplateDto | null;

	readonly subjectOptions = getRuleSubjectOptions();
	/**
	 * The Data Field choices of the FIRST condition. That is where a rule
	 * becomes a Date/Time rule: for those who may manage them, while the rule
	 * is new and has one condition. An existing rule keeps its kind.
	 */
	readonly firstSubjectOptions = $derived.by(() => {
		const dateTime = { label: m.rule_subject_date_time(), value: DATE_TIME_SUBJECT };
		if (this.#initialIsDateTime) return [dateTime];
		const offered =
			this.#options.mode() === 'create' &&
			this.#context().canManageDateTimeRules === true &&
			this.criteriaGroups.length === 1;
		return offered ? [...this.subjectOptions, dateTime] : this.subjectOptions;
	});
	readonly #operators = getRuleOperatorOptions();

	readonly #devices = $derived(this.#context().devices);
	readonly #actions = $derived(this.#context().actionTypes);
	readonly #locations = $derived(this.#context().locations);

	ruleName = $state('');
	description = $state('');
	isActive = $state(true);
	submitting = $state(false);
	showAdvanced = $state(false);

	// One-shot dates (picked in the browser's time zone) and the rule that
	// starts when this one pauses on its pause date ('' = none).
	autoStart = $state<CwDateValue | undefined>(undefined);
	autoPause = $state<CwDateValue | undefined>(undefined);
	chainRuleId = $state('');
	readonly timeZone = browserTimeZone();
	// What the pickers were opened with (set by the constructor): only a date
	// the user changed is sent.
	#initialAutoStartAt: string | null = null;
	#initialAutoPauseAt: string | null = null;
	#initialChainRuleId = '';

	readonly autoStartAt = $derived(toInstant(this.autoStart));
	readonly autoPauseAt = $derived(toInstant(this.autoPause));
	readonly autoStartError = $derived(
		this.#isNewPastDate(this.autoStartAt, this.#initialAutoStartAt)
			? m.rules_auto_error_past()
			: undefined
	);
	readonly autoPauseError = $derived(
		this.#isNewPastDate(this.autoPauseAt, this.#initialAutoPauseAt)
			? m.rules_auto_error_past()
			: this.autoPauseAt !== null && sameInstant(this.autoPauseAt, this.autoStartAt)
				? m.rules_auto_error_same()
				: undefined
	);
	/** Running with a start date ahead of any pause date: the start date would do nothing. */
	readonly startDateNeedsPause = $derived(
		this.isActive &&
			this.autoStartAt !== null &&
			(this.autoPauseAt === null || Date.parse(this.autoStartAt) < Date.parse(this.autoPauseAt))
	);
	readonly chainOptions = $derived.by(() => {
		const options = (this.#context().ruleOptions ?? [])
			.filter((rule) => rule.id !== this.#initial?.id)
			.map((rule) => ({
				label: rule.name ?? m.rules_auto_then_unknown({ id: String(rule.id) }),
				value: String(rule.id)
			}));
		// A saved choice stays visible even when it is no longer on offer.
		if (this.chainRuleId && !options.some((option) => option.value === this.chainRuleId)) {
			options.unshift({
				label: m.rules_auto_then_unknown({ id: this.chainRuleId }),
				value: this.chainRuleId
			});
		}
		return [{ label: m.rules_auto_then_none(), value: '' }, ...options];
	});
	readonly chainRuleName = $derived(
		this.chainRuleId && this.autoPauseAt !== null
			? (this.chainOptions.find((option) => option.value === this.chainRuleId)?.label ?? '')
			: ''
	);

	selectedDevices = $state<DeviceSelection[]>([]);

	nextCriteriaGroupId = $state(1);
	criteriaGroups = $state<RuleTemplateAlertCriteriaGroup[]>([]);

	// A Date/Time rule: fires at a time of day on chosen weekdays in a time
	// zone, instead of on sensor readings. It has no devices and no conditions.
	readonly #initialIsDateTime: boolean;
	readonly isDateTime = $derived(this.criteriaGroups[0]?.subject === DATE_TIME_SUBJECT);
	scheduleTime = $state<CwTimeValue>({ hours: 9, minutes: 0 });
	scheduleDays = $state<DeviceSelection[]>([]);
	scheduleTimezone = $state('');
	readonly weekdayOptions = ISO_WEEKDAYS.map((day) => ({
		label: weekdayLabel(day),
		value: String(day)
	}));
	readonly timezoneOptions = $derived.by(() => {
		const options = getTimezoneOptions();
		// The zone in use stays selectable even when it is not one of the listed cities.
		return this.scheduleTimezone &&
			!options.some((option) => option.value === this.scheduleTimezone)
			? [{ label: this.scheduleTimezone, value: this.scheduleTimezone }, ...options]
			: options;
	});
	readonly schedule = $derived<RuleScheduleInput>({
		timeOfDay: formatTimeOfDay(this.scheduleTime),
		daysOfWeek: this.scheduleDays.map((day) => Number(day.id)).sort((a, b) => a - b),
		timezone: this.scheduleTimezone
	});
	readonly scheduleDaysError = $derived(
		this.isDateTime && this.scheduleDays.length === 0 ? m.rules_dt_days_required() : undefined
	);

	templateActions = $state<EditableTemplateAction[]>([]);

	// Re-send: while the alarm stays open, the actions marked "send again" go
	// out again every N reports that still break the alert threshold, at most
	// M times per alarm. A Date/Time rule has no reports to count.
	resendEnabled = $state(false);
	resendEvery = $state(String(RESEND_REPORTS_DEFAULT));
	resendMax = $state(String(RESEND_TIMES_DEFAULT));
	// What the rule was loaded with (set by the constructor): only a changed setting is sent.
	#initialResendAfterReports: number | null = null;
	#initialResendMax = RESEND_TIMES_DEFAULT;
	readonly resendActive = $derived(this.resendEnabled && !this.isDateTime);
	readonly #resendEveryValue = $derived(
		readWholeNumber(this.resendEvery, RESEND_REPORTS_MIN, RESEND_REPORTS_MAX)
	);
	readonly #resendMaxValue = $derived(
		readWholeNumber(this.resendMax, RESEND_TIMES_MIN, RESEND_TIMES_MAX)
	);
	readonly resendEveryError = $derived(
		this.resendActive && this.#resendEveryValue === null ? m.rules_resend_every_error() : undefined
	);
	readonly resendMaxError = $derived(
		this.resendActive && this.#resendMaxValue === null ? m.rules_resend_max_error() : undefined
	);
	/** Switched on, but no action is marked: nothing would be sent again. */
	readonly resendNothingRepeats = $derived(
		this.resendActive && !this.templateActions.some((action) => this.actionRepeats(action))
	);
	readonly resendSummary = $derived(
		this.resendActive && this.#resendEveryValue !== null && this.#resendMaxValue !== null
			? m.rules_resend_summary({
					reports: String(this.#resendEveryValue),
					times: String(this.#resendMaxValue)
				})
			: ''
	);

	// LINE is no longer offered (its integration is being removed); a saved
	// LINE action still shows under its own name so it can be changed or removed.
	readonly #offeredActionTypes = $derived(
		this.#actions.filter(
			(actionType) =>
				isValidActionTypeId(actionType.id) &&
				actionType.name !== 'LINE' &&
				// A Date/Time rule switches rules and relays; it cannot notify yet.
				(!this.isDateTime || allowedOnDateTimeRule(ruleActionKind(actionType.name)))
		)
	);
	readonly #actionTypeOptions = $derived(
		this.#offeredActionTypes.map((actionType) => ({
			label: actionTypeLabel(actionType.name),
			value: String(actionType.id)
		}))
	);
	/** The rules a "… another rule" action may point at (never the rule itself). */
	readonly #switchTargetOptionsBase = $derived(
		(this.#context().ruleOptions ?? [])
			.filter((rule) => rule.id !== this.#initial?.id)
			.map((rule) => ({
				label: rule.name ?? m.rules_auto_then_unknown({ id: String(rule.id) }),
				value: String(rule.id)
			}))
	);
	readonly #deviceOptionsBase = $derived<DeviceOption[]>(
		(this.#devices ?? []).map((device) => ({
			label: device.name ? `${device.name} (${device.dev_eui})` : device.dev_eui,
			value: device.dev_eui,
			group: typeof device.location_id === 'number' ? device.location_id : undefined
		}))
	);
	readonly deviceOptions = $derived<DeviceOption[]>([
		...this.selectedDevices
			.filter((device) => !this.#deviceOptionsBase.some((option) => option.value === device.id))
			.map((device) => ({
				label: device.label || this.#getDeviceLabel(device.id),
				value: device.id
			})),
		...this.#deviceOptionsBase
	]);
	readonly deviceGroups = $derived.by(() => {
		const seen = new SvelteMap<number, string>();
		for (const device of this.#devices ?? []) {
			if (typeof device.location_id !== 'number' || seen.has(device.location_id)) continue;
			seen.set(device.location_id, this.#resolveLocationName(device.location_id));
		}
		return [...seen.entries()]
			.map(([value, label]) => ({ value, label }))
			.sort((a, b) => a.label.localeCompare(b.label));
	});

	readonly #selectedDevEuis = $derived(
		this.selectedDevices.map((device) => device.id.trim()).filter(Boolean)
	);

	// Eligible push recipients for the currently selected devices. This is the
	// only mid-form fetch in this file: the options depend on device selection,
	// which the server-loaded form context cannot know ahead of time. The
	// serialized-key guard doubles as a debounce (CwMultiSelect commits one
	// change per click) and the sequence number drops stale responses.
	// Users who haven't subscribed to push are listed but can't be selected.
	#pushRecipientOptionsBase = $state<{ label: string; value: string; disabled: boolean }[]>([]);
	readonly #pushRecipientNames = new SvelteMap<string, string>();
	readonly #pushUnsubscribedIds = new SvelteSet<string>();
	#pushRecipientFetchKey = '';
	#pushRecipientFetchSeq = 0;

	readonly #selectedDeviceTypeId = $derived(this.#resolveSelectedDeviceTypeId());
	readonly #criteriaForTest = $derived(
		buildRuleTemplateCriteriaFromAlertGroups(this.criteriaGroups)
	);
	readonly hasUnsupportedCriteria = $derived(
		hasUnsupportedAlertPointConditions(this.criteriaGroups)
	);
	readonly isFormValid = $derived(
		this.ruleName.trim().length > 0 &&
			(this.isDateTime
				? this.scheduleDays.length > 0 && this.scheduleTimezone.length > 0
				: this.#selectedDevEuis.length > 0 &&
					!this.hasUnsupportedCriteria &&
					areAlertCriteriaGroupsValid(this.criteriaGroups)) &&
			this.autoStartError === undefined &&
			this.autoPauseError === undefined &&
			this.resendEveryError === undefined &&
			this.resendMaxError === undefined &&
			this.templateActions.length > 0 &&
			this.templateActions.every((action) => this.#isActionValid(action))
	);
	readonly assignmentSummary = $derived(
		this.isDateTime
			? m.rules_dt_no_devices()
			: this.selectedDevices
					.map((device) => device.label || this.#getDeviceLabel(device.id))
					.filter(Boolean)
					.join(', ')
	);
	readonly #criteriaPreview = $derived(
		this.#criteriaForTest.map((criterion) => {
			const label = this.subjectOptions.find((option) => option.value === criterion.subject)?.label;
			const operatorLabel =
				this.#operators.find((option) => option.value === criterion.operator)?.label ??
				criterion.operator;
			return `${label ?? labelFor(criterion.subject).label()} ${operatorLabel} ${criterion.triggerValue} (${m.rules_reset_value()}: ${criterion.resetValue})`;
		})
	);
	readonly criteriaSummary = $derived(
		this.isDateTime ? describeSchedule(this.schedule) : this.#criteriaPreview.join(', ')
	);
	readonly #actionPreview = $derived(
		this.templateActions.map((action) => {
			const typeName =
				this.#actions.find((entry) => entry.id === action.actionType)?.name ??
				action.actionTypeName ??
				action.actionTypeValue ??
				String(action.actionType);
			const kind = ruleActionKind(typeName);
			if (kind === 'deactivate_self') return actionTypeLabel(typeName);
			const recipient = switchesAnotherRule(kind)
				? (this.switchTargetOptionsFor(action).find(
						(option) => option.value === this.switchTargetValue(action)
					)?.label ?? '')
				: action.actionTypeName === 'Push'
					? action.pushRecipients
							.map((item) => this.#pushRecipientNames.get(item.id) ?? item.label ?? item.id)
							.join(', ') ||
						m.push_recipient_preview_count({ count: String(action.pushRecipients.length) })
					: action.config.recipient;
			return `${actionTypeLabel(typeName)}: ${recipient}`;
		})
	);
	readonly actionSummary = $derived(this.#actionPreview.join(', '));

	constructor(options: RuleTemplateFormOptions) {
		this.#options = options;
		const initial = options.context().template;
		this.#initial = initial;
		const preselectedDevice = options.preselectedDevEui;

		this.ruleName = initial?.name ?? '';
		this.description = initial?.description ?? '';
		this.isActive = initial?.isActive ?? true;

		this.autoStart = fromInstant(initial?.autoStartAt);
		this.autoPause = fromInstant(initial?.autoPauseAt);
		this.chainRuleId =
			typeof initial?.onAutoPauseStartTemplateId === 'number'
				? String(initial.onAutoPauseStartTemplateId)
				: '';
		// Read back through the picker's own precision (minutes), so an untouched
		// date never counts as changed.
		this.#initialAutoStartAt = toInstant(this.autoStart);
		this.#initialAutoPauseAt = toInstant(this.autoPause);
		this.#initialChainRuleId = this.chainRuleId;

		this.selectedDevices = initial?.assignments.length
			? this.#createDeviceSelections(initial.assignments.map((assignment) => assignment.devEui))
			: preselectedDevice
				? [this.#createDeviceSelection(preselectedDevice)]
				: [];

		const initialCriteriaGroups = buildInitialAlertCriteriaGroups(initial?.criteria ?? []);
		this.#initialIsDateTime = initial?.triggerKind === 'schedule';
		// A Date/Time rule has no conditions: its one "condition" is the Date/Time field.
		if (this.#initialIsDateTime && initialCriteriaGroups[0]) {
			initialCriteriaGroups[0].subject = DATE_TIME_SUBJECT;
		}
		this.nextCriteriaGroupId = initialCriteriaGroups.length + 1;
		this.criteriaGroups = this.#initialIsDateTime
			? initialCriteriaGroups.slice(0, 1)
			: initialCriteriaGroups;

		const savedSchedule = initial?.schedule ?? null;
		this.scheduleTime = parseTimeOfDay(savedSchedule?.timeOfDay);
		this.scheduleDays = (savedSchedule?.daysOfWeek ?? [...ISO_WEEKDAYS]).map((day) => ({
			id: String(day),
			label: weekdayLabel(day)
		}));
		this.scheduleTimezone = savedSchedule?.timezone ?? this.timeZone;

		this.templateActions = initial?.actions.length
			? initial.actions.map(createEditableTemplateAction)
			: [this.#createDefaultTemplateAction()];

		this.#initialResendAfterReports =
			typeof initial?.resendAfterReports === 'number' ? initial.resendAfterReports : null;
		this.#initialResendMax =
			typeof initial?.resendMax === 'number' ? initial.resendMax : RESEND_TIMES_DEFAULT;
		this.resendEnabled = this.#initialResendAfterReports !== null;
		this.resendEvery = String(this.#initialResendAfterReports ?? RESEND_REPORTS_DEFAULT);
		this.resendMax = String(this.#initialResendMax);
	}

	/**
	 * The `context` prop. A method, so the field deriveds above can read it:
	 * deriveds are lazy and only run after the constructor has stored the options.
	 */
	#context(): RuleFormContextDto {
		return this.#options.context();
	}

	/** Effect body: refetches the eligible push recipients when the device selection changes. */
	syncPushRecipients(): void {
		const devEuis = [...this.#selectedDevEuis].sort();
		const key = devEuis.join(',');
		if (key === this.#pushRecipientFetchKey) return;
		this.#pushRecipientFetchKey = key;

		if (devEuis.length === 0 || !this.#options.accessToken()) {
			this.#pushRecipientOptionsBase = [];
			return;
		}

		const seq = ++this.#pushRecipientFetchSeq;
		this.#options.push
			.getPushRecipientCandidates(devEuis)
			.then((candidates) => {
				if (seq !== this.#pushRecipientFetchSeq) return;
				this.#pushRecipientNames.clear();
				this.#pushRecipientOptionsBase = candidates.map((candidate) => {
					this.#pushRecipientNames.set(candidate.userId, candidate.displayName);
					// Subscription is per user, so it outlives a device-selection change.
					if (candidate.pushEnabled) this.#pushUnsubscribedIds.delete(candidate.userId);
					else this.#pushUnsubscribedIds.add(candidate.userId);
					return {
						value: candidate.userId,
						label: candidate.pushEnabled
							? candidate.displayName
							: `${candidate.displayName}（${m.push_recipient_not_enabled()}）`,
						disabled: !candidate.pushEnabled
					};
				});
				for (const action of this.templateActions) {
					if (action.actionTypeName !== 'Push') continue;
					// Upgrade bare id labels on saved selections now that names are known.
					for (const selection of action.pushRecipients) {
						const name = this.#pushRecipientNames.get(selection.id);
						if (name && selection.label === selection.id) selection.label = name;
					}
				}
			})
			.catch(() => {
				if (seq === this.#pushRecipientFetchSeq) this.#pushRecipientOptionsBase = [];
			});
	}

	// Saved selections must stay visible even when the fetch hasn't landed or
	// the user lost device access (same guard pattern as deviceOptions above).
	pushRecipientOptionsFor(action: EditableTemplateAction) {
		const missing = action.pushRecipients
			.filter((selection) => !this.#pushRecipientOptionsBase.some((o) => o.value === selection.id))
			.map((selection) => ({ value: selection.id, label: selection.label || selection.id }));
		return [...missing, ...this.#pushRecipientOptionsBase];
	}

	// On a new rule, choosing anyone replaces an unsubscribed creator preselect.
	// Existing rules keep every saved recipient: only the person themselves
	// turns their alerts off, and a recipient without a device right now
	// starts receiving again once one registers.
	setPushRecipients(action: EditableTemplateAction, selection: { id: string; label: string }[]) {
		const kept =
			this.#options.mode() === 'create'
				? selection.filter((item) => !this.#pushUnsubscribedIds.has(item.id))
				: selection;
		action.pushRecipients = kept;
		action.config.recipient =
			kept.length > 0 ? JSON.stringify({ userIds: kept.map((item) => item.id) }) : '';
	}

	pushRecipientError(action: EditableTemplateAction): string | undefined {
		const unsubscribed =
			this.#options.mode() === 'create'
				? action.pushRecipients.filter((item) => this.#pushUnsubscribedIds.has(item.id))
				: [];
		if (unsubscribed.length > 0) {
			return m.push_recipient_not_subscribed_error({
				names: unsubscribed
					.map((item) => this.#pushRecipientNames.get(item.id) ?? item.label)
					.join(', ')
			});
		}
		// Nobody to choose from until a device is picked.
		if (action.pushRecipients.length === 0 && this.#selectedDevEuis.length > 0) {
			return m.push_recipient_required_error();
		}
		return undefined;
	}

	createBlankTemplateAction(): EditableTemplateAction {
		const actionType = this.#offeredActionTypes[0];

		return {
			id: 0,
			templateId: this.#initial?.id ?? 0,
			actionType: actionType?.id ?? 0,
			actionTypeName: actionType?.name ?? null,
			actionTypeValue: actionType?.value ?? null,
			config: {
				recipient: ''
			},
			pushRecipients: [],
			createdAt: null
		};
	}

	// New rules default to a Push action with the creator preselected, labelled
	// with their profile name (the recipient list only loads once a device is
	// chosen). Falls back to a blank action while the Push action type doesn't
	// exist yet server-side.
	#createDefaultTemplateAction(): EditableTemplateAction {
		const { currentUserId, currentUserName } = this.#options;
		if (this.#options.mode() === 'create' && currentUserId) {
			const pushType = this.#actions.find((entry) => entry.name === 'Push');
			if (pushType) {
				return {
					id: 0,
					templateId: this.#initial?.id ?? 0,
					actionType: pushType.id,
					actionTypeName: pushType.name,
					actionTypeValue: pushType.value ?? null,
					config: {
						recipient: JSON.stringify({ userIds: [currentUserId] })
					},
					pushRecipients: [{ id: currentUserId, label: currentUserName || currentUserId }],
					createdAt: null
				};
			}
		}
		return this.createBlankTemplateAction();
	}

	#createDeviceSelection(devEui: string): DeviceSelection {
		return {
			id: devEui,
			label: this.#getDeviceLabel(devEui)
		};
	}

	#createDeviceSelections(devEuis: string[]): DeviceSelection[] {
		const seen: string[] = [];
		return devEuis.flatMap((devEui) => {
			const id = devEui.trim();
			if (!id || seen.includes(id)) return [];
			seen.push(id);
			return [this.#createDeviceSelection(id)];
		});
	}

	#getDeviceLabel(devEui: string): string {
		const device = (this.#devices ?? []).find((entry) => entry.dev_eui === devEui);
		return device?.name ? `${device.name} (${devEui})` : devEui;
	}

	#resolveLocationName(locationId: number): string {
		const match = this.#locations.find((loc) => loc.location_id === locationId);
		const name = typeof match?.name === 'string' ? match.name.trim() : '';
		return name || m.locations_location_with_id({ id: String(locationId) });
	}

	#resolveSelectedDeviceTypeId(): number | null {
		const types: number[] = [];
		for (const devEui of this.#selectedDevEuis) {
			const deviceType = (this.#devices ?? []).find((device) => device.dev_eui === devEui)?.type;
			if (
				typeof deviceType === 'number' &&
				Number.isFinite(deviceType) &&
				!types.includes(deviceType)
			) {
				types.push(deviceType);
			}
		}

		return types.length === 1 ? types[0] : null;
	}

	/** A date the user set or changed must lie ahead; one they left alone may just have passed. */
	#isNewPastDate(instant: string | null, initial: string | null): boolean {
		return instant !== null && !sameInstant(instant, initial) && Date.parse(instant) <= Date.now();
	}

	/**
	 * Status, dates and the rule to start: only what the user changed is sent,
	 * and the API keeps the rest. A form that stayed open while the rule paused
	 * on its date therefore cannot start it again, or bring a used date back.
	 */
	#buildStatusPayload(): Partial<RuleTemplateSaveRequest> {
		const editing = this.#options.mode() === 'edit' && this.#initial !== null;
		// Without a pause date there is nothing for the other rule to follow.
		const chainRuleId = this.autoPauseAt === null ? '' : this.chainRuleId;

		return {
			...(editing && this.isActive === this.#initial?.isActive ? {} : { isActive: this.isActive }),
			...(sameInstant(this.autoStartAt, this.#initialAutoStartAt)
				? {}
				: { autoStartAt: this.autoStartAt }),
			...(sameInstant(this.autoPauseAt, this.#initialAutoPauseAt)
				? {}
				: { autoPauseAt: this.autoPauseAt }),
			...(chainRuleId === this.#initialChainRuleId
				? {}
				: { onAutoPauseStartTemplateId: chainRuleId ? Number(chainRuleId) : null })
		};
	}

	/** Whether a re-send may send this action again: a notification, or a relay's timed pulse. */
	canRepeat(action: EditableTemplateAction): boolean {
		const kind = ruleActionKind(action.actionTypeName);
		return canBeRepeated(kind) && (kind !== 'relay' || relayIsTimedPulse(action.config.recipient));
	}

	/** An action's "send again" switch: the choice made, else on for notifications and off for relays. */
	actionRepeats(action: EditableTemplateAction): boolean {
		if (!this.canRepeat(action)) return false;
		const chosen = action.config.repeat;
		return typeof chosen === 'boolean'
			? chosen
			: repeatsByDefault(ruleActionKind(action.actionTypeName));
	}

	/**
	 * The re-send setting, when the user changed it: like the status, an
	 * untouched setting is left to the API. A Date/Time rule has none.
	 */
	#buildResendPayload(): Partial<RuleTemplateSaveRequest> {
		if (this.isDateTime) return {};
		const after = this.resendActive ? this.#resendEveryValue : null;
		// The cap is only shown, and only checked, while re-send is on.
		const max = this.resendActive
			? (this.#resendMaxValue ?? this.#initialResendMax)
			: this.#initialResendMax;

		return {
			...(after === this.#initialResendAfterReports ? {} : { resendAfterReports: after }),
			...(max === this.#initialResendMax ? {} : { resendMax: max })
		};
	}

	#buildActionPayload(action: EditableTemplateAction): RuleTemplateActionInput {
		return {
			id: action.id > 0 ? action.id : null,
			actionType: action.actionType,
			config: {
				...action.config,
				recipient: action.config.recipient.trim(),
				// With re-send on, every action that could be sent again says whether it is.
				...(this.resendActive && canBeRepeated(ruleActionKind(action.actionTypeName))
					? { repeat: this.actionRepeats(action) }
					: {})
			}
		};
	}

	#buildPayload(): RuleTemplateSaveRequest {
		return {
			name: this.ruleName.trim(),
			description: this.description.trim() || null,
			...this.#buildStatusPayload(),
			...this.#buildResendPayload(),
			// A Date/Time rule has a schedule in place of devices and conditions.
			// `triggerKind` is only sent for it: an older API does not know the field.
			...(this.isDateTime
				? {
						deviceTypeId: null,
						triggerKind: 'schedule' as const,
						schedule: this.schedule,
						devEuis: [],
						criteria: []
					}
				: {
						deviceTypeId: this.#selectedDeviceTypeId,
						devEuis: this.#selectedDevEuis,
						criteria: this.#criteriaForTest
					}),
			actions: this.templateActions.map((action) => this.#buildActionPayload(action))
		};
	}

	#isActionValid(action: EditableTemplateAction): boolean {
		if (!isValidActionTypeId(action.actionType)) return false;
		const kind = ruleActionKind(action.actionTypeName);
		if (this.isDateTime && !allowedOnDateTimeRule(kind)) return false;
		if (kind === 'deactivate_self') return true;
		if (switchesAnotherRule(kind)) return readTargetTemplateId(action.config) !== null;
		return (
			action.config.recipient.trim().length > 0 &&
			(action.actionTypeName !== 'Push' ||
				(action.pushRecipients.length > 0 && this.pushRecipientError(action) === undefined))
		);
	}

	/**
	 * Chooses the Data Field of a condition. Choosing Date/Time for the first
	 * one turns the rule into a Date/Time rule: its devices go, and so do the
	 * actions such a rule cannot run (a blank one takes their place).
	 */
	selectSubject(index: number, value: string): void {
		const group = this.criteriaGroups[index];
		if (!group) return;
		group.subject = value;
		if (index !== 0 || value !== DATE_TIME_SUBJECT) return;

		this.criteriaGroups = [group];
		this.selectedDevices = [];
		const kept = this.templateActions.filter((action) =>
			allowedOnDateTimeRule(ruleActionKind(action.actionTypeName))
		);
		this.templateActions = kept.length > 0 ? kept : [this.createBlankTemplateAction()];
	}

	/** The rules to choose from; a saved target that is no longer on offer stays visible. */
	switchTargetOptionsFor(action: EditableTemplateAction) {
		const selected = this.switchTargetValue(action);
		return selected && !this.#switchTargetOptionsBase.some((option) => option.value === selected)
			? [
					{ label: m.rules_auto_then_unknown({ id: selected }), value: selected },
					...this.#switchTargetOptionsBase
				]
			: this.#switchTargetOptionsBase;
	}

	switchTargetValue(action: EditableTemplateAction): string {
		const target = readTargetTemplateId(action.config);
		return target === null ? '' : String(target);
	}

	setSwitchTarget(action: EditableTemplateAction, value: string): void {
		const target = Number(value);
		if (Number.isSafeInteger(target) && target > 0) {
			action.config.targetTemplateId = target;
			action.config.recipient = String(target);
		} else {
			delete action.config.targetTemplateId;
			action.config.recipient = '';
		}
	}

	async handleSubmit(): Promise<void> {
		if (!this.isFormValid || this.submitting) return;
		this.submitting = true;

		try {
			if (this.#options.mode() === 'edit' && this.#initial) {
				await this.#options.rules.updateRuleTemplate(this.#initial.id, this.#buildPayload());
				this.#options.toast.add({
					tone: 'success',
					message: m.rules_new_updated_success({ name: this.ruleName.trim() }),
					duration: 4000,
					dismissible: true
				});
			} else {
				await this.#options.rules.createRuleTemplate(this.#buildPayload());
				this.#options.toast.add({
					tone: 'success',
					message: m.rules_new_created_success({ name: this.ruleName.trim() }),
					duration: 4000,
					dismissible: true
				});
			}

			// The rule is saved: a failed navigation must not be reported as a failed save.
			await this.#options.goto(resolve('/rules')).catch((error: unknown) => {
				console.error('Failed to open the rules list after saving:', error);
			});
		} catch (error) {
			this.#options.toast.add({
				tone: 'danger',
				message: apiErrorMessage(error, m.rules_new_save_failed()),
				duration: 5000,
				dismissible: true
			});
		} finally {
			this.submitting = false;
		}
	}

	actionTypeOptionsFor(action: EditableTemplateAction) {
		const selectedValue = String(action.actionType);

		if (
			!isValidActionTypeId(action.actionType) ||
			this.#actionTypeOptions.some((option) => option.value === selectedValue)
		) {
			return this.#actionTypeOptions;
		}

		return [
			{
				label: actionTypeLabel(action.actionTypeName ?? action.actionTypeValue ?? selectedValue),
				value: selectedValue
			},
			...this.#actionTypeOptions
		];
	}

	selectActionType(action: EditableTemplateAction, value: string) {
		const selectedAction = this.#actions.find((entry) => String(entry.id) === value);
		const parsedActionType = Number(value);
		const wasLine = action.actionTypeName === 'LINE';
		const wasPush = action.actionTypeName === 'Push';
		const previousKind = ruleActionKind(action.actionTypeName);

		action.actionType =
			selectedAction?.id ?? (Number.isInteger(parsedActionType) ? parsedActionType : 0);
		action.actionTypeName = selectedAction?.name ?? null;
		action.actionTypeValue = selectedAction?.value ?? null;
		// "Send again" belongs to the type it was chosen for: the new type starts
		// from its own default (a relay is not sent again unless switched on).
		delete action.config.repeat;

		// A rule switch keeps its target while it stays a "… another rule" action;
		// anything else starts from an empty setting.
		const kind = ruleActionKind(action.actionTypeName);
		if (kind === 'deactivate_self') {
			action.config = { recipient: 'self' };
		} else if (
			(switchesAnotherRule(kind) || switchesAnotherRule(previousKind)) &&
			!(switchesAnotherRule(kind) && switchesAnotherRule(previousKind))
		) {
			action.config = { recipient: '' };
		} else if (previousKind === 'deactivate_self') {
			action.config = { recipient: '' };
		}

		// A saved LINE action's recipient list means nothing to the other types.
		if (wasLine) action.config.recipient = '';
		// Switching to or away from Push always requires a fresh recipient choice.
		if (action.actionTypeName === 'Push' || wasPush) {
			this.setPushRecipients(action, []);
		}
	}
}

function parseRecipientUserIds(recipient: string): string[] {
	try {
		const parsed: unknown = JSON.parse(recipient);
		if (
			typeof parsed === 'object' &&
			parsed !== null &&
			Array.isArray((parsed as { userIds?: unknown }).userIds)
		) {
			return ((parsed as { userIds: unknown[] }).userIds ?? []).filter(
				(id): id is string => typeof id === 'string' && id.length > 0
			);
		}
	} catch {
		// Legacy sentinel ('linked-users') or free text — force a fresh choice.
	}
	return [];
}

function createEditableTemplateAction(action: RuleTemplateActionDto): EditableTemplateAction {
	const recipient = readActionRecipient(action);
	const pushRecipients =
		action.actionTypeName === 'Push'
			? parseRecipientUserIds(recipient).map((id) => ({ id, label: id }))
			: [];
	return {
		...action,
		config: {
			...readActionConfig(action.config),
			recipient
		},
		pushRecipients
	};
}

function readActionRecipient(action: RuleTemplateActionDto): string {
	const config = readActionConfig(action.config);
	return (
		readString(config.recipient) ??
		readString(config.action_recipient) ??
		readString(config.to) ??
		''
	);
}

function readActionConfig(config: Json): Record<string, Json | undefined> {
	return isRecord(config) ? config : {};
}

function isValidActionTypeId(value: number): boolean {
	return Number.isInteger(value) && value > 0;
}

function readString(value: Json | undefined): string | null {
	return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function isRecord(value: Json): value is Record<string, Json | undefined> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}
