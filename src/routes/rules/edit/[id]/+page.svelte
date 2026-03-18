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
	import { goto } from '$app/navigation';
	import { ApiService } from '$lib/api/api.service';
	import type { DeviceDto, RuleDto, UpdateRuleRequest } from '$lib/api/api.dtos';

	// ── Props ───────────────────────────────────────────────────────────────
	let { data }: { data: { rule: RuleDto; devices: DeviceDto[]; authToken?: string } } = $props();

	// Seed form from the rule snapshot (intentional one-time capture).
	// Using an IIFE avoids Svelte's state_referenced_locally warning.
	const rule = (() => data.rule)();

	const toast = useCwToast();

	// ── Constants ────────────────────────────────────────────────────────────
	const OPERATORS = [
		{ label: 'Greater than (>)', value: '>' },
		{ label: 'Less than (<)', value: '<' },
		{ label: 'Equal to (=)', value: '=' },
		{ label: 'Greater or equal (>=)', value: '>=' },
		{ label: 'Less or equal (<=)', value: '<=' },
		{ label: 'Not equal (!=)', value: '!=' }
	];

	const NOTIFIER_TYPES = [
		{ label: 'Email', value: '1' },
		{ label: 'SMS', value: '2' },
		{ label: 'Push Notification', value: '3' },
		{ label: 'Discord', value: '4' }
	];

	const SEND_METHODS = [
		{ label: 'Email', value: 'email' },
		{ label: 'SMS', value: 'sms' },
		{ label: 'Both', value: 'both' }
	];

	const SUBJECT_OPTIONS = [
		// Air sensors
		{ label: 'Temperature (°C)', value: 'temperature_c' },
		{ label: 'Humidity (%)', value: 'humidity' },
		{ label: 'CO₂ (ppm)', value: 'co2' },
		{ label: 'CO (ppm)', value: 'co' },
		{ label: 'Pressure (hPa)', value: 'pressure' },
		{ label: 'Lux (Light)', value: 'lux' },
		{ label: 'UV Index', value: 'uv_index' },
		{ label: 'Wind Speed', value: 'wind_speed' },
		{ label: 'Wind Direction', value: 'wind_direction' },
		{ label: 'Rainfall', value: 'rainfall' },
		{ label: 'Battery Level', value: 'battery_level' },
		// Soil sensors
		{ label: 'Soil Moisture', value: 'moisture' },
		{ label: 'Electrical Conductivity (EC)', value: 'ec' },
		{ label: 'pH', value: 'ph' },
		// Water sensors
		{ label: 'Water Depth (cm)', value: 'deapth_cm' },
		{ label: 'SpO₂', value: 'spo2' }
	];

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
			const subjectLabel =
				SUBJECT_OPTIONS.find((s) => s.value === c.subject)?.label ?? c.subject;
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
					id: 0,
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
				message: `Rule "${ruleName}" updated successfully!`,
				duration: 4000,
				dismissible: true
			});

			goto('/rules');
		} catch (err) {
			console.error('Failed to update rule:', err);
			toast.add({
				tone: 'danger',
				message: 'Failed to update rule. Please try again.',
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
	<div class="flex items-center gap-3">
		<CwButton variant="ghost" size="sm" onclick={() => goto('/rules')}>
			← Back
		</CwButton>
		<h1 class="text-2xl font-semibold">Edit Rule</h1>
		<CwChip label={`ID: ${rule.id}`} tone="info" variant="outline" size="sm" />
	</div>

	<!-- ── Step 1 — Basic Info ─────────────────────────────────────────── -->
	<CwCard title="1. Rule Details" subtitle="Update the rule name and notification settings">
		<div class="flex flex-col gap-4 p-4">
			<CwInput
				label="Rule Name"
				placeholder="e.g. High Temperature Alert"
				bind:value={ruleName}
				required
				error={ruleName.length === 0 ? '' : undefined}
			/>

			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<CwDropdown
					label="Notification Type"
					options={NOTIFIER_TYPES}
					bind:value={notifierType}
				/>
				<CwDropdown
					label="Send Using"
					options={SEND_METHODS}
					bind:value={sendUsing}
				/>
			</div>

			<CwInput
				label="Recipient"
				type="email"
				placeholder="alert@example.com"
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
	<CwCard title="2. Select Device" subtitle="Choose which device this rule monitors">
		<div class="flex flex-col gap-4 p-4">
			{#if deviceOptions.length === 0}
				<p class="text-sm opacity-60">No devices available. Please add a device first.</p>
			{:else}
				<CwDropdown
					label="Device"
					placeholder="Select a device..."
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
		</div>
	</CwCard>

	<!-- ── Step 3 — Criteria ───────────────────────────────────────────── -->
	<CwCard
		title="3. Alert Criteria"
		subtitle="Update the conditions that trigger this rule"
	>
		<div class="flex flex-col gap-4 p-4">
			{#each criteria as criterion, idx (criterion.id)}
				<div class="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
					<div class="mb-3 flex items-center justify-between">
						<span class="text-sm font-medium">Condition {idx + 1}</span>
						{#if criteria.length > 1}
							<CwButton
								variant="danger"
								size="sm"
								onclick={() => removeCriterion(criterion.id)}
							>
								Remove
							</CwButton>
						{/if}
					</div>

					<div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
						<CwDropdown
							label="Data Field"
							options={SUBJECT_OPTIONS}
							bind:value={criterion.subject}
						/>
						<CwDropdown
							label="Operator"
							options={OPERATORS}
							bind:value={criterion.operator}
						/>
						<CwInput
							label="Trigger Value"
							type="numeric"
							placeholder="e.g. 30"
							bind:value={criterion.triggerValue}
							required
						/>
					</div>

					<div class="mt-3">
						<CwExpandPanel title="Advanced — Reset Value">
							<div class="p-2">
								<CwInput
									label="Reset Value"
									type="numeric"
									placeholder="Value to reset the trigger (optional)"
									bind:value={criterion.resetValue}
								/>
								<p class="mt-1 text-xs opacity-50">
									When the sensor reading returns to this value, the rule resets
									and can trigger again.
								</p>
							</div>
						</CwExpandPanel>
					</div>
				</div>
			{/each}

			<CwButton variant="secondary" onclick={addCriterion}>
				+ Add Another Condition
			</CwButton>
		</div>
	</CwCard>

	<!-- ── Preview & Submit ────────────────────────────────────────────── -->
	<CwCard title="4. Review & Save" subtitle="Review your changes before saving">
		<div class="flex flex-col gap-4 p-4">
			{#if isFormValid}
				<div class="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950">
					<p class="mb-2 text-sm font-medium">Rule Summary</p>
					<dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
						<dt class="font-medium opacity-70">Name:</dt>
						<dd>{ruleName}</dd>
						<dt class="font-medium opacity-70">Device:</dt>
						<dd>{selectedDeviceName}</dd>
						<dt class="font-medium opacity-70">Notify via:</dt>
						<dd>
							{NOTIFIER_TYPES.find((n) => n.value === notifierType)?.label}
							({sendUsing}) → {actionRecipient}
						</dd>
						<dt class="font-medium opacity-70">Conditions:</dt>
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
					Complete all required fields above to see a preview of your rule.
				</p>
			{/if}

			<CwSeparator />

			<div class="flex items-center justify-end gap-3">
				<CwButton variant="ghost" onclick={() => goto('/rules')} disabled={submitting}>
					Cancel
				</CwButton>
				<CwButton
					variant="primary"
					onclick={handleSubmit}
					disabled={!isFormValid || submitting}
					loading={submitting}
				>
					{submitting ? 'Saving…' : 'Save Changes'}
				</CwButton>
			</div>
		</div>
	</CwCard>
</div>
</div>
