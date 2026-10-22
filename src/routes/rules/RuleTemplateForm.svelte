<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { getAppContext } from '$lib/appContext.svelte';
	import { AppActionRow, AppFormStack, AppNotice } from '$lib/components/layout';
	import type { RuleFormContextDto } from '$lib/api/api.dtos';
	import { getServices } from '$lib/services/context';
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
	import { cwDropdownLabels, cwMultiSelectLabels } from '$lib/i18n/cwuiLabels';
	import {
		applyAlertPointsChange,
		createBlankAlertCriteriaGroup,
		createRuleTemplateAlertPointsEditorText,
		describeNotEqualPoints
	} from './rule-template-alert-points';
	import {
		RuleTemplateFormController,
		type RuleTemplateFormMode
	} from './rule-template-form.svelte';
	import RelayActions from '$lib/components/rule-actions/Relay-Actions.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import ADD_ICON from '$lib/images/icons/add.svg';

	interface Props {
		mode: RuleTemplateFormMode;
		context: RuleFormContextDto;
		preselectedDevEui?: string | null;
		// Used to preselect the rule creator on the default Push action.
		currentUserId?: string | null;
		/** Shown on the preselected creator chip until the recipient list loads. */
		currentUserName?: string | null;
	}

	let {
		mode,
		context,
		preselectedDevEui = null,
		currentUserId = null,
		currentUserName = null
	}: Props = $props();

	const app = getAppContext();
	const { rules, line, push } = getServices();
	const alertPointsEditorText = createRuleTemplateAlertPointsEditorText();
	const form = new RuleTemplateFormController({
		mode: () => mode,
		context: () => context,
		preselectedDevEui: (() => preselectedDevEui)(),
		currentUserId: (() => currentUserId)(),
		currentUserName: (() => currentUserName)(),
		rules,
		line,
		push,
		// Only with a session: that token is what the services send.
		accessToken: () => app.accessToken,
		toast: useCwToast(),
		goto
	});

	// The recipient options depend on the device selection: refetch when it changes.
	$effect(() => {
		form.syncLineRecipients();
	});

	$effect(() => {
		form.syncPushRecipients();
	});
</script>

<CwCard title={m.rules_new_step_template()} subtitle={m.rules_new_step_template_subtitle()}>
	<AppFormStack padded>
		<CwInput
			id="rule-form-name-input"
			label={m.rules_rule_name()}
			placeholder={m.rules_rule_name_placeholder()}
			bind:value={form.ruleName}
			required
		/>
		<CwTextArea
			id="rule-form-description-textarea"
			label={m.common_description()}
			placeholder={m.rules_new_description_placeholder()}
			rows={3}
			resize="vertical"
			bind:value={form.description}
		/>
		<CwSwitch
			id="rule-form-active-switch"
			label={m.rules_new_active_rule()}
			description={m.rules_new_active_rule_description()}
			bind:checked={form.isActive}
		/>
	</AppFormStack>
</CwCard>

<CwCard title={m.rules_new_step_assignments()} subtitle={m.rules_new_step_assignments_subtitle()}>
	<AppFormStack padded>
		{#if form.deviceOptions.length === 0}
			<AppNotice tone="neutral">
				<p>{m.rules_no_devices_available()}</p>
			</AppNotice>
		{:else}
			<div class="rules-new-form__block" id="device-selection">
				<CwMultiSelect
					labels={cwMultiSelectLabels()}
					id="rule-form-devices-multiselect"
					showAllSelectedItems={true}
					label={m.devices_device()}
					placeholder={m.rules_select_device_placeholder()}
					options={form.deviceOptions}
					groups={form.deviceGroups}
					dropdownHeight="24rem"
					searchPlaceholder={m.rules_filter_device_placeholder()}
					noResultsLabel={m.cwui_multi_no_matches()}
					bind:value={form.selectedDevices}
					required
				/>
			</div>
		{/if}
	</AppFormStack>
</CwCard>

<CwCard title={m.rules_step_3_title()} subtitle={m.rules_step_3_subtitle()}>
	<AppFormStack padded>
		{#each form.criteriaGroups as group, index (group.localId)}
			{@const notEqualNotice = describeNotEqualPoints(group)}
			<div class="rules-new-form__block">
				<div class="rules-new-form__block-header">
					<span>{m.rules_condition_number({ count: String(index + 1) })}</span>
					{#if form.criteriaGroups.length > 1}
						<CwButton
							id={`rule-form-criteria-${index}-remove-button`}
							variant="danger"
							size="sm"
							onclick={() => form.criteriaGroups.splice(index, 1)}
						>
							{m.action_remove()}
						</CwButton>
					{/if}
				</div>

				<CwDropdown
					labels={cwDropdownLabels()}
					id={`rule-form-criteria-${index}-subject-select`}
					label={m.rules_data_field()}
					options={form.subjectOptions}
					bind:value={group.subject}
					required
				/>
				<CwAlertPointsEditor
					bind:value={group.alertPoints}
					onchange={(value) => applyAlertPointsChange(group, value)}
					text={alertPointsEditorText}
				/>
				{#if notEqualNotice}
					<AppNotice tone="neutral">
						<p>{notEqualNotice}</p>
					</AppNotice>
				{/if}
			</div>
		{/each}

		{#if form.hasUnsupportedCriteria}
			<AppNotice tone="warning">
				<p>{m.rules_new_test_reason_unsupported_operator()}</p>
			</AppNotice>
		{/if}

		<CwButton
			id="rule-form-add-criteria-button"
			variant="secondary"
			type="button"
			onclick={() => {
				form.criteriaGroups.push(createBlankAlertCriteriaGroup(form.nextCriteriaGroupId));
				form.nextCriteriaGroupId += 1;
			}}
		>
			<Icon src={ADD_ICON} alt="" />
			{m.rules_add_condition_for_other_field()}
		</CwButton>
	</AppFormStack>
</CwCard>

<CwCard title={m.rules_new_step_actions()} subtitle={m.rules_new_step_actions_subtitle()}>
	<AppFormStack padded>
		{#each form.templateActions as action, index (action)}
			<div class="rules-new-form__block">
				<div class="rules-new-form__block-header">
					<span>{m.rules_new_action_number({ count: String(index + 1) })}</span>
					{#if form.templateActions.length > 1}
						<CwButton
							id={`rule-form-action-${index}-remove-button`}
							variant="danger"
							size="sm"
							onclick={() => form.templateActions.splice(index, 1)}
						>
							{m.action_remove()}
						</CwButton>
					{/if}
				</div>

				<div class="rules-new-form__actions-grid">
					<CwDropdown
						labels={cwDropdownLabels()}
						id={`rule-form-action-${index}-type-select`}
						label={m.rules_new_action_type()}
						options={form.actionTypeOptionsFor(action)}
						value={String(action.actionType || '')}
						onchange={(value) => form.selectActionType(action, value)}
						required
					/>
					{#if action.actionTypeName === 'EMail'}
						<CwInput
							id={`rule-form-action-${index}-recipient-input`}
							label={m.rules_recipient()}
							placeholder={m.rules_recipient_placeholder()}
							bind:value={action.config.recipient}
							required
						/>
					{:else if action.actionTypeName === 'LoRaWAN'}
						<RelayActions devices={form.deviceOptions} bind:resultJson={action.config.recipient} />
					{:else if action.actionTypeName === 'LINE'}
						<CwMultiSelect
							labels={cwMultiSelectLabels()}
							id={`rule-form-action-${index}-line-recipients`}
							label={m.line_recipient_label()}
							placeholder={m.line_recipient_placeholder()}
							options={form.lineRecipientOptionsFor(action)}
							value={action.lineRecipients}
							onchange={(selection) => form.setLineRecipients(action, selection)}
							searchable
							searchPlaceholder={m.cwui_table_search()}
							noResultsLabel={m.cwui_multi_no_matches()}
							required
						/>
					{:else if action.actionTypeName === 'Push'}
						<CwMultiSelect
							labels={cwMultiSelectLabels()}
							id={`rule-form-action-${index}-push-recipients`}
							label={m.push_recipient_label()}
							placeholder={m.push_recipient_placeholder()}
							options={form.pushRecipientOptionsFor(action)}
							value={action.pushRecipients}
							onchange={(selection) => form.setPushRecipients(action, selection)}
							searchable
							searchPlaceholder={m.cwui_table_search()}
							noResultsLabel={m.cwui_multi_no_matches()}
							error={form.pushRecipientError(action)}
							required
						/>
					{/if}
				</div>
			</div>
		{/each}

		<CwButton
			id="rule-form-add-action-button"
			variant="secondary"
			type="button"
			onclick={() => {
				form.templateActions.push(form.createBlankTemplateAction());
			}}
		>
			{m.rules_new_add_action()}
		</CwButton>
	</AppFormStack>
</CwCard>

<CwCard title={mode === 'edit' ? m.rules_step_4_review_save_title() : m.rules_step_4_title()}>
	<AppFormStack padded>
		{#if form.isFormValid}
			<AppNotice title={m.rules_rule_summary()} tone="info">
				<dl class="rules-new-form__summary">
					<dt>{m.common_name()}:</dt>
					<dd>{form.ruleName}</dd>
					<dt>{m.rules_new_status()}:</dt>
					<dd>{form.isActive ? m.rules_new_active() : m.rules_new_inactive()}</dd>
					<dt>{m.rules_new_assigned_devices()}:</dt>
					<dd>{form.assignmentSummary}</dd>
					<dt>{m.rules_conditions()}:</dt>
					<dd>{form.criteriaSummary}</dd>
					{#if form.showAdvanced}
						<dt>{m.rules_new_actions()}:</dt>
						<dd>
							{form.actionSummary}
							<CwButton
								id="rule-form-advanced-hide-button"
								variant="secondary"
								size="sm"
								onclick={() => (form.showAdvanced = !form.showAdvanced)}
							>
								{m.common_hide_details()}
							</CwButton>
						</dd>
					{:else}
						<CwButton
							id="rule-form-advanced-show-button"
							variant="secondary"
							size="sm"
							onclick={() => (form.showAdvanced = !form.showAdvanced)}
						>
							{m.common_show_details()}
						</CwButton>
					{/if}
				</dl>
			</AppNotice>
		{:else}
			<AppNotice tone="neutral">
				<p>{m.rules_complete_required_fields()}</p>
			</AppNotice>
		{/if}

		<CwSeparator />

		<AppActionRow>
			<CwButton
				id="rule-form-cancel-button"
				variant="ghost"
				onclick={() => goto(resolve('/rules'))}
				disabled={form.submitting}
			>
				{m.action_cancel()}
			</CwButton>
			<CwButton
				id="rule-form-submit-button"
				variant="primary"
				onclick={() => form.handleSubmit()}
				disabled={!form.isFormValid || form.submitting}
				loading={form.submitting}
			>
				{form.submitting
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
