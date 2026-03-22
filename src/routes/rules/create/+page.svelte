<script lang="ts">
	import {
		CwButton,
		CwCard,
		CwChip,
		CwDropdown,
		CwExpandPanel,
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
	import { ApiService } from '$lib/api/api.service';
	import { m } from '$lib/paraglide/messages.js';
	import type { CreateRuleRequest, DeviceDto } from '$lib/api/api.dtos';

	// ── Props ───────────────────────────────────────────────────────────────
	let { data }: { data: { devices: DeviceDto[]; authToken?: string; devEui?: string | null } } =
		$props();

	const toast = useCwToast();

	// ── Constants ────────────────────────────────────────────────────────────
	const OPERATORS = getRuleOperatorOptions();
	const NOTIFIER_TYPES = getRuleNotifierTypeOptions();
	const SEND_METHODS = getRuleSendMethodOptions();
	const SUBJECT_OPTIONS = getRuleSubjectOptions();

	// ── Form state ──────────────────────────────────────────────────────────
	let ruleName = $state('');
	let actionRecipient = $state('');
	let notifierType = $state('1');
	let selectedDevEui = $state('');
	let deviceLocked = $derived(!!data.devEui);

	// Pre-select device from query param on first load
	$effect(() => {
		if (data.devEui) {
			selectedDevEui = data.devEui;
		}
	});
	let sendUsing = $state('email');
	let submitting = $state(false);

	// ── Criteria state ──────────────────────────────────────────────────────
	interface CriteriaEntry {
		id: number;
		subject: string;
		operator: string;
		triggerValue: string;
		resetValue: string;
	}

	let nextCriteriaId = $state(1);
	let criteria = $state<CriteriaEntry[]>([createEmptyCriterion()]);

	function createEmptyCriterion(): CriteriaEntry {
		const entry: CriteriaEntry = {
			id: nextCriteriaId,
			subject: 'temperature_c',
			operator: '>',
			triggerValue: '',
			resetValue: ''
		};
		nextCriteriaId++;
		return entry;
	}

	function addCriterion() {
		criteria = [...criteria, createEmptyCriterion()];
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
			const ruleGroupId = crypto.randomUUID();

			const api = new ApiService({ authToken: data.authToken });

			const rulePayload: CreateRuleRequest = {
				name: ruleName.trim(),
				action_recipient: actionRecipient.trim(),
				notifier_type: parseInt(notifierType, 10),
				ruleGroupId,
				dev_eui: selectedDevEui,
				send_using: sendUsing,
				cw_rule_criteria: criteria.map((c) => ({
					id: 0,
					subject: c.subject,
					operator: c.operator,
					trigger_value: parseFloat(c.triggerValue),
					reset_value: c.resetValue ? parseFloat(c.resetValue) : null,
					ruleGroupId
				}))
			};

			await api.createRule(rulePayload);

			toast.add({
				tone: 'success',
				message: m.rules_created_success({ name: ruleName }),
				duration: 4000,
				dismissible: true
			});

			goto('/rules');
		} catch (err) {
			console.error('Failed to create rule:', err);
			toast.add({
				tone: 'danger',
				message: m.rules_create_failed(),
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

<div class="h-full overflow-y-auto">
	<div class="mx-auto flex w-full max-w-3xl flex-col gap-6 pb-6">
		<!-- ── Page header ──────────────────────────────────────────────────── -->
		<CwButton variant="secondary" size="sm" onclick={() => goto('/rules')}>
			{m.action_back()}
		</CwButton>
		<div class="flex items-center gap-3">
			<h1 class="text-2xl font-semibold">{m.rules_create_new_rule()}</h1>
		</div>

		<!-- ── Step 1 — Basic Info ─────────────────────────────────────────── -->
		<CwCard title={m.rules_step_1_title()} subtitle={m.rules_step_1_subtitle()}>
			<div class="flex flex-col gap-4 p-4">
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
			</div>
		</CwCard>

		<!-- ── Step 2 — Device Selection ───────────────────────────────────── -->
		<CwCard title={m.rules_step_2_title()} subtitle={m.rules_step_2_subtitle()}>
			<div class="flex flex-col gap-4 p-4">
				{#if deviceOptions.length === 0}
					<p class="text-sm opacity-60">{m.rules_no_devices_available()}</p>
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
			</div>
		</CwCard>

		<!-- ── Step 3 — Criteria ───────────────────────────────────────────── -->
		<CwCard
			title={m.rules_step_3_title()}
			subtitle={m.rules_step_3_subtitle()}
		>
			<div class="flex flex-col gap-4 p-4">
				{#each criteria as criterion, idx (criterion.id)}
					<div
						class="rounded-lg"
					>
						<div class="mb-3 flex items-center justify-between">
							<span class="text-sm font-medium">{m.rules_condition_number({ count: String(idx + 1) })}</span>
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
							<CwDropdown label={m.rules_operator()} options={OPERATORS} bind:value={criterion.operator} />
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
									required
									placeholder={m.rules_reset_value_placeholder()}
									bind:value={criterion.resetValue}
								/>
							</div>
						</div>
					</div>
				{/each}

				<!-- <CwButton variant="secondary" disabled onclick={addCriterion}>+ Add Another Condition</CwButton> -->
			</div>
		</CwCard>

		<!-- ── Preview & Submit ────────────────────────────────────────────── -->
		<CwCard title={m.rules_step_4_title()} subtitle={m.rules_step_4_subtitle()}>
			<div class="flex flex-col gap-4 p-4">
				{#if isFormValid}
					<div
						class="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950"
					>
						<p class="mb-2 text-sm font-medium">{m.rules_rule_summary()}</p>
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
					</div>
				{:else}
					<p class="text-sm opacity-60">
						{m.rules_complete_required_fields()}
					</p>
				{/if}

				<CwSeparator />

				<div class="flex items-center justify-end gap-3">
					<CwButton variant="ghost" onclick={() => goto('/rules')} disabled={submitting}>
						{m.action_cancel()}
					</CwButton>
					<CwButton
						variant="primary"
						onclick={handleSubmit}
						disabled={!isFormValid || submitting}
						loading={submitting}
				>
					{submitting ? m.rules_creating() : m.rules_create_rule()}
				</CwButton>
				</div>
			</div>
		</CwCard>
	</div>
</div>
