<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { AppActionRow, AppFormStack, AppNotice } from '$lib/components/layout';
	import {
		createRuleTemplate,
		readRuleTemplateApiError,
		updateRuleTemplate
	} from '$lib/rules-new/rule-template-client';
	import type {
		Json,
		RuleTemplateActionDto,
		RuleTemplateCriterionInput,
		RuleTemplateDto,
		RuleTemplateSaveRequest
	} from '$lib/rules-new/rule-template.types';
	import type { DeviceDto } from '$lib/api/api.dtos';
	import {
		getRuleOperatorOptions,
		getRuleSendMethodOptions,
		getRuleSubjectOptions,
		getRuleTemplateActionTypeOptions
	} from '$lib/i18n/options';
	import {
		CwButton,
		CwCard,
		CwChip,
		CwDropdown,
		CwInput,
		CwSeparator,
		CwSwitch,
		CwTextArea,
		useCwToast
	} from '@cropwatchdevelopment/cwui';
	import { m } from '$lib/paraglide/messages.js';
	import RuleTemplateTest from './RuleTemplateTest.svelte';

	type FormMode = 'create' | 'edit';

	interface Props {
		mode: FormMode;
		devices: DeviceDto[];
		initialTemplate?: RuleTemplateDto | null;
		preselectedDevEui?: string | null;
	}

	interface AssignmentEntry {
		localId: number;
		devEui: string;
	}

	interface CriteriaEntry {
		localId: number;
		persistedId: number | null;
		subject: string;
		operator: string;
		triggerValue: string;
		resetValue: string;
	}

	interface ActionEntry {
		localId: number;
		persistedId: number | null;
		actionType: string;
		sendUsing: string;
		recipient: string;
	}

	let { mode, devices, initialTemplate = null, preselectedDevEui = null }: Props = $props();

	const initial = (() => initialTemplate)();
	const preselectedDevice = (() => preselectedDevEui)();
	const toast = useCwToast();
	const OPERATORS = getRuleOperatorOptions();
	const SUBJECT_OPTIONS = getRuleSubjectOptions();
	const ACTION_TYPE_OPTIONS = getRuleTemplateActionTypeOptions();
	const SEND_METHOD_OPTIONS = getRuleSendMethodOptions();

	let ruleName = $state(initial?.name ?? '');
	let description = $state(initial?.description ?? '');
	let isActive = $state(initial?.isActive ?? true);
	let submitting = $state(false);

	let nextAssignmentId = $state((initial?.assignments.length ?? 0) + 1);
	let assignments = $state<AssignmentEntry[]>(
		initial?.assignments.length
			? initial.assignments.map((assignment, index) => ({
					localId: index + 1,
					devEui: assignment.devEui
				}))
			: [
					{
						localId: 1,
						devEui: preselectedDevice ?? ''
					}
				]
	);

	let nextCriteriaId = $state((initial?.criteria.length ?? 0) + 1);
	let criteria = $state<CriteriaEntry[]>(
		initial?.criteria.length
			? initial.criteria.map((criterion, index) => ({
					localId: index + 1,
					persistedId: criterion.id,
					subject: criterion.subject,
					operator: criterion.operator,
					triggerValue: String(criterion.triggerValue),
					resetValue: String(criterion.resetValue)
				}))
			: [createBlankCriterion(1)]
	);

	let nextActionId = $state((initial?.actions.length ?? 0) + 1);
	let actions = $state<ActionEntry[]>(
		initial?.actions.length
			? initial.actions.map((action, index) => ({
					localId: index + 1,
					persistedId: action.id,
					actionType: action.actionType,
					sendUsing: readActionSendUsing(action),
					recipient: readActionRecipient(action)
				}))
			: [createBlankAction(1)]
	);

	let deviceOptionsBase = $derived(
		(devices ?? []).map((device) => ({
			label: device.name ? `${device.name} (${device.dev_eui})` : device.dev_eui,
			value: device.dev_eui
		}))
	);

	let selectedDevEuis = $derived(
		assignments.map((assignment) => assignment.devEui.trim()).filter(Boolean)
	);
	let hasDuplicateDeviceAssignments = $derived(hasDuplicateValues(selectedDevEuis));
	let selectedDeviceTypeId = $derived(resolveSelectedDeviceTypeId());
	let criteriaForTest = $derived(criteria.map(mapCriterionForTest));
	let isFormValid = $derived(
		ruleName.trim().length > 0 &&
			selectedDevEuis.length > 0 &&
			!hasDuplicateDeviceAssignments &&
			criteria.every(isCriterionValid) &&
			actions.every(isActionValid)
	);
	let assignmentPreview = $derived(selectedDevEuis.map(getDeviceLabel));
	let criteriaPreview = $derived(
		criteria.map((criterion) => {
			const label = SUBJECT_OPTIONS.find((option) => option.value === criterion.subject)?.label;
			return `${label ?? criterion.subject} ${criterion.operator} ${criterion.triggerValue}`;
		})
	);
	let actionPreview = $derived(
		actions.map((action) => {
			const label = ACTION_TYPE_OPTIONS.find((option) => option.value === action.actionType)?.label;
			return `${label ?? action.actionType}: ${action.recipient}`;
		})
	);

	function createBlankCriterion(localId: number): CriteriaEntry {
		return {
			localId,
			persistedId: null,
			subject: 'temperature_c',
			operator: '>',
			triggerValue: '',
			resetValue: ''
		};
	}

	function createBlankAction(localId: number): ActionEntry {
		return {
			localId,
			persistedId: null,
			actionType: 'email',
			sendUsing: 'email',
			recipient: ''
		};
	}

	function addAssignment() {
		assignments = [...assignments, { localId: nextAssignmentId, devEui: '' }];
		nextAssignmentId += 1;
	}

	function removeAssignment(localId: number) {
		if (assignments.length <= 1) return;
		assignments = assignments.filter((assignment) => assignment.localId !== localId);
	}

	function addCriterion() {
		criteria = [...criteria, createBlankCriterion(nextCriteriaId)];
		nextCriteriaId += 1;
	}

	function removeCriterion(localId: number) {
		if (criteria.length <= 1) return;
		criteria = criteria.filter((criterion) => criterion.localId !== localId);
	}

	function addAction() {
		actions = [...actions, createBlankAction(nextActionId)];
		nextActionId += 1;
	}

	function removeAction(localId: number) {
		if (actions.length <= 1) return;
		actions = actions.filter((action) => action.localId !== localId);
	}

	function deviceOptionsFor(currentAssignment: AssignmentEntry) {
		const selectedByOtherRows = assignments
			.filter((assignment) => assignment.localId !== currentAssignment.localId)
			.map((assignment) => assignment.devEui)
			.filter(Boolean);

		const options = deviceOptionsBase.map((option) => ({
			...option,
			disabled: selectedByOtherRows.includes(option.value)
		}));

		if (
			currentAssignment.devEui &&
			!options.some((option) => option.value === currentAssignment.devEui)
		) {
			return [
				{
					label: currentAssignment.devEui,
					value: currentAssignment.devEui
				},
				...options
			];
		}

		return options;
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

	function hasDuplicateValues(values: string[]): boolean {
		return values.some((value, index) => values.indexOf(value) !== index);
	}

	function isCriterionValid(criterion: CriteriaEntry): boolean {
		return (
			criterion.subject.trim().length > 0 &&
			criterion.operator.trim().length > 0 &&
			isFiniteNumberText(criterion.triggerValue) &&
			isFiniteNumberText(criterion.resetValue)
		);
	}

	function isActionValid(action: ActionEntry): boolean {
		return action.actionType.trim().length > 0 && action.recipient.trim().length > 0;
	}

	function isFiniteNumberText(value: string): boolean {
		if (!value.trim()) return false;
		return Number.isFinite(Number(value));
	}

	function mapCriterionForTest(criterion: CriteriaEntry): RuleTemplateCriterionInput {
		return {
			id: criterion.persistedId,
			subject: criterion.subject,
			operator: criterion.operator,
			triggerValue: readNumberOrZero(criterion.triggerValue),
			resetValue: readNumberOrZero(criterion.resetValue)
		};
	}

	function readNumberOrZero(value: string): number {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : 0;
	}

	function buildPayload(): RuleTemplateSaveRequest {
		return {
			name: ruleName.trim(),
			description: description.trim() || null,
			deviceTypeId: selectedDeviceTypeId,
			isActive,
			devEuis: selectedDevEuis,
			criteria: criteria.map((criterion) => ({
				id: criterion.persistedId,
				subject: criterion.subject,
				operator: criterion.operator,
				triggerValue: Number(criterion.triggerValue),
				resetValue: Number(criterion.resetValue)
			})),
			actions: actions.map((action) => ({
				id: action.persistedId,
				actionType: action.actionType,
				config: {
					recipient: action.recipient.trim(),
					send_using: action.sendUsing,
					notifier_type: action.actionType
				}
			}))
		};
	}

	async function handleSubmit() {
		if (!isFormValid || submitting) return;
		submitting = true;

		try {
			if (mode === 'edit' && initial) {
				await updateRuleTemplate(initial.id, buildPayload());
				toast.add({
					tone: 'success',
					message: m.rules_new_updated_success({ name: ruleName.trim() }),
					duration: 4000,
					dismissible: true
				});
			} else {
				await createRuleTemplate(buildPayload());
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
				message: readRuleTemplateApiError(error, m.rules_new_save_failed()),
				duration: 5000,
				dismissible: true
			});
		} finally {
			submitting = false;
		}
	}

	function readActionRecipient(action: RuleTemplateActionDto): string {
		const config: Record<string, Json | undefined> = isRecord(action.config) ? action.config : {};
		return (
			readString(config.recipient) ??
			readString(config.action_recipient) ??
			readString(config.to) ??
			''
		);
	}

	function readActionSendUsing(action: RuleTemplateActionDto): string {
		const config: Record<string, Json | undefined> = isRecord(action.config) ? action.config : {};
		return readString(config.send_using) ?? readString(config.sendUsing) ?? action.actionType;
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
		{#if deviceOptionsBase.length === 0}
			<AppNotice tone="neutral">
				<p>{m.rules_no_devices_available()}</p>
			</AppNotice>
		{:else}
			{#each assignments as assignment, index (assignment.localId)}
				<div class="rules-new-form__block">
					<div class="rules-new-form__block-header">
						<span>{m.rules_new_assignment_number({ count: String(index + 1) })}</span>
						{#if assignments.length > 1}
							<CwButton
								variant="danger"
								size="sm"
								onclick={() => removeAssignment(assignment.localId)}
							>
								{m.action_remove()}
							</CwButton>
						{/if}
					</div>
					<CwDropdown
						label={m.devices_device()}
						placeholder={m.rules_select_device_placeholder()}
						options={deviceOptionsFor(assignment)}
						bind:value={assignment.devEui}
						required
					/>
				</div>
			{/each}

			{#if hasDuplicateDeviceAssignments}
				<AppNotice tone="warning">
					<p>{m.rules_new_duplicate_devices()}</p>
				</AppNotice>
			{/if}

			<CwButton
				variant="secondary"
				type="button"
				onclick={addAssignment}
				disabled={assignments.length >= deviceOptionsBase.length}
			>
				{m.rules_new_add_device_assignment()}
			</CwButton>
		{/if}
	</AppFormStack>
</CwCard>

<CwCard title={m.rules_step_3_title()} subtitle={m.rules_step_3_subtitle()}>
	<AppFormStack padded>
		{#each criteria as criterion, index (criterion.localId)}
			<div class="rules-new-form__block">
				<div class="rules-new-form__block-header">
					<span>{m.rules_condition_number({ count: String(index + 1) })}</span>
					{#if criteria.length > 1}
						<CwButton variant="danger" size="sm" onclick={() => removeCriterion(criterion.localId)}>
							{m.action_remove()}
						</CwButton>
					{/if}
				</div>

				<div class="rules-new-form__criteria-grid">
					<CwDropdown
						label={m.rules_data_field()}
						options={SUBJECT_OPTIONS}
						bind:value={criterion.subject}
						required
					/>
					<CwDropdown
						label={m.rules_operator()}
						options={OPERATORS}
						bind:value={criterion.operator}
						required
					/>
					<CwInput
						label={m.rules_trigger_value()}
						type="numeric"
						placeholder={m.rules_trigger_value_placeholder()}
						bind:value={criterion.triggerValue}
						required
					/>
					<CwInput
						label={m.rules_reset_value()}
						type="numeric"
						placeholder={m.rules_reset_value_placeholder()}
						bind:value={criterion.resetValue}
						required
					/>
				</div>
			</div>
		{/each}

		<CwButton variant="secondary" type="button" onclick={addCriterion}>
			{m.rules_add_another_condition()}
		</CwButton>
	</AppFormStack>
</CwCard>

<CwCard title={m.rules_new_step_actions()} subtitle={m.rules_new_step_actions_subtitle()}>
	<AppFormStack padded>
		{#each actions as action, index (action.localId)}
			<div class="rules-new-form__block">
				<div class="rules-new-form__block-header">
					<span>{m.rules_new_action_number({ count: String(index + 1) })}</span>
					{#if actions.length > 1}
						<CwButton variant="danger" size="sm" onclick={() => removeAction(action.localId)}>
							{m.action_remove()}
						</CwButton>
					{/if}
				</div>

				<div class="rules-new-form__actions-grid">
					<CwDropdown
						label={m.rules_new_action_type()}
						options={ACTION_TYPE_OPTIONS}
						bind:value={action.actionType}
						required
					/>
					<CwDropdown
						label={m.rules_send_using()}
						options={SEND_METHOD_OPTIONS}
						bind:value={action.sendUsing}
						required
					/>
					<CwInput
						label={m.rules_recipient()}
						placeholder={m.rules_recipient_placeholder()}
						bind:value={action.recipient}
						required
					/>
				</div>
			</div>
		{/each}

		<CwButton variant="secondary" type="button" onclick={addAction}>
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
					<dd>
						<div class="rules-new-form__chip-list">
							{#each assignmentPreview as assignment (assignment)}
								<CwChip label={assignment} tone="info" variant="soft" size="sm" />
							{/each}
						</div>
					</dd>
					<dt>{m.rules_conditions()}:</dt>
					<dd>
						<div class="rules-new-form__chip-list">
							{#each criteriaPreview as item, index (item + index)}
								<CwChip label={item} tone="warning" variant="soft" size="sm" />
							{/each}
						</div>
					</dd>
					<dt>{m.rules_new_actions()}:</dt>
					<dd>
						<div class="rules-new-form__chip-list">
							{#each actionPreview as action (action)}
								<CwChip label={action} tone="success" variant="soft" size="sm" />
							{/each}
						</div>
					</dd>
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

	.rules-new-form__criteria-grid,
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

	.rules-new-form__chip-list {
		display: flex;
		flex-wrap: wrap;
		gap: var(--cw-space-1);
	}

	@media (min-width: 640px) {
		.rules-new-form__criteria-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.rules-new-form__actions-grid {
			grid-template-columns: minmax(8rem, 0.8fr) minmax(8rem, 0.8fr) minmax(0, 1.4fr);
		}
	}

	@media (max-width: 639px) {
		.rules-new-form__summary {
			grid-template-columns: 1fr;
		}
	}
</style>
