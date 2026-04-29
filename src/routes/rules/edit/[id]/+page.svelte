<script lang="ts">
	import { AppActionRow, AppFormStack, AppNotice, AppPage } from '$lib/components/layout';
	import {
		CwButton,
		CwCard,
		CwChip,
		CwDropdown,
		CwInput,
		CwSeparator,
		useCwToast
	} from '@cropwatchdevelopment/cwui';
	import {
		getRuleNotifierTypeOptions,
		getRuleOperatorOptions,
		getRuleSendMethodOptions,
		getRuleSubjectOptions
	} from '$lib/i18n/options';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { ApiService } from '$lib/api/api.service';
	import { m } from '$lib/paraglide/messages.js';
	import type { DeviceDto, RuleDto, UpdateRuleRequest } from '$lib/api/api.dtos';
	import Icon from '$lib/components/Icon.svelte';
	import SAVE_ICON from '$lib/images/icons/save.svg';

	// ── Props ───────────────────────────────────────────────────────────────
	let { data }: { data: { rule: RuleDto; devices: DeviceDto[]; authToken?: string } } = $props();

	// Seed form from the rule snapshot (intentional one-time capture).
	// Using an IIFE avoids Svelte's state_referenced_locally warning.
	const rule = (() => data.rule)();

	const toast = useCwToast();

	// ── Constants ────────────────────────────────────────────────────────────
	const OPERATORS = getRuleOperatorOptions();
	const NOTIFIER_TYPES = getRuleNotifierTypeOptions();
	const SEND_METHODS = getRuleSendMethodOptions();
	const SUBJECT_OPTIONS = getRuleSubjectOptions();

	// ── Form state (seeded from existing rule) ──────────────────────────────
	let ruleName = $state(rule.name);
	let actionRecipient = $state(rule.action_recipient);
	let notifierType = $state(String(rule.notifier_type));
	let selectedDevEui = $state(rule.dev_eui ?? '');
	let sendUsing = $state(rule.send_using ?? 'email');
	let submitting = $state(false);

	// ── Criteria state ──────────────────────────────────────────────────────
	interface CriteriaEntry {
		id: number;
		criteriaId: number | null;
		subject: string;
		operator: string;
		triggerValue: string;
		resetValue: string;
	}

	const existingCriteria = rule.cw_rule_criteria ?? [];
	let nextCriteriaId = $state(existingCriteria.length + 1);

	let criteria = $state<CriteriaEntry[]>(
		existingCriteria.length > 0
			? existingCriteria.map((c, idx) => ({
					id: idx + 1,
					criteriaId: c.id,
					subject: c.subject,
					operator: c.operator,
					triggerValue: String(c.trigger_value),
					resetValue: c.reset_value != null ? String(c.reset_value) : ''
				}))
			: [createEmptyCriterion()]
	);

	function createEmptyCriterion(): CriteriaEntry {
		const entry: CriteriaEntry = {
			id: nextCriteriaId,
			criteriaId: null,
			subject: 'temperature_c',
			operator: '>',
			triggerValue: '',
			resetValue: ''
		};
		nextCriteriaId++;
		return entry;
	}

	function removeCriterion(id: number) {
		if (criteria.length <= 1) return;
		criteria = criteria.filter((c) => c.id !== id);
	}

	// ── Derived ─────────────────────────────────────────────────────────────
	let deviceOptions = $derived(
		(data.devices ?? []).map((d) => ({
			label: d.name ? `${d.name} (${d.dev_eui})` : d.dev_eui,
			value: d.dev_eui
		}))
	);

	let selectedDeviceName = $derived(
		(data.devices ?? []).find((d) => d.dev_eui === selectedDevEui)?.name ?? selectedDevEui
	);

	let isFormValid = $derived(
		ruleName.trim().length > 0 &&
			actionRecipient.trim().length > 0 &&
			selectedDevEui.length > 0 &&
			criteria.every((c) => c.triggerValue.trim().length > 0)
	);

	let criteriaPreview = $derived(
		criteria.map((c) => {
			const subjectLabel = SUBJECT_OPTIONS.find((s) => s.value === c.subject)?.label ?? c.subject;
			return `${subjectLabel} ${c.operator} ${c.triggerValue}`;
		})
	);

	// ── Submission ──────────────────────────────────────────────────────────
	async function handleSubmit() {
		if (!isFormValid || submitting) return;
		submitting = true;

		try {
			const api = new ApiService({ authToken: data.authToken });

			const payload: UpdateRuleRequest = {
				name: ruleName.trim(),
				action_recipient: actionRecipient.trim(),
				notifier_type: parseInt(notifierType, 10),
				ruleGroupId: rule.ruleGroupId,
				dev_eui: selectedDevEui,
				send_using: sendUsing,
				cw_rule_criteria: criteria.map((c) => ({
					id: c.criteriaId ?? 0,
					subject: c.subject,
					operator: c.operator,
					trigger_value: parseFloat(c.triggerValue),
					reset_value: c.resetValue ? parseFloat(c.resetValue) : null,
					ruleGroupId: rule.ruleGroupId
				}))
			};

			await api.updateRule(rule.id, payload);

			toast.add({
				tone: 'success',
				message: m.rules_updated_success({ name: ruleName }),
				duration: 4000,
				dismissible: true
			});

			goto(resolve('/rules'));
		} catch (err) {
			console.error('Failed to update rule:', err);
			toast.add({
				tone: 'danger',
				message: m.rules_update_failed(),
				duration: 5000,
				dismissible: true
			});
		} finally {
			submitting = false;
		}
	}
</script>

<!-- ═══════════════════════════════════════════════════════════════════════ -->
<!-- Layout                                                                 -->
<!-- ═══════════════════════════════════════════════════════════════════════ -->

<AppPage width="lg" class="rules-page">
	<div class="rules-page__shell">
		<!-- ── Page header ──────────────────────────────────────────────────── -->
		<div class="rules-page__header">
			<CwButton variant="ghost" size="sm" onclick={() => goto(resolve('/rules'))}>
				{m.action_back()}
			</CwButton>
			<h1 class="rules-page__title">{m.rules_edit_rule()}</h1>
			<CwChip label={`ID: ${rule.id}`} tone="info" variant="outline" size="sm" />
		</div>

		<!-- ── Step 1 — Basic Info ─────────────────────────────────────────── -->
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
					<CwDropdown
						label={m.rules_notification_type()}
						options={NOTIFIER_TYPES}
						bind:value={notifierType}
					/>
					<CwDropdown label={m.rules_send_using()} options={SEND_METHODS} bind:value={sendUsing} />
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

		<!-- ── Step 2 — Device Selection ───────────────────────────────────── -->
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
					/>
					{#if selectedDevEui}
						<div class="flex items-center gap-2">
							<CwChip label={selectedDeviceName} tone="info" variant="soft" />
							<span class="text-xs opacity-50">{selectedDevEui}</span>
						</div>
					{/if}
				{/if}
			</AppFormStack>
		</CwCard>

		<!-- ── Step 3 — Criteria ───────────────────────────────────────────── -->
		<CwCard title={m.rules_step_3_title()}>
			<AppFormStack padded>
				{#each criteria as criterion, idx (criterion.id)}
					<div class="rules-criterion">
						<div class="rules-criterion__header">
							<span class="rules-criterion__title"
								>{m.rules_condition_number({ count: String(idx + 1) })}</span
							>
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
									placeholder={m.rules_reset_value_optional_placeholder()}
									bind:value={criterion.resetValue}
								/>
								<p class="mt-1 text-xs opacity-50">
									{m.rules_reset_value_help()}
								</p>
							</div>
						</div>
					</div>
				{/each}
				<!-- 
					<CwButton variant="secondary" onclick={addCriterion}>
						{m.rules_add_another_condition()}
					</CwButton> -->
			</AppFormStack>
		</CwCard>

		<!-- ── Preview & Submit ────────────────────────────────────────────── -->
		<CwCard
			title={m.rules_step_4_review_save_title()}>
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
								{NOTIFIER_TYPES.find((n) => n.value === notifierType)?.label}
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
						<Icon src={SAVE_ICON} />
						{submitting ? m.action_saving() : m.action_save_changes()}
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
