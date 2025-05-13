<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import Spinner from '$lib/components/Spinner.svelte';
	import type { Rule, RuleCriteria } from '$lib/models/Rule';
	import { success, error as toastError } from '$lib/stores/toast.svelte';
	import { onMount } from 'svelte';

	let { data } = $props();
	let { device, rules, locationId, notifierTypes } = $derived(data);

	// For creating a new rule
	let showNewRuleForm = $state(false);
	let newRuleName = $state('');
	let newRuleNotifierType = $derived(
		notifierTypes && notifierTypes.length > 0 ? notifierTypes[0].notifier_id : 1);
	let newRuleActionRecipient = $state('');
	let newRuleActionRecipients: string[] = $state([]);

	// Type definition for rule criteria
	type RuleCriteriaItem = {
		id?: number;
		subject: string;
		operator: string;
		trigger_value: number;
		reset_value: number;
	};

	// Array to store multiple rule criteria for new rules
	let newRuleCriteriaItems: RuleCriteriaItem[] = $state([]);

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

	// Set up operators
	const operators = ['>', '>=', '=', '<=', '<', '!='];

	// Populate device data fields based on device type
	onMount(() => {
		// In a real app, this would be fetched from the server based on device type
		// For now, we'll use some common fields as examples
		switch (device.type_name?.toLowerCase()) {
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
			newRuleCriteriaItems = [
				{ subject: deviceDataFields[0], operator: '>', trigger_value: 0, reset_value: 0 }
			];
			
			editRuleCriteriaItems = [
				{ subject: deviceDataFields[0], operator: '>', trigger_value: 0, reset_value: 0 }
			];
		}
	});

	function addRecipient() {
		if (newRuleActionRecipient.trim() !== '') {
			// Check if the email is valid using a simple regex
			const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
			if (emailRegex.test(newRuleActionRecipient)) {
				newRuleActionRecipients = [...newRuleActionRecipients, newRuleActionRecipient.trim()];
				newRuleActionRecipient = $state('')
			} else {
				toastError('Please enter a valid email address');
			}
		}
	}

	function addCurrentUserEmail() {
		// Add the current user's email from session if available
		if (data.session?.user?.email) {
			const userEmail = data.session.user.email;
			if (!newRuleActionRecipients.includes(userEmail)) {
				newRuleActionRecipients = [...newRuleActionRecipients, userEmail];
			}
		}
	}

	function removeRecipient(index: number) {
		newRuleActionRecipients = newRuleActionRecipients.filter((_, i) => i !== index);
	}

	function handleEditRule(rule: Rule) {
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
		newRuleName = $state('')
		newRuleNotifierType =
			notifierTypes && notifierTypes.length > 0 ? notifierTypes[0].notifier_id : 1;
		newRuleActionRecipient = $state('')
		newRuleActionRecipients = [];
		
		// Reset criteria to default
		if (deviceDataFields.length > 0) {
			newRuleCriteriaItems = [
				{ subject: deviceDataFields[0], operator: '>', trigger_value: 0, reset_value: 0 }
			];
		} else {
			newRuleCriteriaItems = [];
		}
		
		showNewRuleForm = false;
	}

	// Open the new rule form
	function openNewRuleForm() {
		showNewRuleForm = true;
	}
</script>

<svelte:head>
	<title>Device Rules - CropWatch</title>
</svelte:head>

<div class="container mx-auto px-4 py-8">
	<div
		class="bg-foreground-light dark:bg-foreground-dark mb-6 flex flex-wrap items-center justify-between rounded-lg p-4 shadow-md"
	>
		<div>
			<h1 class="text-2xl font-bold">Device Rules</h1>
			<p class="">Manage rules for device: {device.name}</p>
		</div>

		<div class="mt-4 md:mt-0">
			<button
				class="inline-flex items-center rounded-lg bg-green-600 px-4 py-2 font-medium text-white hover:bg-green-700"
				onclick={openNewRuleForm}
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
				Add New Rule
			</button>
		</div>
	</div>

	<!-- New Rule Form -->
	{#if showNewRuleForm}
		<div class="mb-8 rounded-lg border border-gray-200 bg-white p-6 shadow-md">
			<h2 class="mb-4 text-xl font-semibold">Create New Rule</h2>

			<form
				method="POST"
				action="?/createRule"
				use:enhance={() => {
					isCreating = true;

					return async ({ result }) => {
						isCreating = false;

						if (result.type === 'success') {
							if (result.data?.success) {
								success('Rule created successfully');
								resetNewRuleForm();
								// Refresh the page to show the new rule
								goto(`/dashboard/location/${locationId}/device/${device.dev_eui}/settings/rules`, {
									invalidateAll: true
								});
							} else {
								toastError(result.data?.error || 'Failed to create rule');
							}
						} else {
							toastError('An error occurred');
						}
					};
				}}
			>
				<input type="hidden" name="profile_id" value={data.session?.user.id} />
				<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
					<div class="col-span-2">
						<label class="mb-1 block text-sm font-medium text-gray-700">Rule Name*</label>
						<input
							type="text"
							name="name"
							bind:value={newRuleName}
							class="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
							required
						/>
					</div>

					<div>
						<label class="mb-1 block text-sm font-medium text-gray-700">Send To Type*</label>
						<select
							name="notifier_type"
							bind:value={newRuleNotifierType}
							class="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
							required
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
						</select>
					</div>

					<div>
						<label class="mb-1 block text-sm font-medium text-gray-700">Action Recipients*</label>
						<div class="flex">
							<input
								type="text"
								placeholder="Enter email address"
								bind:value={newRuleActionRecipient}
								class="flex-1 rounded-l-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
							/>
							<button
								type="button"
								class="rounded-r-md bg-gray-200 px-3 py-2 font-medium text-gray-800 hover:bg-gray-300"
								onclick={addRecipient}
							>
								Add
							</button>
						</div>
						<button
							type="button"
							class="mt-2 text-xs text-blue-600 hover:text-blue-800"
							onclick={addCurrentUserEmail}
						>
							Add my email
						</button>

						{#if newRuleActionRecipients.length > 0}
							<div class="mt-2 flex flex-wrap gap-2">
								{#each newRuleActionRecipients as recipient, index}
									<div
										class="inline-flex items-center rounded bg-blue-100 px-2 py-1 text-sm text-blue-800"
									>
										{recipient}
										<button
											type="button"
											class="ml-1 text-blue-600 hover:text-blue-800"
											onclick={() => removeRecipient(index)}
										>
											×
										</button>
									</div>
								{/each}
							</div>
							<input
								type="hidden"
								name="action_recipient"
								value={newRuleActionRecipients.join(',')}
							/>
						{/if}
					</div>

					<div class="col-span-2 mt-4">
						<h3 class="mb-2 font-medium text-gray-900">Rule Conditions</h3>
						<p class="mb-3 text-sm text-gray-600">
							Define one or more conditions that will trigger this rule.
						</p>

						<!-- Criteria List -->
						{#each newRuleCriteriaItems as criteria, index}
							<div class="relative mb-4 rounded-lg border bg-gray-50 p-4">
								{#if newRuleCriteriaItems.length > 1}
									<button
										type="button"
										class="absolute top-2 right-2 text-red-500 hover:text-red-700"
										onclick={() => {
											newRuleCriteriaItems = newRuleCriteriaItems.filter((_, i) => i !== index);
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
									<div>
										<label class="mb-1 block text-sm font-medium text-gray-700">Subject*</label>
										<select
											bind:value={criteria.subject}
											class="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
											required
										>
											{#each deviceDataFields as field}
												<option value={field}>{field.replace('_', ' ')}</option>
											{/each}
										</select>
									</div>

									<div>
										<label class="mb-1 block text-sm font-medium text-gray-700">Operation*</label>
										<select
											bind:value={criteria.operator}
											class="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
											required
										>
											{#each operators as operator}
												<option value={operator}>{operator}</option>
											{/each}
										</select>
									</div>

									<div>
										<label class="mb-1 block text-sm font-medium text-gray-700"
											>Trigger Value*</label
										>
										<input
											type="number"
											bind:value={criteria.trigger_value}
											step="0.01"
											class="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
											required
										/>
									</div>

									<div>
										<label class="mb-1 block text-sm font-medium text-gray-700">Reset Value</label
										>
										<input
											type="number"
											bind:value={criteria.reset_value}
											step="0.01"
											class="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
										/>
									</div>
								</div>
							</div>
						{/each}

						<!-- Add more criteria button -->
						<button
							type="button"
							class="inline-flex items-center rounded-md border border-dashed border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:border-gray-500 hover:text-gray-900"
							onclick={() => {
								newRuleCriteriaItems = [
									...newRuleCriteriaItems,
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
						</button>

						<!-- Pass all criteria data as JSON -->
						<input type="hidden" name="criteria" value={JSON.stringify(newRuleCriteriaItems)} />
					</div>
				</div>

				<!-- Add the device EUI as a hidden field -->
				<input type="hidden" name="dev_eui" value={device.dev_eui} />

				<div class="mt-6 flex justify-end space-x-3">
					<button
						type="button"
						class="rounded-lg bg-gray-100 px-4 py-2 font-medium text-gray-800 hover:bg-gray-200"
						onclick={resetNewRuleForm}
					>
						Cancel
					</button>

					<button
						type="submit"
						class="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
						disabled={isCreating || newRuleName === '' || newRuleActionRecipients.length === 0}
					>
						{#if isCreating}
							<Spinner size="sm" class="mr-2" /> Creating...
						{:else}
							Create Rule
						{/if}
					</button>
				</div>
			</form>
		</div>
	{/if}

	<!-- Rules List -->
	<div class="overflow-hidden rounded-lg bg-white shadow-md">
		{#if rules.length === 0}
			<div class="p-8 text-center">
				<svg
					class="mx-auto h-12 w-12 text-gray-400"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					aria-hidden="true"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
					></path>
				</svg>
				<h3 class="mt-2 text-sm font-medium text-gray-900">No rules</h3>
				<p class="mt-1 text-sm">Get started by creating a new rule.</p>
				<div class="mt-6">
					<button
						class="inline-flex items-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
						onclick={openNewRuleForm}
					>
						<svg
							class="mr-2 -ml-1 h-5 w-5"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							xmlns="http://www.w3.org/2000/svg"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 4v16m8-8H4"
							></path>
						</svg>
						New Rule
					</button>
				</div>
			</div>
		{:else}
			<table class="min-w-full divide-y divide-gray-200">
				<thead class="bg-foreground-light dark:bg-foreground-dark">
					<tr>
						<th scope="col" class="px-6 py-3 text-left text-xs font-medium tracking-wider uppercase"
							>Name</th
						>
						<th scope="col" class="px-6 py-3 text-left text-xs font-medium tracking-wider uppercase"
							>Notification Type</th
						>
						<th scope="col" class="px-6 py-3 text-left text-xs font-medium tracking-wider uppercase"
							>Recipients</th
						>
						<th scope="col" class="px-6 py-3 text-left text-xs font-medium tracking-wider uppercase"
							>Condition</th
						>
						<th
							scope="col"
							class="px-6 py-3 text-right text-xs font-medium tracking-wider uppercase">Actions</th
						>
					</tr>
				</thead>
				<tbody class="bg-foreground-light dark:bg-foreground-dark divide-y divide-gray-200">
					{#each rules as rule (rule.id)}
						<tr>
							<td class="px-6 py-4 whitespace-nowrap">
								<div class="text-sm font-bold">{rule.name}</div>
							</td>
							<td class="px-6 py-4 whitespace-nowrap">
								<div class="text-sm">{getNotifierTypeLabel(rule.notifier_type || 1)}</div>
							</td>
							<td class="px-6 py-4">
								<div class="text-sm">
									{#if rule.action_recipient}
										{#each rule.action_recipient.split(',') as recipient}
											<div>{recipient.trim()}</div>
										{/each}
									{:else}
										<span class="italic">No recipients</span>
									{/if}
								</div>
							</td>
							<td class="px-6 py-4">
								<div class="text-sm">
									{#if rule.cw_rule_criteria && rule.cw_rule_criteria.length > 0}
										{#each rule.cw_rule_criteria as criteria}
											<div>
												{criteria.subject || 'Unknown'}
												{criteria.operator || '>'}
												{criteria.trigger_value || 0}
												{#if criteria.reset_value}
													<span class="text-xs text-gray-400">(Reset: {criteria.reset_value})</span>
												{/if}
											</div>
										{/each}
									{:else}
										<span class="italic">No criteria defined</span>
									{/if}
								</div>
							</td>
							<td class="px-6 py-4 text-right text-sm font-medium whitespace-nowrap">
								<button
									class="light:text-indigo-600 mr-3 hover:text-indigo-900"
									onclick={() => handleEditRule(rule)}
								>
									 ✏️ Edit
								</button>
								<button
									class="text-red-600 hover:text-red-900"
									onclick={() => handleDeleteConfirm(rule.id)}
								>
									 🗑️ Delete
								</button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</div>

	<!-- Delete Confirmation Modal -->
	{#if confirmDeleteOpen}
		<div class="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-gray-600">
			<div class="mx-4 max-w-md rounded-lg bg-white p-6">
				<h3 class="mb-4 text-lg font-medium text-gray-900">Confirm Deletion</h3>
				<p class="mb-6 text-gray-600">
					Are you sure you want to delete this rule? This action cannot be undone.
				</p>
				<div class="flex justify-end space-x-3">
					<button
						class="rounded-lg bg-gray-100 px-4 py-2 font-medium text-gray-800 hover:bg-gray-200"
						onclick={cancelDelete}
					>
						Cancel
					</button>

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
											`/dashboard/location/${locationId}/device/${device.dev_eui}/settings/rules`,
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
					>
						<input type="hidden" name="ruleId" value={deletingRuleId} />

						<button
							type="submit"
							class="inline-flex items-center rounded-lg bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-700"
							disabled={isDeleting}
						>
							{#if isDeleting}
								<Spinner size="sm" class="mr-2" /> Deleting...
							{:else}
								Delete Rule
							{/if}
						</button>
					</form>
				</div>
			</div>
		</div>
	{/if}

	<!-- Edit Form Modal -->
	{#if editingRuleId !== null}
		<div class="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-gray-600">
			<div class="mx-4 w-full max-w-4xl rounded-lg bg-white p-6">
				<h3 class="mb-4 text-lg font-medium text-gray-900">Edit Rule</h3>

				<form
					method="POST"
					action="?/updateRule"
					use:enhance={() => {
						isUpdating = true;

						return async ({ result }) => {
							isUpdating = false;

							if (result.type === 'success') {
								if (result.data?.success) {
									success('Rule updated successfully');
									editingRuleId = null;
										// Force reload all data to update the grid
									goto(
										`/dashboard/location/${locationId}/device/${device.dev_eui}/settings/rules`,
										{ invalidateAll: true, replaceState: false }
									).then(() => {
										// Force a complete page reload to ensure fresh data
										window.location.reload();
									});
								} else {
									toastError(result.data?.error || 'Failed to update rule');
								}
							} else {
								toastError('An error occurred');
							}
						};
					}}
				>
					<input type="hidden" name="ruleId" value={editingRuleId} />

					<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
						<div class="col-span-2">
							<label class="mb-1 block text-sm font-medium text-gray-700">Rule Name*</label>
							<input
								type="text"
								name="name"
								bind:value={editRuleName}
								class="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
								required
							/>
						</div>

						<div>
							<label class="mb-1 block text-sm font-medium text-gray-700">Send To Type*</label>
							<select
								name="notifier_type"
								bind:value={editRuleNotifierType}
								class="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
								required
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
							</select>
						</div>

						<div>
							<label class="mb-1 block text-sm font-medium text-gray-700">Action Recipients*</label>
							<div class="flex">
								<input
									type="text"
									placeholder="Enter email address"
									bind:value={editRuleActionRecipient}
									class="flex-1 rounded-l-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
								/>
								<button
									type="button"
									class="rounded-r-md bg-gray-200 px-3 py-2 font-medium text-gray-800 hover:bg-gray-300"
									onclick={() => {
										if (editRuleActionRecipient.trim() !== '') {
											editRuleActionRecipients = [
												...editRuleActionRecipients,
												editRuleActionRecipient.trim()
											];
											editRuleActionRecipient = $state('')
										}
									}}
								>
									Add
								</button>
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

						<div class="col-span-2 mt-4">
							<h3 class="mb-2 font-medium text-gray-900">Rule Conditions</h3>
							<p class="mb-3 text-sm text-gray-600">
								Define one or more conditions that will trigger this rule.
							</p>

							<!-- Criteria List -->
							{#each editRuleCriteriaItems as criteria, index}
								<div class="relative mb-4 rounded-lg border bg-gray-50 p-4">
									{#if editRuleCriteriaItems.length > 1}
										<button
											type="button"
											class="absolute top-2 right-2 text-red-500 hover:text-red-700"
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
											<label class="mb-1 block text-sm font-medium text-gray-700">Subject*</label>
											<select
												bind:value={criteria.subject}
												class="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
												required
											>
												{#each deviceDataFields as field}
													<option value={field}>{field.replace('_', ' ')}</option>
												{/each}
											</select>
										</div>

										<div>
											<label class="mb-1 block text-sm font-medium text-gray-700">Operation*</label>
											<select
												bind:value={criteria.operator}
												class="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
												required
											>
												{#each operators as operator}
													<option value={operator}>{operator}</option>
												{/each}
											</select>
										</div>

										<div>
											<label class="mb-1 block text-sm font-medium text-gray-700"
												>Trigger Value*</label
											>
											<input
												type="number"
												bind:value={criteria.trigger_value}
												step="0.01"
												class="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
												required
											/>
										</div>

										<div>
											<label class="mb-1 block text-sm font-medium text-gray-700">Reset Value</label
											>
											<input
												type="number"
												bind:value={criteria.reset_value}
												step="0.01"
												class="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
											/>
										</div>
									</div>
								</div>
							{/each}

							<!-- Add more criteria button -->
							<button
								type="button"
								class="inline-flex items-center rounded-md border border-dashed border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:border-gray-500 hover:text-gray-900"
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
							</button>

							<!-- Pass all criteria data as JSON -->
							<input type="hidden" name="criteria" value={JSON.stringify(editRuleCriteriaItems)} />
							<!-- Pass deleted criteria IDs as JSON -->
							<input type="hidden" name="deletedCriteriaIds" value={JSON.stringify(deletedCriteriaIds)} />
						</div>
					</div>

					<div class="mt-6 flex justify-end space-x-3">
						<button
							type="button"
							class="rounded-lg bg-gray-100 px-4 py-2 font-medium text-gray-800 hover:bg-gray-200"
							onclick={cancelEdit}
						>
							Cancel
						</button>

						<button
							type="submit"
							class="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
							disabled={isUpdating ||
								editRuleName === '' ||
								editRuleActionRecipients.length === 0 ||
								editRuleCriteriaItems.length === 0}
						>
							{#if isUpdating}
								<Spinner size="sm" class="mr-2" /> Updating...
							{:else}
								Update Rule
							{/if}
						</button>
					</div>
				</form>
			</div>
		</div>
	{/if}
</div>
