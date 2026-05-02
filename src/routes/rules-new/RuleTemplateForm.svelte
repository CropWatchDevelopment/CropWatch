<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { readApiErrorMessage } from '$lib/api/api-error';
	import { ApiService } from '$lib/api/api.service';
	import { AppActionRow, AppFormStack, AppNotice } from '$lib/components/layout';
	import type {
		Json,
		RuleActionTypeDto,
		RuleTemplateActionDto,
		RuleTemplateActionInput,
		RuleTemplateDto,
		RuleTemplateSaveRequest
	} from '$lib/rules-new/rule-template.types';
	import type { DeviceDto } from '$lib/api/api.dtos';
	import { getRuleOperatorOptions, getRuleSubjectOptions } from '$lib/i18n/options';
	import {
		CwAlertPointsEditor,
		CwButton,
		CwCard,
		CwDropdown,
		CwInput,
		CwMultiSelect,
		CwSeparator,
		CwSwitch,
		CwTextArea,
		useCwToast
	} from '@cropwatchdevelopment/cwui';
	import { m } from '$lib/paraglide/messages.js';
	import RuleTemplateTest from './RuleTemplateTest.svelte';
	import {
		areAlertCriteriaGroupsValid,
		buildInitialAlertCriteriaGroups,
		buildRuleTemplateCriteriaFromAlertGroups,
		createBlankAlertCriteriaGroup,
		createRuleTemplateAlertPointsEditorText,
		ensureAlertPointsIncludeReset,
		hasUnsupportedAlertPointConditions
	} from './rule-template-alert-points';
	import RelayActions from '$lib/components/rule-actions/Relay-Actions.svelte';

	type FormMode = 'create' | 'edit';

	interface Props {
		mode: FormMode;
		devices: DeviceDto[];
		actionTypes: RuleActionTypeDto[];
		authToken?: string | null;
		initialTemplate?: RuleTemplateDto | null;
		preselectedDevEui?: string | null;
	}

	interface DeviceSelection {
		id: string;
		label: string;
	}

	interface RuleTemplateActionConfig {
		recipient: string;
		[key: string]: Json | undefined;
	}

	type EditableTemplateAction = Omit<RuleTemplateActionDto, 'config'> & {
		config: RuleTemplateActionConfig;
	};

	let {
		mode,
		devices,
		actionTypes: actions,
		authToken = null,
		initialTemplate = null,
		preselectedDevEui = null
	}: Props = $props();

	const initial = (() => initialTemplate)();
	const preselectedDevice = (() => preselectedDevEui)();
	const toast = useCwToast();
	const SUBJECT_OPTIONS = getRuleSubjectOptions();
	const OPERATORS = getRuleOperatorOptions();
	const alertPointsEditorText = createRuleTemplateAlertPointsEditorText();

	let ruleName = $state(initial?.name ?? '');
	let description = $state(initial?.description ?? '');
	let isActive = $state(initial?.isActive ?? true);
	let submitting = $state(false);

	let selectedDevices = $state<DeviceSelection[]>(
		initial?.assignments.length
			? createDeviceSelections(initial.assignments.map((assignment) => assignment.devEui))
			: preselectedDevice
				? [createDeviceSelection(preselectedDevice)]
				: []
	);

	const initialCriteriaGroups = buildInitialAlertCriteriaGroups(initial?.criteria ?? []);
	let nextCriteriaGroupId = $state(initialCriteriaGroups.length + 1);
	let criteriaGroups = $state(initialCriteriaGroups);

	let templateActions = $state<EditableTemplateAction[]>(
		initial?.actions.length
			? initial.actions.map(createEditableTemplateAction)
			: [createBlankTemplateAction()]
	);

	let actionTypeOptions = $derived(
		actions
			.filter((actionType) => isValidActionTypeId(actionType.id))
			.map((actionType) => ({
				label: actionType.name,
				value: String(actionType.id)
			}))
	);
	let deviceOptionsBase = $derived(
		(devices ?? []).map((device) => ({
			label: device.name ? `${device.name} (${device.dev_eui})` : device.dev_eui,
			value: device.dev_eui
		}))
	);
	let deviceOptions = $derived([
		...selectedDevices
			.filter((device) => !deviceOptionsBase.some((option) => option.value === device.id))
			.map((device) => ({
				label: device.label || getDeviceLabel(device.id),
				value: device.id
			})),
		...deviceOptionsBase
	]);

	let selectedDevEuis = $derived(selectedDevices.map((device) => device.id.trim()).filter(Boolean));
	let selectedDeviceTypeId = $derived(resolveSelectedDeviceTypeId());
	let criteriaForTest = $derived(buildRuleTemplateCriteriaFromAlertGroups(criteriaGroups));
	let hasUnsupportedCriteria = $derived(hasUnsupportedAlertPointConditions(criteriaGroups));
	let isFormValid = $derived(
		ruleName.trim().length > 0 &&
			selectedDevEuis.length > 0 &&
			!hasUnsupportedCriteria &&
			areAlertCriteriaGroupsValid(criteriaGroups) &&
			templateActions.every(
				(action) =>
					isValidActionTypeId(action.actionType) && action.config.recipient.trim().length > 0
			)
	);
	let assignmentSummary = $derived(
		selectedDevices
			.map((device) => device.label || getDeviceLabel(device.id))
			.filter(Boolean)
			.join(', ')
	);
	let criteriaPreview = $derived(
		criteriaForTest.map((criterion) => {
			const label = SUBJECT_OPTIONS.find((option) => option.value === criterion.subject)?.label;
			const operatorLabel =
				OPERATORS.find((option) => option.value === criterion.operator)?.label ??
				criterion.operator;
			return `${label ?? criterion.subject} ${operatorLabel} ${criterion.triggerValue} (${m.rules_reset_value()}: ${criterion.resetValue})`;
		})
	);
	let criteriaSummary = $derived(criteriaPreview.join(', '));
	let actionPreview = $derived(
		templateActions.map((action) => {
			return `${getActionTypeLabel(action)}: ${action.config.recipient}`;
		})
	);
	let actionSummary = $derived(actionPreview.join(', '));

	function createBlankTemplateAction(): EditableTemplateAction {
		const actionType = actions[0];

		return {
			id: 0,
			templateId: initial?.id ?? 0,
			actionType: actionType?.id ?? 0,
			actionTypeName: actionType?.name ?? null,
			actionTypeValue: actionType?.value ?? null,
			config: {
				recipient: ''
			},
			createdAt: null
		};
	}

	function createEditableTemplateAction(action: RuleTemplateActionDto): EditableTemplateAction {
		return {
			...action,
			config: {
				...readActionConfig(action.config),
				recipient: readActionRecipient(action)
			}
		};
	}

	function createDeviceSelection(devEui: string): DeviceSelection {
		return {
			id: devEui,
			label: getDeviceLabel(devEui)
		};
	}

	function createDeviceSelections(devEuis: string[]): DeviceSelection[] {
		const seen: string[] = [];
		return devEuis.flatMap((devEui) => {
			const id = devEui.trim();
			if (!id || seen.includes(id)) return [];
			seen.push(id);
			return [createDeviceSelection(id)];
		});
	}

	function getDeviceLabel(devEui: string): string {
		const device = devices.find((entry) => entry.dev_eui === devEui);
		return device?.name ? `${device.name} (${devEui})` : devEui;
	}

	function resolveSelectedDeviceTypeId(): number | null {
		const types: number[] = [];
		for (const devEui of selectedDevEuis) {
			const deviceType = devices.find((device) => device.dev_eui === devEui)?.type;
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

	function buildPayload(): RuleTemplateSaveRequest {
		return {
			name: ruleName.trim(),
			description: description.trim() || null,
			deviceTypeId: selectedDeviceTypeId,
			isActive,
			devEuis: selectedDevEuis,
			criteria: criteriaForTest,
			actions: templateActions.map(buildActionPayload)
		};
	}

	function buildActionPayload(action: EditableTemplateAction): RuleTemplateActionInput {
		if (!isValidActionTypeId(action.actionType)) {
			throw new Error('Action type is required.');
		}

		return {
			id: action.id > 0 ? action.id : null,
			actionType: action.actionType,
			config: {
				...action.config,
				recipient: action.config.recipient.trim()
			}
		};
	}

	async function handleSubmit() {
		if (!isFormValid || submitting) return;
		submitting = true;

		try {
			const api = new ApiService({ authToken });

			if (mode === 'edit' && initial) {
				await api.updateRuleTemplate(initial.id, buildPayload());
				toast.add({
					tone: 'success',
					message: m.rules_new_updated_success({ name: ruleName.trim() }),
					duration: 4000,
					dismissible: true
				});
			} else {
				await api.createRuleTemplate(buildPayload());
				toast.add({
					tone: 'success',
					message: m.rules_new_created_success({ name: ruleName.trim() }),
					duration: 4000,
					dismissible: true
				});
			}

			await goto(resolve('/rules-new'));
		} catch (error) {
			toast.add({
				tone: 'danger',
				message: readApiErrorMessage(error, m.rules_new_save_failed()),
				duration: 5000,
				dismissible: true
			});
		} finally {
			submitting = false;
		}
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

	function actionTypeOptionsFor(action: EditableTemplateAction) {
		const selectedValue = String(action.actionType);

		if (
			!isValidActionTypeId(action.actionType) ||
			actionTypeOptions.some((option) => option.value === selectedValue)
		) {
			return actionTypeOptions;
		}

		return [
			{
				label: action.actionTypeName ?? action.actionTypeValue ?? selectedValue,
				value: selectedValue
			},
			...actionTypeOptions
		];
	}

	function selectActionType(action: EditableTemplateAction, value: string) {
		const selectedAction = actions.find((entry) => String(entry.id) === value);
		const parsedActionType = Number(value);

		action.actionType =
			selectedAction?.id ?? (Number.isInteger(parsedActionType) ? parsedActionType : 0);
		action.actionTypeName = selectedAction?.name ?? null;
		action.actionTypeValue = selectedAction?.value ?? null;
	}

	function getActionTypeLabel(action: EditableTemplateAction): string {
		return (
			actions.find((entry) => entry.id === action.actionType)?.name ??
			action.actionTypeName ??
			action.actionTypeValue ??
			String(action.actionType)
		);
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
</script>

<CwCard title={m.rules_new_step_template()} subtitle={m.rules_new_step_template_subtitle()}>
	<AppFormStack padded>
		<CwInput
			label={m.rules_rule_name()}
			placeholder={m.rules_rule_name_placeholder()}
			bind:value={ruleName}
			required
		/>
		<CwTextArea
			label={m.common_description()}
			placeholder={m.rules_new_description_placeholder()}
			rows={3}
			resize="vertical"
			bind:value={description}
		/>
		<CwSwitch
			label={m.rules_new_active_rule()}
			description={m.rules_new_active_rule_description()}
			bind:checked={isActive}
		/>
	</AppFormStack>
</CwCard>

<CwCard title={m.rules_new_step_assignments()} subtitle={m.rules_new_step_assignments_subtitle()}>
	<AppFormStack padded>
		{#if deviceOptions.length === 0}
			<AppNotice tone="neutral">
				<p>{m.rules_no_devices_available()}</p>
			</AppNotice>
		{:else}
			<div class="rules-new-form__block">
				<CwMultiSelect
					showAllSelectedItems={true}
					label={m.devices_device()}
					placeholder={m.rules_select_device_placeholder()}
					options={deviceOptions}
					bind:value={selectedDevices}
					required
				/>
			</div>
		{/if}
	</AppFormStack>
</CwCard>

<CwCard title={m.rules_step_3_title()} subtitle={m.rules_step_3_subtitle()}>
	<AppFormStack padded>
		{#each criteriaGroups as group, index (group.localId)}
			<div class="rules-new-form__block">
				<div class="rules-new-form__block-header">
					<span>{m.rules_condition_number({ count: String(index + 1) })}</span>
					{#if criteriaGroups.length > 1}
						<CwButton variant="danger" size="sm" onclick={() => criteriaGroups.splice(index, 1)}>
							{m.action_remove()}
						</CwButton>
					{/if}
				</div>

				<CwDropdown
					label={m.rules_data_field()}
					options={SUBJECT_OPTIONS}
					bind:value={group.subject}
					required
				/>
				<CwAlertPointsEditor
					bind:value={group.alertPoints}
					onchange={(value) => (group.alertPoints = ensureAlertPointsIncludeReset(value))}
					text={alertPointsEditorText}
				/>
			</div>
		{/each}

		{#if hasUnsupportedCriteria}
			<AppNotice tone="warning">
				<p>{m.rules_new_test_reason_unsupported_operator()}</p>
			</AppNotice>
		{/if}

		<CwButton
			variant="secondary"
			type="button"
			onclick={() => {
				criteriaGroups.push(createBlankAlertCriteriaGroup(nextCriteriaGroupId));
				nextCriteriaGroupId += 1;
			}}
		>
			{m.rules_add_another_condition()}
		</CwButton>
	</AppFormStack>
</CwCard>

<CwCard title={m.rules_new_step_actions()} subtitle={m.rules_new_step_actions_subtitle()}>
	<AppFormStack padded>
		{#each templateActions as action, index (action)}
			<div class="rules-new-form__block">
				<div class="rules-new-form__block-header">
					<span>{m.rules_new_action_number({ count: String(index + 1) })}</span>
					{#if templateActions.length > 1}
						<CwButton variant="danger" size="sm" onclick={() => templateActions.splice(index, 1)}>
							{m.action_remove()}
						</CwButton>
					{/if}
				</div>

				<div class="rules-new-form__actions-grid">
					<CwDropdown
						label={m.rules_new_action_type()}
						options={actionTypeOptionsFor(action)}
						value={String(action.actionType || '')}
						onchange={(value) => selectActionType(action, value)}
						required
					/>
					{#if action.actionTypeName === 'EMail'}
						<CwInput
							label={m.rules_recipient()}
							placeholder={m.rules_recipient_placeholder()}
							bind:value={action.config.recipient}
							required
						/>
					{:else if action.actionTypeName === 'LoRaWAN'}
						<RelayActions devices={deviceOptions} />
					{/if}
				</div>
			</div>
		{/each}

		<CwButton
			variant="secondary"
			type="button"
			onclick={() => {
				templateActions.push(createBlankTemplateAction());
			}}
		>
			{m.rules_new_add_action()}
		</CwButton>
	</AppFormStack>
</CwCard>

<RuleTemplateTest criteria={criteriaForTest} />

<CwCard title={mode === 'edit' ? m.rules_step_4_review_save_title() : m.rules_step_4_title()}>
	<AppFormStack padded>
		{#if isFormValid}
			<AppNotice title={m.rules_rule_summary()} tone="info">
				<dl class="rules-new-form__summary">
					<dt>{m.common_name()}:</dt>
					<dd>{ruleName}</dd>
					<dt>{m.rules_new_status()}:</dt>
					<dd>{isActive ? m.rules_new_active() : m.rules_new_inactive()}</dd>
					<dt>{m.rules_new_assigned_devices()}:</dt>
					<dd>{assignmentSummary}</dd>
					<dt>{m.rules_conditions()}:</dt>
					<dd>{criteriaSummary}</dd>
					<dt>{m.rules_new_actions()}:</dt>
					<dd>{actionSummary}</dd>
				</dl>
			</AppNotice>
		{:else}
			<AppNotice tone="neutral">
				<p>{m.rules_complete_required_fields()}</p>
			</AppNotice>
		{/if}

		<CwSeparator />

		<AppActionRow>
			<CwButton variant="ghost" onclick={() => goto(resolve('/rules-new'))} disabled={submitting}>
				{m.action_cancel()}
			</CwButton>
			<CwButton
				variant="primary"
				onclick={handleSubmit}
				disabled={!isFormValid || submitting}
				loading={submitting}
			>
				{submitting
					? m.action_saving()
					: mode === 'edit'
						? m.action_save_changes()
						: m.rules_create_rule()}
			</CwButton>
		</AppActionRow>
	</AppFormStack>
</CwCard>

<style>
	.rules-new-form__block {
		display: grid;
		gap: var(--cw-space-3);
		padding: var(--cw-space-3);
		border: 1px solid var(--cw-border-muted);
		border-radius: var(--cw-radius-lg);
		background: var(--cw-bg-subtle);
	}

	.rules-new-form__block-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--cw-space-3);
		font-size: var(--cw-text-sm);
		font-weight: var(--cw-font-semibold);
	}

	.rules-new-form__actions-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--cw-space-3);
	}

	.rules-new-form__summary {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr);
		gap: var(--cw-space-2) var(--cw-space-4);
		font-size: var(--cw-text-sm);
	}

	.rules-new-form__summary dt {
		font-weight: var(--cw-font-semibold);
		color: var(--cw-text-secondary);
	}

	.rules-new-form__summary dd {
		margin: 0;
		min-width: 0;
	}

	@media (min-width: 640px) {
		.rules-new-form__actions-grid {
			grid-template-columns: minmax(10rem, 0.8fr) minmax(0, 1.2fr);
		}
	}

	@media (max-width: 639px) {
		.rules-new-form__summary {
			grid-template-columns: 1fr;
		}
	}
</style>
