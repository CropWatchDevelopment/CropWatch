<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { ApiService } from '$lib/api/api.service';
	import type { CreateRuleRequest, DeviceDto, RuleDto, UpdateRuleRequest } from '$lib/api/api.dtos';
	import Icon from '$lib/components/Icon.svelte';
	import { AppActionRow, AppFormStack, AppNotice, AppPage } from '$lib/components/layout';
	import SAVE_ICON from '$lib/images/icons/save.svg';
	import {
		getRuleNotifierTypeOptions,
		getRuleOperatorOptions,
		getRuleSendMethodOptions,
		getRuleSubjectOptions
	} from '$lib/i18n/options';
	import { m } from '$lib/paraglide/messages.js';
	import {
		CwButton,
		CwCard,
		CwChip,
		CwDropdown,
		CwInput,
		CwSeparator,
		useCwToast
	} from '@cropwatchdevelopment/cwui';

	type RuleFormMode = 'create' | 'edit';

	interface CriteriaEntry {
		id: number;
		criteriaId: number | null;
		subject: string;
		operator: string;
		triggerValue: string;
		resetValue: string;
	}

	interface Props {
		mode: RuleFormMode;
		devices: DeviceDto[];
		authToken?: string | null;
		initialDevEui?: string | null;
		rule?: RuleDto | null;
	}

	let { mode, devices, authToken = null, initialDevEui = null, rule = null }: Props = $props();

	const initialRule = (() => rule)();
	const startingDevEui = (() => initialDevEui)();
	let isEdit = $derived(mode === 'edit');
	const toast = useCwToast();

	const OPERATORS = getRuleOperatorOptions();
	const NOTIFIER_TYPES = getRuleNotifierTypeOptions();
	const SEND_METHODS = getRuleSendMethodOptions();
	const SUBJECT_OPTIONS = getRuleSubjectOptions();

	let ruleName = $state(initialRule?.name ?? '');
	let actionRecipient = $state(initialRule?.action_recipient ?? '');
	let notifierType = $state(String(initialRule?.notifier_type ?? 1));
	let selectedDevEui = $state(initialRule?.dev_eui ?? startingDevEui ?? '');
	let sendUsing = $state(initialRule?.send_using ?? 'email');
	let submitting = $state(false);

	const existingCriteria = initialRule?.cw_rule_criteria ?? [];
	let nextCriteriaId = $state(existingCriteria.length + 1);
	let criteria = $state<CriteriaEntry[]>(
		existingCriteria.length > 0
			? existingCriteria.map((criterion, index) => ({
					id: index + 1,
					criteriaId: criterion.id,
					subject: criterion.subject,
					operator: criterion.operator,
					triggerValue: String(criterion.trigger_value),
					resetValue: criterion.reset_value != null ? String(criterion.reset_value) : ''
				}))
			: [createEmptyCriterion()]
	);

	let deviceLocked = $derived(mode === 'create' && !!startingDevEui);
	let deviceOptions = $derived(
		(devices ?? []).map((device) => ({
			label: device.name ? `${device.name} (${device.dev_eui})` : device.dev_eui,
			value: device.dev_eui
		}))
	);
	let selectedDeviceName = $derived(
		(devices ?? []).find((device) => device.dev_eui === selectedDevEui)?.name ?? selectedDevEui
	);
	let isFormValid = $derived(
		ruleName.trim().length > 0 &&
			actionRecipient.trim().length > 0 &&
			selectedDevEui.length > 0 &&
			criteria.every((criterion) => criterion.triggerValue.trim().length > 0)
	);
	let criteriaPreview = $derived(
		criteria.map((criterion) => {
			const subjectLabel =
				SUBJECT_OPTIONS.find((subject) => subject.value === criterion.subject)?.label ??
				criterion.subject;
			return `${subjectLabel} ${criterion.operator} ${criterion.triggerValue}`;
		})
	);

	function createEmptyCriterion(): CriteriaEntry {
		const criterion = {
			id: nextCriteriaId,
			criteriaId: null,
			subject: 'temperature_c',
			operator: '>',
			triggerValue: '',
			resetValue: ''
		};

		nextCriteriaId += 1;
		return criterion;
	}

	function addCriterion() {
		criteria = [...criteria, createEmptyCriterion()];
	}

	function removeCriterion(id: number) {
		if (criteria.length <= 1) return;
		criteria = criteria.filter((criterion) => criterion.id !== id);
	}

	function buildCriteria(ruleGroupId: string) {
		return criteria.map((criterion) => ({
			id: criterion.criteriaId ?? 0,
			subject: criterion.subject,
			operator: criterion.operator,
			trigger_value: parseFloat(criterion.triggerValue),
			reset_value: criterion.resetValue ? parseFloat(criterion.resetValue) : null,
			ruleGroupId
		}));
	}

	async function handleSubmit() {
		if (!isFormValid || submitting) return;

		submitting = true;

		try {
			const api = new ApiService({ authToken: authToken ?? undefined });
			const ruleGroupId = initialRule?.ruleGroupId ?? crypto.randomUUID();
			const payload: CreateRuleRequest | UpdateRuleRequest = {
				name: ruleName.trim(),
				action_recipient: actionRecipient.trim(),
				notifier_type: parseInt(notifierType, 10),
				ruleGroupId,
				dev_eui: selectedDevEui,
				send_using: sendUsing,
				cw_rule_criteria: buildCriteria(ruleGroupId)
			};

			if (isEdit) {
				if (!initialRule) return;
				await api.updateRule(initialRule.id, payload);
			} else {
				await api.createRule(payload as CreateRuleRequest);
			}

			toast.add({
				tone: 'success',
				message: isEdit
					? m.rules_updated_success({ name: ruleName })
					: m.rules_created_success({ name: ruleName }),
				duration: 4000,
				dismissible: true
			});

			goto(resolve('/rules'));
		} catch (err) {
			console.error(isEdit ? 'Failed to update rule:' : 'Failed to create rule:', err);
			toast.add({
				tone: 'danger',
				message: isEdit ? m.rules_update_failed() : m.rules_create_failed(),
				duration: 5000,
				dismissible: true
			});
		} finally {
			submitting = false;
		}
	}
</script>

<AppPage width="lg" class="rules-page">
	{#if mode === 'create'}
		<CwButton variant="secondary" size="sm" onclick={() => goto(resolve('/rules'))}>
			&larr; {m.action_back()}
		</CwButton>
	{/if}

	<div class="rules-page__shell">
		<div class="rules-page__header">
			{#if isEdit}
				<CwButton variant="ghost" size="sm" onclick={() => goto(resolve('/rules'))}>
					{m.action_back()}
				</CwButton>
			{/if}
			<h1 class="rules-page__title">
				{isEdit ? m.rules_edit_rule() : m.rules_create_new_rule()}
			</h1>
			{#if initialRule}
				<CwChip label={`ID: ${initialRule.id}`} tone="info" variant="outline" size="sm" />
			{/if}
		</div>

		<CwCard title={m.rules_step_1_title()}>
			<AppFormStack padded>
				<CwInput
					label={m.rules_rule_name()}
					placeholder={m.rules_rule_name_placeholder()}
					bind:value={ruleName}
					required
					error={ruleName.length === 0 ? '' : undefined}
				/>

				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
					{#if isEdit}
						<CwDropdown
							label={m.rules_notification_type()}
							options={NOTIFIER_TYPES}
							bind:value={notifierType}
						/>
						<CwDropdown
							label={m.rules_send_using()}
							options={SEND_METHODS}
							bind:value={sendUsing}
						/>
					{:else}
						<input type="hidden" bind:value={notifierType} />
						<input type="hidden" bind:value={sendUsing} />
					{/if}
				</div>

				<CwInput
					label={m.rules_recipient()}
					type="email"
					placeholder={m.rules_recipient_placeholder()}
					bind:value={actionRecipient}
					required
				>
					{#snippet leftSlot()}
						<span class="text-sm opacity-60">📧</span>
					{/snippet}
				</CwInput>
			</AppFormStack>
		</CwCard>

		<CwCard title={m.rules_step_2_title()}>
			<AppFormStack padded>
				{#if deviceOptions.length === 0}
					<AppNotice tone="neutral">
						<p>{m.rules_no_devices_available()}</p>
					</AppNotice>
				{:else}
					<CwDropdown
						label={m.devices_device()}
						placeholder={m.rules_select_device_placeholder()}
						options={deviceOptions}
						bind:value={selectedDevEui}
						required
						disabled={deviceLocked}
					/>
					{#if deviceLocked}
						<p class="text-xs opacity-50">{m.rules_device_preselected()}</p>
					{/if}
					{#if selectedDevEui}
						<div class="flex items-center gap-2">
							<CwChip label={selectedDeviceName} tone="info" variant="soft" />
							<span class="text-xs opacity-50">{selectedDevEui}</span>
						</div>
					{/if}
				{/if}
			</AppFormStack>
		</CwCard>

		<CwCard
			title={m.rules_step_3_title()}
			subtitle={mode === 'create' ? m.rules_step_3_subtitle() : undefined}
		>
			<AppFormStack padded>
				{#each criteria as criterion, idx (criterion.id)}
					<div class="rules-criterion">
						<div class="rules-criterion__header">
							<span class="rules-criterion__title">
								{m.rules_condition_number({ count: String(idx + 1) })}
							</span>
							{#if criteria.length > 1}
								<CwButton variant="danger" size="sm" onclick={() => removeCriterion(criterion.id)}>
									{m.action_remove()}
								</CwButton>
							{/if}
						</div>

						<div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
							<CwDropdown
								label={m.rules_data_field()}
								options={SUBJECT_OPTIONS}
								bind:value={criterion.subject}
							/>
							<CwDropdown
								label={m.rules_operator()}
								options={OPERATORS}
								bind:value={criterion.operator}
							/>
							<CwInput
								label={m.rules_trigger_value()}
								type="numeric"
								placeholder={m.rules_trigger_value_placeholder()}
								bind:value={criterion.triggerValue}
								required
							/>
						</div>

						<div class="mt-3">
							<div class="p-2">
								<CwInput
									label={m.rules_reset_value()}
									type="numeric"
									required={!isEdit}
									placeholder={isEdit
										? m.rules_reset_value_optional_placeholder()
										: m.rules_reset_value_placeholder()}
									bind:value={criterion.resetValue}
								/>
								{#if isEdit}
									<p class="mt-1 text-xs opacity-50">
										{m.rules_reset_value_help()}
									</p>
								{/if}
							</div>
						</div>
					</div>
				{/each}

				{#if mode === 'create'}
					<CwButton variant="secondary" type="button" onclick={addCriterion}>
						{m.rules_add_another_condition()}
					</CwButton>
				{/if}
			</AppFormStack>
		</CwCard>

		<CwCard title={isEdit ? m.rules_step_4_review_save_title() : m.rules_step_4_title()}>
			<AppFormStack padded>
				{#if isFormValid}
					<AppNotice title={m.rules_rule_summary()} tone="info">
						<dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
							<dt class="font-medium opacity-70">{m.common_name()}:</dt>
							<dd>{ruleName}</dd>
							<dt class="font-medium opacity-70">{m.devices_device()}:</dt>
							<dd>{selectedDeviceName}</dd>
							<dt class="font-medium opacity-70">{m.rules_notify_via()}:</dt>
							<dd>
								{NOTIFIER_TYPES.find((notifier) => notifier.value === notifierType)?.label}
								({sendUsing}) → {actionRecipient}
							</dd>
							<dt class="font-medium opacity-70">{m.rules_conditions()}:</dt>
							<dd>
								<div class="flex flex-wrap gap-1">
									{#each criteriaPreview as preview, i (i)}
										<CwChip label={preview} tone="warning" variant="soft" size="sm" />
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
					<CwButton variant="ghost" onclick={() => goto(resolve('/rules'))} disabled={submitting}>
						{m.action_cancel()}
					</CwButton>
					<CwButton
						variant="primary"
						onclick={handleSubmit}
						disabled={!isFormValid || submitting}
						loading={submitting}
					>
						{#if isEdit}
							<Icon src={SAVE_ICON} />
							{submitting ? m.action_saving() : m.action_save_changes()}
						{:else}
							{submitting ? m.rules_creating() : m.rules_create_rule()}
						{/if}
					</CwButton>
				</AppActionRow>
			</AppFormStack>
		</CwCard>
	</div>
</AppPage>

<style>
	.rules-page__shell {
		display: flex;
		flex-direction: column;
		gap: var(--cw-space-4);
	}

	.rules-page__header {
		display: flex;
		align-items: center;
		gap: var(--cw-space-3);
		flex-wrap: wrap;
	}

	.rules-page__title {
		margin: 0;
		font-size: clamp(1.5rem, 1.2rem + 1vw, 2rem);
		font-weight: var(--cw-font-semibold);
	}

	.rules-criterion {
		display: flex;
		flex-direction: column;
		gap: var(--cw-space-3);
		padding: var(--cw-space-3);
		border: 1px solid var(--cw-border-muted);
		border-radius: var(--cw-radius-lg);
		background: var(--cw-bg-subtle);
	}

	.rules-criterion__header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--cw-space-3);
	}

	.rules-criterion__title {
		font-size: var(--cw-text-sm);
		font-weight: var(--cw-font-medium);
	}
</style>
