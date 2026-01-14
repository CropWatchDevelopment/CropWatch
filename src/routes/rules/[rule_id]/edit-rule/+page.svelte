<script lang="ts">
	import { enhance } from '$app/forms';
	import CWButton from '$lib/components/CWButton.svelte';
	import CWBackButton from '$lib/components/CWBackButton.svelte';
	import CWSelect from '$lib/components/CWSelect.svelte';
	import CWDialog from '$lib/components/CWDialog.svelte';
	import type { PageData, ActionData } from './$types';

	interface Criterion {
		id?: number;
		subject: string;
		operator: string;
		trigger_value: number;
		reset_value: number | null;
	}

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let isSubmitting = $state(false);
	let showDeleteDialog = $state(false);

	// Form state - initialized from loaded rule data
	let name = $state(data.rule.name);
	let selectedDevEui = $state<string | number | null>(data.rule.dev_eui);
	let selectedNotifierType = $state<string | number | null>(data.rule.notifier_type);
	let actionRecipient = $state(data.rule.action_recipient);
	let sendUsing = $state(data.rule.send_using ?? '');

	// Criteria state
	let criteria = $state<Criterion[]>(
		data.rule.criteria.map((c) => ({
			id: c.id,
			subject: c.subject,
			operator: c.operator,
			trigger_value: c.trigger_value,
			reset_value: c.reset_value
		}))
	);

	// Common subjects for sensor data
	const subjectOptions = [
		{ value: 'temperature', label: 'Temperature (°C)' },
		{ value: 'humidity', label: 'Humidity (%)' },
		{ value: 'moisture', label: 'Soil Moisture (%)' },
		{ value: 'ph', label: 'pH Level' },
		{ value: 'ec', label: 'Electrical Conductivity (µS/cm)' },
		{ value: 'pressure', label: 'Pressure (hPa)' },
		{ value: 'co2', label: 'CO₂ (ppm)' },
		{ value: 'light', label: 'Light (lux)' },
		{ value: 'battery', label: 'Battery (%)' },
		{ value: 'rssi', label: 'Signal Strength (RSSI)' }
	];

	// Operator options
	const operatorOptions = [
		{ value: '>', label: 'Greater than (>)' },
		{ value: '>=', label: 'Greater than or equal (≥)' },
		{ value: '<', label: 'Less than (<)' },
		{ value: '<=', label: 'Less than or equal (≤)' },
		{ value: '==', label: 'Equal to (=)' },
		{ value: '!=', label: 'Not equal to (≠)' }
	];

	// Device options for selector
	const deviceOptions = $derived(
		data.devices.map((d) => ({
			value: d.dev_eui,
			label: d.name ? `${d.name} (${d.dev_eui})` : d.dev_eui
		}))
	);

	// Notifier type options
	const notifierTypeOptions = $derived(
		data.notifierTypes.map((n) => ({
			value: n.notifier_id,
			label: n.name
		}))
	);

	function addCriterion() {
		criteria = [
			...criteria,
			{
				subject: 'temperature',
				operator: '>',
				trigger_value: 0,
				reset_value: null
			}
		];
	}

	function removeCriterion(index: number) {
		criteria = criteria.filter((_, i) => i !== index);
	}

	function updateCriterion(index: number, field: keyof Criterion, value: string | number | null) {
		criteria = criteria.map((c, i) => {
			if (i === index) {
				return { ...c, [field]: value };
			}
			return c;
		});
	}

	// Serialize criteria for form submission
	const criteriaJson = $derived(JSON.stringify(criteria));
</script>

<div class="min-h-screen p-6">
	<div class="mx-auto max-w-3xl space-y-6">
		<!-- Header -->
		<div class="flex items-center gap-3">
			<CWBackButton fallback="/rules" />
			<div>
				<h1 class="text-2xl font-bold text-slate-100">Edit Rule</h1>
				<p class="mt-1 text-sm text-slate-400">
					Modify your automation rule settings and conditions
				</p>
			</div>
		</div>

		<!-- Form -->
		<form
			method="POST"
			action="?/update"
			use:enhance={() => {
				isSubmitting = true;
				return async ({ update }) => {
					await update();
					isSubmitting = false;
				};
			}}
			class="space-y-6"
		>
			<!-- Hidden field for criteria -->
			<input type="hidden" name="criteria" value={criteriaJson} />

			<!-- Error Message -->
			{#if form?.error}
				<div class="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-300">
					{form.error}
				</div>
			{/if}

			<!-- Rule Status Badge -->
			<div class="flex items-center gap-3">
				{#if data.rule.is_triggered}
					<span
						class="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1 text-sm text-amber-200"
					>
						<span class="h-2 w-2 rounded-full bg-amber-400"></span>
						Triggered
					</span>
				{:else}
					<span
						class="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-sm text-emerald-200"
					>
						<span class="h-2 w-2 rounded-full bg-emerald-400"></span>
						Idle
					</span>
				{/if}
				<span class="text-sm text-slate-400">
					Triggered {data.rule.trigger_count} time{data.rule.trigger_count === 1 ? '' : 's'}
				</span>
				{#if data.rule.last_triggered}
					<span class="text-sm text-slate-400">
						• Last: {new Date(data.rule.last_triggered).toLocaleString()}
					</span>
				{/if}
			</div>

			<!-- Basic Information -->
			<div class="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg">
				<h2 class="mb-4 text-lg font-semibold text-slate-100">Basic Information</h2>

				<div class="space-y-4">
					<div>
						<label for="name" class="mb-1 block text-sm font-medium text-slate-300">
							Rule Name <span class="text-red-400">*</span>
						</label>
						<input
							id="name"
							name="name"
							type="text"
							required
							bind:value={name}
							placeholder="e.g., High Temperature Alert, Low Moisture Warning"
							class="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 placeholder-slate-500 transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
						/>
					</div>

					<CWSelect
						label="Device"
						placeholder="Select a device..."
						options={deviceOptions}
						bind:value={selectedDevEui}
						name="dev_eui"
						helpText="The device this rule monitors. Leave empty to apply to all devices."
					/>
				</div>
			</div>

			<!-- Conditions -->
			<div class="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg">
				<div class="mb-4 flex items-center justify-between">
					<div>
						<h2 class="text-lg font-semibold text-slate-100">Conditions</h2>
						<p class="mt-1 text-sm text-slate-400">
							Define when this rule should trigger. All conditions must be met.
						</p>
					</div>
					<CWButton variant="secondary" size="sm" type="button" onclick={addCriterion}>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-4 w-4"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							stroke-width="2"
						>
							<path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
						</svg>
						Add Condition
					</CWButton>
				</div>

				{#if criteria.length === 0}
					<div class="rounded-xl border border-dashed border-slate-700 bg-slate-800/50 p-8 text-center">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="mx-auto h-12 w-12 text-slate-600"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							stroke-width="1.5"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
							/>
						</svg>
						<p class="mt-3 text-slate-400">No conditions defined</p>
						<p class="mt-1 text-sm text-slate-400">Add at least one condition for the rule to work.</p>
					</div>
				{:else}
					<div class="space-y-4">
						{#each criteria as criterion, index (criterion.id ?? `new-${index}`)}
							<div class="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
								<div class="mb-3 flex items-center justify-between">
									<span class="text-sm font-medium text-slate-400">Condition {index + 1}</span>
									<button
										type="button"
										onclick={() => removeCriterion(index)}
										class="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-700 hover:text-red-400"
										aria-label="Remove condition"
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											class="h-4 w-4"
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
											stroke-width="2"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
											/>
										</svg>
									</button>
								</div>

								<div class="grid grid-cols-1 gap-4 sm:grid-cols-4">
									<!-- Subject -->
									<div class="sm:col-span-1">
										<label for="subject-{index}" class="mb-1 block text-xs font-medium text-slate-400">Subject</label>
										<select
											id="subject-{index}"
											value={criterion.subject}
											onchange={(e) => updateCriterion(index, 'subject', e.currentTarget.value)}
											class="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-slate-100 transition focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500/20"
										>
											{#each subjectOptions as option (option.value)}
												<option value={option.value}>{option.label}</option>
											{/each}
										</select>
									</div>

									<!-- Operator -->
									<div class="sm:col-span-1">
										<label for="operator-{index}" class="mb-1 block text-xs font-medium text-slate-400">Operator</label>
										<select
											id="operator-{index}"
											value={criterion.operator}
											onchange={(e) => updateCriterion(index, 'operator', e.currentTarget.value)}
											class="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-slate-100 transition focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500/20"
										>
											{#each operatorOptions as option (option.value)}
												<option value={option.value}>{option.label}</option>
											{/each}
										</select>
									</div>

									<!-- Trigger Value -->
									<div class="sm:col-span-1">
										<label for="trigger-value-{index}" class="mb-1 block text-xs font-medium text-slate-400">Trigger Value</label>
										<input
											id="trigger-value-{index}"
											type="number"
											step="any"
											value={criterion.trigger_value}
											oninput={(e) =>
												updateCriterion(index, 'trigger_value', parseFloat(e.currentTarget.value) || 0)}
											class="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-slate-100 transition focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500/20"
										/>
									</div>

									<!-- Reset Value -->
									<div class="sm:col-span-1">
										<label for="reset-value-{index}" class="mb-1 block text-xs font-medium text-slate-400">
											Reset Value
											<span class="text-slate-400">(optional)</span>
										</label>
										<input
											id="reset-value-{index}"
											type="number"
											step="any"
											value={criterion.reset_value ?? ''}
											oninput={(e) => {
												const val = e.currentTarget.value;
												updateCriterion(index, 'reset_value', val ? parseFloat(val) : null);
											}}
											placeholder="Auto"
											class="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 transition focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500/20"
										/>
									</div>
								</div>

								<p class="mt-2 text-xs text-slate-400">
									Triggers when {subjectOptions.find((s) => s.value === criterion.subject)?.label ?? criterion.subject}
									is {operatorOptions.find((o) => o.value === criterion.operator)?.label?.toLowerCase() ?? criterion.operator}
									{criterion.trigger_value}
									{#if criterion.reset_value !== null}
										• Resets at {criterion.reset_value}
									{/if}
								</p>
							</div>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Notification Settings -->
			<div class="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg">
				<h2 class="mb-4 text-lg font-semibold text-slate-100">Notification Settings</h2>

				<div class="space-y-4">
					<CWSelect
						label="Notification Type"
						required
						placeholder="Select notification method..."
						options={notifierTypeOptions}
						bind:value={selectedNotifierType}
						name="notifier_type"
					/>

					<div>
						<label for="action_recipient" class="mb-1 block text-sm font-medium text-slate-300">
							Recipient <span class="text-red-400">*</span>
						</label>
						<input
							id="action_recipient"
							name="action_recipient"
							type="text"
							required
							bind:value={actionRecipient}
							placeholder="e.g., email@example.com, +1234567890"
							class="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 placeholder-slate-500 transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
						/>
						<p class="mt-1 text-xs text-slate-400">
							The email address, phone number, or endpoint to send notifications to.
						</p>
					</div>

					<div>
						<label for="send_using" class="mb-1 block text-sm font-medium text-slate-300">
							Send Using
							<span class="text-slate-400">(optional)</span>
						</label>
						<input
							id="send_using"
							name="send_using"
							type="text"
							bind:value={sendUsing}
							placeholder="e.g., SMTP server, API endpoint"
							class="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 placeholder-slate-500 transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
						/>
					</div>
				</div>
			</div>

			<!-- Actions -->
			<div class="flex flex-wrap items-center justify-between gap-3">
				<CWButton
					variant="danger"
					type="button"
					onclick={() => (showDeleteDialog = true)}
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-4 w-4"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						stroke-width="2"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
						/>
					</svg>
					Delete Rule
				</CWButton>

				<div class="flex gap-3">
					<a href="/rules">
						<CWButton variant="ghost" type="button">Cancel</CWButton>
					</a>
					<CWButton variant="primary" type="submit" loading={isSubmitting}>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-4 w-4"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							stroke-width="2"
						>
							<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
						</svg>
						Save Changes
					</CWButton>
				</div>
			</div>
		</form>
	</div>
</div>

<!-- Delete Confirmation Dialog -->
<CWDialog bind:open={showDeleteDialog} title="Delete Rule">
	<div class="space-y-4">
		<p class="text-slate-300">
			Are you sure you want to delete the rule "<strong class="text-slate-100">{data.rule.name}</strong>"?
		</p>
		<p class="text-sm text-slate-400">
			This action cannot be undone. All conditions and trigger history for this rule will be permanently deleted.
		</p>

		<div class="flex justify-end gap-3 pt-2">
			<CWButton variant="ghost" onclick={() => (showDeleteDialog = false)}>Cancel</CWButton>
			<form method="POST" action="?/delete">
				<CWButton variant="danger" type="submit">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-4 w-4"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						stroke-width="2"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
						/>
					</svg>
					Delete Rule
				</CWButton>
			</form>
		</div>
	</div>
</CWDialog>
