<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { formValidation } from '$lib/actions/formValidation';
	import Spinner from '$lib/components/Spinner.svelte';
	import Button from '$lib/components/UI/buttons/Button.svelte';
	import Select from '$lib/components/UI/form/Select.svelte';
	import TextInput from '$lib/components/UI/form/TextInput.svelte';
	import Dialog from '$lib/components/UI/overlay/Dialog.svelte';
	import type { NotifierType } from '$lib/models/NotifierType';
	import type { Rule } from '$lib/models/Rule';
	import { success, error as toastError } from '$lib/stores/toast.svelte';
	import { onMount } from 'svelte';
	import { _ } from 'svelte-i18n';

	let { data } = $props();
	let { device, locationId } = $derived(data);

	let rules: Rule[] = $derived([]);
	let notifierTypes: NotifierType[] = $derived([]);

	$effect(() => {
		(async () => {
			rules = await data.rules;
		})();
	});

	$effect(() => {
		(async () => {
			notifierTypes = await data.notifierTypes;
		})();
	});

	// For creating a new rule
	let showForm = $state(false);

	// Type definition for rule criteria
	type RuleCriteriaItem = {
		id?: number;
		subject: string;
		operator: string;
		trigger_value: number;
		reset_value: number;
	};

	// Available device data fields for subject dropdown
	let deviceDataFields: string[] = $state([]);

	// For editing a rule
	let editingRuleId: number | null = $state(null);
	let editRuleName = $state('');
	let editRuleNotifierType = $state(1);
	let editRuleActionRecipient = $state('');
	let editRuleActionRecipients: string[] = $state([]);

	// Array to store multiple rule criteria for editing
	let editRuleCriteriaItems: RuleCriteriaItem[] = $state([]);

	// Track deleted criteria IDs to remove from database
	let deletedCriteriaIds: number[] = $state([]);

	// For confirming rule deletion
	let deletingRuleId: number | null = $state(null);
	let confirmDeleteOpen = $state(false);

	// Loading states
	let isCreating = $state(false);
	let isUpdating = $state(false);
	let isDeleting = $state(false);

	const creatingNewRule = $derived(editingRuleId === null);

	// Set up operators
	const operators = ['>', '>=', '=', '<=', '<', '!='];

	// Populate device data fields based on device type
	onMount(() => {
		// In a real app, this would be fetched from the server based on device type
		// For now, we'll use some common fields as examples
		switch (device?.type_name?.toLowerCase()) {
			case 'soil sensor':
				deviceDataFields = ['moisture', 'temperature_c', 'ph', 'ec', 'k', 'n', 'p'];
				break;
			case 'air sensor':
				deviceDataFields = ['temperature_c', 'humidity', 'pressure', 'co2', 'rain', 'wind_speed'];
				break;
			case 'water sensor':
				deviceDataFields = ['water_level', 'flow_rate', 'temperature_c'];
				break;
			default:
				deviceDataFields = ['temperature_c', 'humidity', 'battery_level'];
		}

		// Set default subject if available
		if (deviceDataFields.length > 0) {
			// Initialize with first criteria for new rule
			editRuleCriteriaItems = [
				{ subject: deviceDataFields[0], operator: '>', trigger_value: 0, reset_value: 0 }
			];
		}
	});

	function handleEditRule(rule: Rule) {
		showForm = true;
		editingRuleId = rule.id;
		editRuleName = rule.name;
		editRuleNotifierType = rule.notifier_type || 1;

		// Parse recipients from action_recipient field (assumed to be comma-separated)
		if (rule.action_recipient) {
			editRuleActionRecipients = rule.action_recipient.split(',').map((r) => r.trim());
		} else {
			editRuleActionRecipients = [];
		}

		// Parse all rule criteria - accessing them through cw_rule_criteria
		editRuleCriteriaItems =
			rule.cw_rule_criteria?.map((criteria) => ({
				id: criteria.id,
				subject: criteria.subject || '',
				operator: criteria.operator || '>',
				trigger_value: criteria.trigger_value || 0,
				reset_value: criteria.reset_value || 0
			})) || [];

		// If there are no criteria, add a default one
		if (editRuleCriteriaItems.length === 0 && deviceDataFields.length > 0) {
			editRuleCriteriaItems = [
				{
					subject: deviceDataFields[0],
					operator: '>',
					trigger_value: 0,
					reset_value: 0
				}
			];
		}
	}

	function cancelEdit() {
		showForm = false;
		editingRuleId = null;
	}

	function handleDeleteConfirm(ruleId: number) {
		deletingRuleId = ruleId;
		confirmDeleteOpen = true;
	}

	function cancelDelete() {
		deletingRuleId = null;
		confirmDeleteOpen = false;
	}

	function getNotifierTypeLabel(id: number): string {
		const notifier = notifierTypes?.find((n) => n.notifier_id === id);
		return notifier ? notifier.name : 'Unknown';
	}

	// Reset the new rule form
	function resetNewRuleForm() {
		editingRuleId = null;
		editRuleName = '';
		editRuleNotifierType =
			notifierTypes && notifierTypes.length > 0 ? notifierTypes[0].notifier_id : 1;
		editRuleActionRecipient = '';
		editRuleActionRecipients = [];

		// Reset criteria to default
		if (deviceDataFields.length > 0) {
			editRuleCriteriaItems = [
				{ subject: deviceDataFields[0], operator: '>', trigger_value: 0, reset_value: 0 }
			];
		} else {
			editRuleCriteriaItems = [];
		}
	}
</script>

<svelte:head>
	<title>Notifications - CropWatch</title>
</svelte:head>

<section class="flex flex-col gap-6">
	<header class="flex flex-row items-center justify-between gap-4">
		<div>
			<h1 class="mb-1 text-2xl font-semibold">Notifications</h1>
			<p class="text-sm text-neutral-100">
				Get notified when the device meets a specific condition.
			</p>
		</div>

		<div class="mt-4 md:mt-0">
			<Button
				onclick={() => {
					resetNewRuleForm();
					showForm = true;
				}}
			>
				<svg
					class="mr-2 h-4 w-4"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
					xmlns="http://www.w3.org/2000/svg"
				>
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"
					></path>
				</svg>
				Add Rule
			</Button>
		</div>
	</header>

	<!-- Rules List -->
	<div class="form-container overflow-hidden">
		{#if rules.length === 0}
			<div class="p-8 text-center text-sm text-gray-500 italic opacity-70 dark:text-gray-400">
				No rules found.
			</div>
		{:else}
			<table class="min-w-full divide-y divide-gray-300 dark:divide-neutral-400">
				<thead
					class="hidden border-gray-300 text-left md:table-header-group dark:border-neutral-400"
				>
					<tr>
						<th
							scope="col"
							class="py-2 text-sm font-medium text-neutral-50 md:px-2 lg:px-4 lg:py-4"
						>
							Name
						</th>
						<th
							scope="col"
							class="py-2 text-sm font-medium text-neutral-50 md:px-2 lg:px-4 lg:py-4"
						>
							Method
						</th>
						<th
							scope="col"
							class="py-2 text-sm font-medium text-neutral-50 md:px-2 lg:px-4 lg:py-4"
						>
							Recipients
						</th>
						<th
							scope="col"
							class="py-2 text-sm font-medium text-neutral-50 md:px-2 lg:px-4 lg:py-4"
						>
							Conditions
						</th>
						<th
							scope="col"
							class="w-0 py-2 text-sm font-medium text-neutral-50 md:px-2 lg:px-4 lg:py-4"
							>Actions</th
						>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-300 dark:divide-neutral-400">
					{#each rules as rule (rule.id)}
						<tr class="mb-2 block pb-2 md:table-row">
							<td
								class="flex flex-row items-center gap-4 py-2 whitespace-nowrap md:table-cell md:px-2 lg:px-4 lg:py-4"
							>
								<div class="min-w-24 text-sm font-medium text-neutral-50 md:hidden">Name</div>
								<div class="font-semibold">{rule.name}</div>
							</td>
							<td
								class="flex flex-row items-center gap-4 py-2 whitespace-nowrap md:table-cell md:px-2 lg:px-4 lg:py-4"
							>
								<div class="min-w-24 text-sm font-medium text-neutral-50 md:hidden">Method</div>
								<div class="">{getNotifierTypeLabel(rule.notifier_type || 1)}</div>
							</td>
							<td
								class="flex flex-row items-center gap-4 py-2 whitespace-nowrap md:table-cell md:px-2 lg:px-4 lg:py-4"
							>
								<div class="min-w-24 text-sm font-medium text-neutral-50 md:hidden">Recipients</div>
								<div>
									{#if rule.action_recipient}
										{#each rule.action_recipient.split(',') as recipient}
											<div>{recipient.trim()}</div>
										{/each}
									{:else}
										<span class="text-sm text-gray-500 italic opacity-70 dark:text-gray-400"
											>No recipients</span
										>
									{/if}
								</div>
							</td>
							<td
								class="flex flex-row items-center gap-4 py-2 whitespace-nowrap md:table-cell md:px-2 lg:px-4 lg:py-4"
							>
								<div class="min-w-24 text-sm font-medium text-neutral-50 md:hidden">Conditions</div>
								<div>
									{#if rule.cw_rule_criteria && rule.cw_rule_criteria.length > 0}
										{#each rule.cw_rule_criteria as criteria}
											<div>
												{$_(criteria.subject, { default: 'Unknown' })}
												{criteria.operator || '>'}
												{criteria.trigger_value || 0}
												{#if criteria.reset_value}
													<span class="text-xs text-gray-400">(Reset: {criteria.reset_value})</span>
												{/if}
											</div>
										{/each}
									{:else}
										<span class="text-sm text-gray-500 italic opacity-70 dark:text-gray-400"
											>No criteria defined</span
										>
									{/if}
								</div>
							</td>
							<td
								class="flex flex-row items-center justify-end gap-2 py-2 whitespace-nowrap md:table-cell
							md:px-2 lg:px-4 lg:py-4"
							>
								<Button variant="primary" onclick={() => handleEditRule(rule)}>Edit</Button>
								<Button variant="secondary" onclick={() => handleDeleteConfirm(rule.id)}>
									Delete
								</Button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</div>

	<!-- Delete Confirmation Modal -->
	<Dialog bind:open={confirmDeleteOpen}>
		{#snippet title()}
			Delete Rule
		{/snippet}
		{#snippet body()}
			<p class="mb-6 text-gray-600 dark:text-white">
				Are you sure you want to delete this rule? This action cannot be undone.
			</p>
			<div class="flex justify-end space-x-3">
				<Button variant="secondary" onclick={cancelDelete}>Cancel</Button>
				<form
					method="POST"
					action="?/deleteRule"
					use:enhance={() => {
						isDeleting = true;

						return async ({ result }) => {
							isDeleting = false;
							confirmDeleteOpen = false;

							if (result.type === 'success') {
								if (result.data?.success) {
									success('Rule deleted successfully');
									// Refresh the page to show updated data
									goto(
										`/app/dashboard/location/${locationId}/devices/${device.dev_eui}/settings/rules`,
										{ invalidateAll: true }
									);
								} else {
									toastError(result.data?.error || 'Failed to delete rule');
								}
							} else {
								toastError('An error occurred');
							}
						};
					}}
					use:formValidation
				>
					<input type="hidden" name="ruleId" value={deletingRuleId} />

					<Button type="submit" variant="primary" disabled={isDeleting}>
						{#if isDeleting}
							<Spinner size="sm" class="mr-2" /> Deleting...
						{:else}
							Delete
						{/if}
					</Button>
				</form>
			</div>
		{/snippet}
	</Dialog>

	<!-- Edit Form Modal -->
	<Dialog bind:open={showForm}>
		{#snippet title()}
			{creatingNewRule ? 'Create New Rule' : 'Edit Rule'}
		{/snippet}
		{#snippet body()}
			<form
				method="POST"
				action={creatingNewRule ? '?/createRule' : '?/updateRule'}
				use:enhance={() => {
					isCreating = creatingNewRule;
					isUpdating = !creatingNewRule;

					return async ({ result }) => {
						isCreating = false;
						isUpdating = false;

						if (result.type === 'success') {
							if (result.data?.success) {
								success(
									creatingNewRule ? 'Rule created successfully' : 'Rule updated successfully'
								);
								showForm = false;
								editingRuleId = null;
								// Force reload all data to update the grid
								goto(
									`/app/dashboard/location/${locationId}/devices/${device.dev_eui}/settings/rules`,
									{ invalidateAll: true, replaceState: false }
								).then(() => {
									// Force a complete page reload to ensure fresh data
									window.location.reload();
								});
							} else {
								toastError(
									result.data?.error ||
										(creatingNewRule ? 'Failed to create rule' : 'Failed to update rule')
								);
							}
						} else {
							toastError('An error occurred');
						}
					};
				}}
				use:formValidation
			>
				<input type="hidden" name="ruleId" value={editingRuleId} />
				<input type="hidden" name="dev_eui" value={device?.dev_eui} />
				<input type="hidden" name="profile_id" value={data.session?.user.id} />

				<div
					class="grid grid-cols-1 gap-4 text-gray-700 md:grid-cols-2 lg:grid-cols-3 dark:text-gray-300"
				>
					<div class="col-span-2 lg:col-span-1">
						<label for="edit_rule_name" class="mb-1 block text-sm font-medium">Name*</label>
						<TextInput
							id="edit_rule_name"
							name="name"
							bind:value={editRuleName}
							required
							class="w-full"
						/>
					</div>

					<div class="col-span-2 md:col-span-1">
						<label for="edit_notifier_type" class="mb-1 block text-sm font-medium">Method*</label>
						<Select
							id="edit_notifier_type"
							name="notifier_type"
							bind:value={editRuleNotifierType}
							required
							class="w-full"
						>
							{#if notifierTypes}
								{#each notifierTypes as notifierType}
									<option value={notifierType.notifier_id}>{notifierType.name}</option>
								{/each}
							{:else}
								<option value="1">Email</option>
								<option value="2">SMS</option>
								<option value="3">Push Notification</option>
							{/if}
						</Select>
					</div>

					<div class="col-span-2 md:col-span-1">
						<label for="edit_recipients" class="mb-1 block text-sm font-medium">
							Recipients*
						</label>
						<div class="flex">
							<TextInput
								id="edit_recipients"
								placeholder="Enter email address"
								bind:value={editRuleActionRecipient}
								class="w-full rounded-r-none"
							/>
							<Button
								variant="secondary"
								class="rounded-l-none"
								onclick={() => {
									if (editRuleActionRecipient.trim() !== '') {
										editRuleActionRecipients = [
											...editRuleActionRecipients,
											editRuleActionRecipient.trim()
										];
										editRuleActionRecipient = '';
									}
								}}
							>
								Add
							</Button>
						</div>

						{#if editRuleActionRecipients.length > 0}
							<div class="mt-2 flex flex-wrap gap-2">
								{#each editRuleActionRecipients as recipient, index}
									<div
										class="inline-flex items-center rounded bg-blue-100 px-2 py-1 text-sm text-blue-800"
									>
										{recipient}
										<button
											type="button"
											class="ml-1 text-blue-600 hover:text-blue-800"
											onclick={() => {
												editRuleActionRecipients = editRuleActionRecipients.filter(
													(_, i) => i !== index
												);
											}}
										>
											×
										</button>
									</div>
								{/each}
							</div>
							<input
								type="hidden"
								name="action_recipient"
								value={editRuleActionRecipients.join(',')}
							/>
						{/if}
					</div>

					<div class="col-span-1 mt-4 md:col-span-2 lg:col-span-3">
						<h3 class="mb-2 text-sm font-medium">Conditions</h3>
						<p class="mb-3 text-sm text-gray-400">
							Define one or more conditions that will trigger this rule.
						</p>

						<!-- Criteria List -->
						{#each editRuleCriteriaItems as criteria, index}
							<div
								class="relative mb-4 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-600 dark:bg-gray-800"
							>
								{#if editRuleCriteriaItems.length > 1}
									<button
										type="button"
										class="absolute top-2 right-2"
										aria-label="Remove condition"
										onclick={() => {
											if (criteria.id) {
												deletedCriteriaIds = [...deletedCriteriaIds, criteria.id];
											}
											editRuleCriteriaItems = editRuleCriteriaItems.filter((_, i) => i !== index);
										}}
									>
										<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M6 18L18 6M6 6l12 12"
											></path>
										</svg>
									</button>
								{/if}

								<div class="grid grid-cols-1 gap-4 md:grid-cols-4">
									<!-- If there's an existing ID for the criteria, keep it as a hidden field -->
									{#if criteria.id}
										<input type="hidden" name={`criteria[${index}].id`} value={criteria.id} />
									{/if}

									<div>
										<label for="criteria_subject_{index}" class="mb-2 text-sm font-medium">
											Subject*
										</label>
										<Select
											id="criteria_subject_{index}"
											bind:value={criteria.subject}
											required
											class="w-full"
										>
											{#each deviceDataFields as field}
												<option value={field}>{$_(field)}</option>
											{/each}
										</Select>
									</div>

									<div>
										<label for="criteria_operator_{index}" class="mb-2 text-sm font-medium"
											>Operation*
										</label>
										<Select
											id="criteria_operator_{index}"
											bind:value={criteria.operator}
											required
											class="w-full"
										>
											{#each operators as operator}
												<option value={operator}>{operator}</option>
											{/each}
										</Select>
									</div>

									<div>
										<label for="criteria_trigger_{index}" class="mb-2 text-sm font-medium">
											Trigger Value*
										</label>
										<TextInput
											id="criteria_trigger_{index}"
											type="number"
											bind:value={criteria.trigger_value}
											step="0.01"
											class="w-full"
											required
										/>
									</div>

									<div>
										<label for="criteria_reset_{index}" class="mb-2 text-sm font-medium">
											Reset Value
										</label>
										<TextInput
											id="criteria_reset_{index}"
											type="number"
											bind:value={criteria.reset_value}
											step="0.01"
											class="w-full"
										/>
									</div>
								</div>
							</div>
						{/each}

						<!-- Add more criteria button -->
						<Button
							variant="secondary"
							onclick={() => {
								editRuleCriteriaItems = [
									...editRuleCriteriaItems,
									{
										subject: deviceDataFields[0] || '',
										operator: '>',
										trigger_value: 0,
										reset_value: 0
									}
								];
							}}
						>
							<svg class="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M12 6v6m0 0v6m0-6h6m-6 0H6"
								></path>
							</svg>
							Add Another Condition
						</Button>

						<!-- Pass all criteria data as JSON -->
						<input type="hidden" name="criteria" value={JSON.stringify(editRuleCriteriaItems)} />
						<!-- Pass deleted criteria IDs as JSON -->
						<input
							type="hidden"
							name="deletedCriteriaIds"
							value={JSON.stringify(deletedCriteriaIds)}
						/>
					</div>
				</div>

				<div class="mt-6 flex justify-end space-x-3">
					<Button variant="secondary" onclick={cancelEdit}>Cancel</Button>

					<Button
						type="submit"
						disabled={isUpdating ||
							editRuleName === '' ||
							editRuleActionRecipients.length === 0 ||
							editRuleCriteriaItems.length === 0}
					>
						{#if creatingNewRule}
							{#if isCreating}
								Creating...
							{:else}
								Create Rule
							{/if}
						{:else if isUpdating}
							Updating...
						{:else}
							Update Rule
						{/if}
					</Button>
				</div>
			</form>
		{/snippet}
	</Dialog>
</section>
