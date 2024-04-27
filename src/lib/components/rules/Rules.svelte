<script lang="ts">
	import { browser } from '$app/environment';
	import { page } from '$app/stores';
	import { uuidv4 } from '$lib/utilities/uuidv4';
	import { onMount } from 'svelte';
	import type { Tables } from '../../../database.types';
	import SubRule from './SubRule.svelte';
	import { applyAction, deserialize, enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { toast } from '@zerodevx/svelte-toast';

	export let existingRule: Tables<'cw_rules'> | undefined = undefined;
	export let dialogOpen: boolean;
	const isNew: boolean = existingRule ? false : true;

	let ruleGroupId = existingRule?.ruleGroupId ?? uuidv4();
	let ruleGroup = {
		cw_rule_criteria: existingRule?.cw_rule_criteria ?? [],
		groupId: existingRule?.ruleGroupId ?? ruleGroupId,
		dev_eui: existingRule?.dev_eui ?? $page.params.sensor_eui,
		ruleName: existingRule?.name ?? '',
		babylon_notifier_type: existingRule?.babylon_notifier_type ?? 1,
		action_recipient: existingRule?.action_recipient ?? []
	};

	const dataItem: Promise<any[]> = browser
		? fetch(`/api/v1/devices/${$page.params.dev_eui}/data?page=1&count=1`, { method: 'GET' }).then(
				(response) => response.json()
			)
		: Promise.resolve([]);

	const onAdd = () => {
		ruleGroup.cw_rule_criteria.push({});
		ruleGroup.cw_rule_criteria = ruleGroup.cw_rule_criteria;
	};

	async function handleSubmit(event) {
		const data = new FormData(event.currentTarget);
		const response = await fetch(event.currentTarget.action, {
			method: isNew ? 'POST' : 'PUT',
			body: data
		});


		const promises = ruleGroup.cw_rule_criteria.map(async (criteria) => {
			const criteriaData = JSON.stringify(criteria);
			return fetch(`/api/v1/devices/${$page.params.dev_eui}/rules/criteria/${criteria.id || ''}`, {
				method: criteria.id ? 'PUT' : 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: criteriaData
			});
		});

		const results = await Promise.all(promises);
		results.forEach(async (result, index) => {
			if (!result.ok) {
				console.error(`Failed to update criteria ${index}`, await result.text());
				toast.push(`Failed to update criteria ${index}`, {
					theme: {
						'--toastBackground': 'red',
						'--toastColor': 'black'
					}
				});
			}
		});

		// If all goes well
		await invalidateAll();
		applyAction({ type: 'success' });

		/** @type {import('@sveltejs/kit').ActionResult} */
		const result = await response.status;

		if (result === 200) {
			// rerun all `load` functions, following the successful update
			toast.push('Rule Updated Successfully!', {
					theme: {
						'--toastBackground': 'cyan',
						'--toastColor': 'black'
					}
				});
				dialogOpen = false;
			await invalidateAll();
		}

		applyAction(result);
	}
</script>

<h1>Edit Rule</h1>

<form
	method={isNew ? 'PUT' : 'POST'}
	action="/api/v1/devices/{$page.params.dev_eui}/rules"
	on:submit|preventDefault={handleSubmit}
>
	<input type="hidden" id="ruleGroupId" name="ruleGroupId" bind:value={ruleGroup.groupId} />
	<div>
		<label for="name">Name</label>
		<input type="text" id="name" name="name" required bind:value={ruleGroup.ruleName} />
		<label for="type">Notification Type</label>
		<select name="babylon_notifier_type" bind:value={ruleGroup.babylon_notifier_type}>
			<option value={1}>Email</option>
			<option value={2}>SMS</option>
		</select>

		<label for="action_recipient">Recipient</label>
		<input
			type="text"
			id="action_recipient"
			name="action_recipient"
			required
			bind:value={ruleGroup.action_recipient}
		/>
	</div>
	<div>
		{#await dataItem}
			loading data items
		{:then dataItem}
			{#each ruleGroup.cw_rule_criteria as singleRule, i}
				<SubRule bind:root={singleRule} dataItem={dataItem[0]}>
					<button on:click={() => onDelete(i)} color="danger">Delete</button>
				</SubRule>
			{/each}
		{/await}
	</div>
	<button type="submit">{isNew ? 'Create' : 'Update'}</button>
</form>

<div class="flex flex-row">
	<button on:click={() => onAdd()} color="success">Add additional condition</button>
</div>

<pre>
	{JSON.stringify(ruleGroup, null, 2)}
</pre>
