<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { getAppContext } from '#lib/appContext.svelte.ts';
	import { AppActionRow, AppFormStack, AppNotice } from '#lib/components/layout/index.ts';
	import type { RuleFormContextDto } from '#lib/api/api.dtos.ts';
	import { getServices } from '#lib/services/context.ts';
	import {
		CwButton,
		CwCard,
		CwDateTimeRangePicker,
		CwDropdown,
		CwInput,
		CwMultiSelect,
		CwRuleCondition,
		CwSeparator,
		CwSwitch,
		CwTextArea,
		CwTimePicker,
		useCwToast
	} from '@cropwatchdevelopment/cwui';
	import { m } from '#lib/paraglide/messages.js';
	import {
		cwDateTimeRangePickerLabels,
		cwDropdownLabels,
		cwInputLabels,
		cwMultiSelectLabels,
		cwTimePickerLabels
	} from '#lib/i18n/cwuiLabels.ts';
	import { ruleActionKind, switchesAnotherRule } from './rule-action-types.ts';
	import {
		RESEND_REPORTS_MAX,
		RESEND_REPORTS_MIN,
		RESEND_TIMES_MAX,
		RESEND_TIMES_MIN,
		canBeRepeated
	} from './rule-resend.ts';
	import { getIntlLocale, getUiLocale } from '#lib/i18n/format.ts';
	import { ruleResetHelpUrl } from '#lib/i18n/help-urls.ts';
	import { getRuleSubjectUnit, isTemperatureSubject, ruleSubjectName } from '#lib/i18n/options.ts';
	import { formatRuleInstant } from './rule-status.ts';
	import {
		applyAlertPointsChange,
		createBlankAlertCriteriaGroup,
		describeNotEqualPoints
	} from './rule-template-alert-points';
	import {
		RuleTemplateFormController,
		type RuleTemplateFormMode
	} from './rule-template-form.svelte';
	import RelayActions from '#lib/components/rule-actions/Relay-Actions.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import ADD_ICON from '#lib/images/icons/add.svg';

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
	const { rules, push } = getServices();
	const form = new RuleTemplateFormController({
		mode: () => mode,
		context: () => context,
		preselectedDevEui: (() => preselectedDevEui)(),
		currentUserId: (() => currentUserId)(),
		currentUserName: (() => currentUserName)(),
		rules,
		push,
		// Only with a session: that token is what the services send.
		accessToken: () => app.accessToken,
		toast: useCwToast(),
		goto
	});

	// The calendar offers today and later; the time of day is checked by the form.
	const today = new Date();

	// The recipient options depend on the device selection: refetch when it changes.
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

		<div class="rules-new-form__block" id="rule-form-auto-dates">
			<div class="rules-new-form__block-header">
				<span>{m.rules_auto_section_title()}</span>
			</div>
			<p class="rules-new-form__hint">{m.rules_auto_section_hint({ zone: form.timeZone })}</p>

			<div class="rules-new-form__dates-grid">
				<div class="rules-new-form__date">
					<CwDateTimeRangePicker
						id="rule-form-auto-start-picker"
						label={m.rules_auto_start_label()}
						hint={form.autoStartAt
							? m.rules_auto_start_at_hint({ date: formatRuleInstant(form.autoStartAt) })
							: m.rules_auto_start_hint()}
						error={form.autoStartError}
						locale={getIntlLocale()}
						mode="single"
						includeTime
						minDate={today}
						maxDate={null}
						bind:value={form.autoStart}
						labels={cwDateTimeRangePickerLabels()}
					/>
					{#if form.autoStart}
						<CwButton
							id="rule-form-auto-start-clear-button"
							variant="ghost"
							size="sm"
							type="button"
							onclick={() => (form.autoStart = undefined)}
						>
							{m.rules_auto_clear_start()}
						</CwButton>
					{/if}
				</div>
				<div class="rules-new-form__date">
					<CwDateTimeRangePicker
						id="rule-form-auto-pause-picker"
						label={m.rules_auto_pause_label()}
						hint={form.autoPauseAt
							? m.rules_auto_pause_at_hint({ date: formatRuleInstant(form.autoPauseAt) })
							: m.rules_auto_pause_hint()}
						error={form.autoPauseError}
						locale={getIntlLocale()}
						mode="single"
						includeTime
						minDate={today}
						maxDate={null}
						bind:value={form.autoPause}
						labels={cwDateTimeRangePickerLabels()}
					/>
					{#if form.autoPause}
						<CwButton
							id="rule-form-auto-pause-clear-button"
							variant="ghost"
							size="sm"
							type="button"
							onclick={() => (form.autoPause = undefined)}
						>
							{m.rules_auto_clear_pause()}
						</CwButton>
					{/if}
				</div>
			</div>

			{#if form.startDateNeedsPause}
				<AppNotice tone="warning">
					<p>{m.rules_auto_start_while_active()}</p>
				</AppNotice>
			{/if}

			<CwDropdown
				labels={cwDropdownLabels()}
				id="rule-form-auto-then-select"
				label={m.rules_auto_then_label()}
				hint={form.autoPause ? m.rules_auto_then_hint() : m.rules_auto_then_needs_pause()}
				options={form.chainOptions}
				disabled={!form.autoPause}
				bind:value={form.chainRuleId}
			/>
		</div>
	</AppFormStack>
</CwCard>

<CwCard title={m.rules_new_step_assignments()} subtitle={m.rules_new_step_assignments_subtitle()}>
	<AppFormStack padded>
		{#if form.isDateTime}
			<AppNotice tone="neutral">
				<p id="rule-form-date-time-devices-notice">{m.rules_dt_notice_devices()}</p>
			</AppNotice>
		{:else if form.deviceOptions.length === 0}
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
			{#if index > 0}
				<div class="rules-new-form__and">
					<span class="rules-new-form__and-pill">{m.rules_conditions_and()}</span>
					<span>{m.rules_conditions_and_hint()}</span>
				</div>
			{/if}
			<div class="rules-new-form__block rules-new-form__block--condition">
				<div class="rules-new-form__block-header rules-new-form__block-header--condition">
					<span>{m.rules_condition_number({ count: String(index + 1) })}</span>
					{#if form.criteriaGroups.length > 1}
						<CwButton
							id={`rule-form-criteria-${index}-remove-button`}
							variant="ghost"
							size="sm"
							onclick={() => form.criteriaGroups.splice(index, 1)}
						>
							{m.action_remove()}
						</CwButton>
					{/if}
				</div>

				{#snippet subjectSelect()}
					<CwDropdown
						labels={cwDropdownLabels()}
						id={`rule-form-criteria-${index}-subject-select`}
						label={m.rules_data_field()}
						options={index === 0 ? form.firstSubjectOptions : form.subjectOptions}
						value={group.subject}
						onchange={(value) => form.selectSubject(index, value)}
						required
					/>
				{/snippet}

				{#if form.isDateTime}
					{@render subjectSelect()}
					<div class="rules-new-form__schedule" id="rule-form-schedule">
						<CwTimePicker
							label={m.rules_dt_time_label()}
							labels={cwTimePickerLabels()}
							locale={getIntlLocale()}
							bind:value={form.scheduleTime}
							required
						/>
						<CwDropdown
							labels={cwDropdownLabels()}
							id="rule-form-schedule-timezone-select"
							label={m.rules_dt_timezone_label()}
							options={form.timezoneOptions}
							bind:value={form.scheduleTimezone}
							required
						/>
						<!-- Its own row: seven day chips need the width. -->
						<div class="rules-new-form__schedule-days">
							<CwMultiSelect
								labels={cwMultiSelectLabels()}
								id="rule-form-schedule-days-multiselect"
								showAllSelectedItems={true}
								label={m.rules_dt_days_label()}
								placeholder={m.rules_dt_days_placeholder()}
								options={form.weekdayOptions}
								noResultsLabel={m.cwui_multi_no_matches()}
								error={form.scheduleDaysError}
								bind:value={form.scheduleDays}
								required
							/>
						</div>
					</div>
					<p class="rules-new-form__hint">{m.rules_dt_hint({ zone: form.scheduleTimezone })}</p>
				{:else}
					{@const subjectLabel =
						form.subjectOptions.find((option) => option.value === group.subject)?.label ??
						group.subject}
					<CwRuleCondition
						id={`rule-form-criteria-${index}`}
						value={group.alertPoints}
						onchange={(value) => applyAlertPointsChange(group, value)}
						readingName={ruleSubjectName(subjectLabel)}
						temperature={isTemperatureSubject(group.subject)}
						unit={getRuleSubjectUnit(group.subject)}
						helpHref={ruleResetHelpUrl()}
						locale={getUiLocale()}
						reading={subjectSelect}
					/>
					{#if notEqualNotice}
						<AppNotice tone="neutral">
							<p>{notEqualNotice}</p>
						</AppNotice>
					{/if}
				{/if}
			</div>
		{/each}

		{#if form.hasUnsupportedCriteria}
			<AppNotice tone="warning">
				<p>{m.rules_new_test_reason_unsupported_operator()}</p>
			</AppNotice>
		{/if}

		<!-- A Date/Time rule has its schedule and nothing else to compare. -->
		{#if !form.isDateTime}
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
			<p class="rules-new-form__hint rules-new-form__hint--quiet">
				{m.rules_conditions_all_hint()}
			</p>
		{/if}
	</AppFormStack>
</CwCard>

<CwCard title={m.rules_new_step_actions()} subtitle={m.rules_new_step_actions_subtitle()}>
	<AppFormStack padded>
		{#if form.isDateTime}
			<AppNotice tone="info">
				<p id="rule-form-date-time-actions-notice">{m.rules_dt_actions_hint()}</p>
			</AppNotice>
		{:else}
			<div class="rules-new-form__block" id="rule-form-resend">
				<CwSwitch
					id="rule-form-resend-switch"
					label={m.rules_resend_switch()}
					description={m.rules_resend_switch_description()}
					bind:checked={form.resendEnabled}
				/>
				{#if form.resendEnabled}
					<div class="rules-new-form__dates-grid">
						<CwInput
							labels={cwInputLabels()}
							id="rule-form-resend-every-input"
							type="numeric"
							label={m.rules_resend_every_label()}
							hint={m.rules_resend_every_hint()}
							error={form.resendEveryError}
							min={RESEND_REPORTS_MIN}
							max={RESEND_REPORTS_MAX}
							step={1}
							bind:value={form.resendEvery}
							required
						/>
						<CwInput
							labels={cwInputLabels()}
							id="rule-form-resend-max-input"
							type="numeric"
							label={m.rules_resend_max_label()}
							hint={m.rules_resend_max_hint()}
							error={form.resendMaxError}
							min={RESEND_TIMES_MIN}
							max={RESEND_TIMES_MAX}
							step={1}
							bind:value={form.resendMax}
							required
						/>
					</div>
					<p class="rules-new-form__hint" id="rule-form-resend-note">{m.rules_resend_note()}</p>
					{#if form.resendNothingRepeats}
						<AppNotice tone="warning">
							<p id="rule-form-resend-nothing-notice">{m.rules_resend_none_selected()}</p>
						</AppNotice>
					{/if}
				{/if}
			</div>
		{/if}
		{#each form.templateActions as action, index (action)}
			{@const actionKind = ruleActionKind(action.actionTypeName)}
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
					{#if switchesAnotherRule(actionKind)}
						{#if form.switchTargetOptionsFor(action).length === 0}
							<AppNotice tone="neutral">
								<p>{m.rules_switch_no_rules()}</p>
							</AppNotice>
						{:else}
							<CwDropdown
								labels={cwDropdownLabels()}
								id={`rule-form-action-${index}-target-select`}
								label={m.rules_switch_target_label()}
								placeholder={m.rules_switch_target_placeholder()}
								hint={m.rules_switch_other_hint()}
								options={form.switchTargetOptionsFor(action)}
								value={form.switchTargetValue(action)}
								onchange={(value) => form.setSwitchTarget(action, value)}
								required
							/>
						{/if}
					{:else if actionKind === 'deactivate_self'}
						<AppNotice tone="info">
							<p>{m.rules_switch_self_hint()}</p>
						</AppNotice>
					{:else if action.actionTypeName === 'EMail'}
						<CwInput
							id={`rule-form-action-${index}-recipient-input`}
							label={m.rules_recipient()}
							placeholder={m.rules_recipient_placeholder()}
							bind:value={action.config.recipient}
							required
						/>
					{:else if action.actionTypeName === 'LoRaWAN'}
						<RelayActions
							devices={form.deviceOptions}
							revertsOnReset={!form.isDateTime}
							bind:resultJson={action.config.recipient}
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

				{#if form.resendActive && canBeRepeated(actionKind)}
					{@const repeatable = form.canRepeat(action)}
					<CwSwitch
						id={`rule-form-action-${index}-repeat-switch`}
						label={m.rules_resend_action_switch()}
						description={actionKind !== 'relay'
							? undefined
							: repeatable
								? m.rules_resend_action_relay_hint()
								: m.rules_resend_action_relay_fixed()}
						checked={form.actionRepeats(action)}
						disabled={!repeatable}
						onchange={(checked) => (action.config.repeat = checked)}
					/>
				{/if}
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
					{#if form.autoStartAt}
						<dt>{m.rules_auto_start_label()}:</dt>
						<dd>{formatRuleInstant(form.autoStartAt)}</dd>
					{/if}
					{#if form.autoPauseAt}
						<dt>{m.rules_auto_pause_label()}:</dt>
						<dd>{formatRuleInstant(form.autoPauseAt)}</dd>
					{/if}
					{#if form.chainRuleName}
						<dt>{m.rules_auto_then_label()}:</dt>
						<dd>{form.chainRuleName}</dd>
					{/if}
					<dt>{m.rules_new_assigned_devices()}:</dt>
					<dd>{form.assignmentSummary}</dd>
					<dt>{m.rules_conditions()}:</dt>
					<dd>{form.criteriaSummary}</dd>
					{#if form.resendSummary}
						<dt>{m.rules_resend_summary_label()}:</dt>
						<dd id="rule-form-resend-summary">{form.resendSummary}</dd>
					{/if}
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

	/* A condition is one calm panel: the fields, the sentence and the example. */
	.rules-new-form__block--condition {
		gap: var(--cw-space-4);
		padding: var(--cw-space-5);
		border-radius: var(--cw-card-radius);
		background: var(--cw-bg-surface-elevated);
	}

	.rules-new-form__block-header--condition {
		min-height: var(--cw-control-h-sm);
		font-size: var(--cw-text-xs);
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--cw-text-muted);
	}

	.rules-new-form__and {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--cw-space-2) var(--cw-space-3);
		padding: 0 var(--cw-space-5);
		font-size: var(--cw-text-xs);
		color: var(--cw-text-muted);
	}

	.rules-new-form__and-pill {
		display: inline-flex;
		align-items: center;
		height: 1.5rem;
		padding: 0 0.625rem;
		font-size: 0.6875rem;
		font-weight: var(--cw-font-bold);
		letter-spacing: 0.08em;
		color: var(--cw-text-inverse);
		background: var(--cw-accent);
		border-radius: var(--cw-radius-full);
	}

	.rules-new-form__hint--quiet {
		font-size: var(--cw-text-xs);
		color: var(--cw-text-muted);
	}

	.rules-new-form__actions-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--cw-space-3);
	}

	.rules-new-form__hint {
		margin: 0;
		font-size: var(--cw-text-sm);
		color: var(--cw-text-secondary);
	}

	.rules-new-form__dates-grid,
	.rules-new-form__schedule {
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--cw-space-3);
		align-items: start;
	}

	.rules-new-form__date {
		display: grid;
		gap: var(--cw-space-1);
		justify-items: start;
		min-width: 0;
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

		.rules-new-form__dates-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.rules-new-form__schedule {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.rules-new-form__schedule-days {
			grid-column: 1 / -1;
		}
	}

	@media (max-width: 639px) {
		.rules-new-form__summary {
			grid-template-columns: 1fr;
		}
	}
</style>
