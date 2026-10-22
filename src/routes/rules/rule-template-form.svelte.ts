import { resolve } from '$app/paths';
import { SvelteMap, SvelteSet } from 'svelte/reactivity';
import type { CwToastApi } from '@cropwatchdevelopment/cwui';
import { apiErrorMessage } from '$lib/api/api-error';
import type { RuleFormContextDto } from '$lib/api/api.dtos';
import type { LineRepository } from '$lib/api/repositories/line.repository';
import type { PushRepository } from '$lib/api/repositories/push.repository';
import type { RuleRepository } from '$lib/api/repositories/rules.repository';
import { getRuleOperatorOptions, getRuleSubjectOptions } from '$lib/i18n/options';
import { m } from '$lib/paraglide/messages.js';
import type {
	Json,
	RuleTemplateActionDto,
	RuleTemplateActionInput,
	RuleTemplateDto,
	RuleTemplateSaveRequest
} from '$lib/rules/rule-template.types';
import { labelFor } from '$lib/sensor-labels';
import {
	areAlertCriteriaGroupsValid,
	buildInitialAlertCriteriaGroups,
	buildRuleTemplateCriteriaFromAlertGroups,
	hasUnsupportedAlertPointConditions,
	type RuleTemplateAlertCriteriaGroup
} from './rule-template-alert-points';

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
	// LINE / Push actions only: the CwMultiSelect selection ({id,label}
	// shape). Serialized into config.recipient as {"userIds":[...]} on change.
	lineRecipients: { id: string; label: string }[];
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
	line: Pick<LineRepository, 'getLineRecipientCandidates'>;
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
 * it and runs {@link syncLineRecipients} / {@link syncPushRecipients} in
 * effects.
 */
export class RuleTemplateFormController {
	readonly #options: RuleTemplateFormOptions;
	readonly #initial: RuleTemplateDto | null;

	readonly subjectOptions = getRuleSubjectOptions();
	readonly #operators = getRuleOperatorOptions();

	readonly #devices = $derived(this.#context().devices);
	readonly #actions = $derived(this.#context().actionTypes);
	readonly #locations = $derived(this.#context().locations);

	ruleName = $state('');
	description = $state('');
	isActive = $state(true);
	submitting = $state(false);
	showAdvanced = $state(false);

	selectedDevices = $state<DeviceSelection[]>([]);

	nextCriteriaGroupId = $state(1);
	criteriaGroups = $state<RuleTemplateAlertCriteriaGroup[]>([]);

	templateActions = $state<EditableTemplateAction[]>([]);

	readonly #actionTypeOptions = $derived(
		this.#actions
			.filter((actionType) => isValidActionTypeId(actionType.id))
			.map((actionType) => ({
				label: actionType.name,
				value: String(actionType.id)
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

	// Eligible LINE recipients for the currently selected devices. This is the
	// only mid-form fetch in this file: the options depend on device selection,
	// which the server-loaded form context cannot know ahead of time. The
	// serialized-key guard doubles as a debounce (CwMultiSelect commits one
	// change per click) and the sequence number drops stale responses.
	#lineRecipientOptionsBase = $state<{ label: string; value: string }[]>([]);
	readonly #lineRecipientNames = new SvelteMap<string, string>();
	#lineRecipientFetchKey = '';
	#lineRecipientFetchSeq = 0;

	// Eligible push recipients — same fetch pattern as the LINE one above,
	// with its own key/seq guard so the two channels never race each other.
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
			this.#selectedDevEuis.length > 0 &&
			!this.hasUnsupportedCriteria &&
			areAlertCriteriaGroupsValid(this.criteriaGroups) &&
			this.templateActions.every(
				(action) =>
					isValidActionTypeId(action.actionType) &&
					action.config.recipient.trim().length > 0 &&
					(action.actionTypeName !== 'LINE' || action.lineRecipients.length > 0) &&
					(action.actionTypeName !== 'Push' ||
						(action.pushRecipients.length > 0 && this.pushRecipientError(action) === undefined))
			)
	);
	readonly assignmentSummary = $derived(
		this.selectedDevices
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
	readonly criteriaSummary = $derived(this.#criteriaPreview.join(', '));
	readonly #actionPreview = $derived(
		this.templateActions.map((action) => {
			const label =
				this.#actions.find((entry) => entry.id === action.actionType)?.name ??
				action.actionTypeName ??
				action.actionTypeValue ??
				String(action.actionType);
			const recipient =
				action.actionTypeName === 'LINE'
					? action.lineRecipients
							.map((item) => this.#lineRecipientNames.get(item.id) ?? item.label ?? item.id)
							.join(', ') ||
						m.line_recipient_preview_count({ count: String(action.lineRecipients.length) })
					: action.actionTypeName === 'Push'
						? action.pushRecipients
								.map((item) => this.#pushRecipientNames.get(item.id) ?? item.label ?? item.id)
								.join(', ') ||
							m.push_recipient_preview_count({ count: String(action.pushRecipients.length) })
						: action.config.recipient;
			return `${label}: ${recipient}`;
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

		this.selectedDevices = initial?.assignments.length
			? this.#createDeviceSelections(initial.assignments.map((assignment) => assignment.devEui))
			: preselectedDevice
				? [this.#createDeviceSelection(preselectedDevice)]
				: [];

		const initialCriteriaGroups = buildInitialAlertCriteriaGroups(initial?.criteria ?? []);
		this.nextCriteriaGroupId = initialCriteriaGroups.length + 1;
		this.criteriaGroups = initialCriteriaGroups;

		this.templateActions = initial?.actions.length
			? initial.actions.map(createEditableTemplateAction)
			: [this.#createDefaultTemplateAction()];
	}

	/**
	 * The `context` prop. A method, so the field deriveds above can read it:
	 * deriveds are lazy and only run after the constructor has stored the options.
	 */
	#context(): RuleFormContextDto {
		return this.#options.context();
	}

	/** Effect body: refetches the eligible LINE recipients when the device selection changes. */
	syncLineRecipients(): void {
		const devEuis = [...this.#selectedDevEuis].sort();
		const key = devEuis.join(',');
		if (key === this.#lineRecipientFetchKey) return;
		this.#lineRecipientFetchKey = key;

		if (devEuis.length === 0 || !this.#options.accessToken()) {
			this.#lineRecipientOptionsBase = [];
			return;
		}

		const seq = ++this.#lineRecipientFetchSeq;
		this.#options.line
			.getLineRecipientCandidates(devEuis)
			.then((candidates) => {
				if (seq !== this.#lineRecipientFetchSeq) return;
				this.#lineRecipientNames.clear();
				this.#lineRecipientOptionsBase = candidates.map((candidate) => {
					this.#lineRecipientNames.set(candidate.userId, candidate.displayName);
					return {
						value: candidate.userId,
						label: candidate.lineLinked
							? candidate.displayName
							: `${candidate.displayName}（${m.line_recipient_not_linked()}）`
					};
				});
				// Upgrade bare id labels on saved selections now that names are known.
				for (const action of this.templateActions) {
					if (action.actionTypeName !== 'LINE') continue;
					for (const selection of action.lineRecipients) {
						const name = this.#lineRecipientNames.get(selection.id);
						if (name && selection.label === selection.id) selection.label = name;
					}
				}
			})
			.catch(() => {
				if (seq === this.#lineRecipientFetchSeq) this.#lineRecipientOptionsBase = [];
			});
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
	lineRecipientOptionsFor(action: EditableTemplateAction) {
		const missing = action.lineRecipients
			.filter((selection) => !this.#lineRecipientOptionsBase.some((o) => o.value === selection.id))
			.map((selection) => ({ value: selection.id, label: selection.label || selection.id }));
		return [...missing, ...this.#lineRecipientOptionsBase];
	}

	setLineRecipients(action: EditableTemplateAction, selection: { id: string; label: string }[]) {
		action.lineRecipients = selection;
		action.config.recipient =
			selection.length > 0 ? JSON.stringify({ userIds: selection.map((item) => item.id) }) : '';
	}

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
		const actionType = this.#actions[0];

		return {
			id: 0,
			templateId: this.#initial?.id ?? 0,
			actionType: actionType?.id ?? 0,
			actionTypeName: actionType?.name ?? null,
			actionTypeValue: actionType?.value ?? null,
			config: {
				recipient: ''
			},
			lineRecipients: [],
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
					lineRecipients: [],
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

	#buildPayload(): RuleTemplateSaveRequest {
		return {
			name: this.ruleName.trim(),
			description: this.description.trim() || null,
			deviceTypeId: this.#selectedDeviceTypeId,
			isActive: this.isActive,
			devEuis: this.#selectedDevEuis,
			criteria: this.#criteriaForTest,
			actions: this.templateActions.map(buildActionPayload)
		};
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
				label: action.actionTypeName ?? action.actionTypeValue ?? selectedValue,
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

		action.actionType =
			selectedAction?.id ?? (Number.isInteger(parsedActionType) ? parsedActionType : 0);
		action.actionTypeName = selectedAction?.name ?? null;
		action.actionTypeValue = selectedAction?.value ?? null;

		// Switching to or away from LINE/Push always requires a fresh recipient choice.
		if (action.actionTypeName === 'LINE' || wasLine) {
			this.setLineRecipients(action, []);
		}
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
	const lineRecipients =
		action.actionTypeName === 'LINE'
			? parseRecipientUserIds(recipient).map((id) => ({ id, label: id }))
			: [];
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
		lineRecipients,
		pushRecipients
	};
}

function buildActionPayload(action: EditableTemplateAction): RuleTemplateActionInput {
	return {
		id: action.id > 0 ? action.id : null,
		actionType: action.actionType,
		config: {
			...action.config,
			recipient: action.config.recipient.trim()
		}
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
