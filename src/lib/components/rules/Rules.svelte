<script lang="ts">
	import { browser } from '$app/environment';
	import { page } from '$app/stores';
	import { uuidv4 } from '$lib/utilities/uuidv4';
	import type { Tables } from '../../../database.types';
	import SubRule from './SubRule.svelte';
	import { applyAction, deserialize, enhance } from '$app/forms';
	import { goto, invalidateAll } from '$app/navigation';
	import { toast } from '@zerodevx/svelte-toast';
	import { SelectField, TextField, Button } from 'svelte-ux';
	import { mdiPlus } from '@mdi/js';
	import { _ } from 'svelte-i18n';

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
		? fetch(`/api/v1/devices/${$page.params.dev_eui}/data?page=0&count=1`, { method: 'GET' }).then(
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
			criteria.ruleGroupId = ruleGroup.groupId;
			const criteriaData = JSON.stringify(criteria);
			return fetch(`/api/v1/devices/${$page.params.dev_eui}/rules/criteria/${criteria.id || -1}`, {
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

<form
	method={isNew ? 'POST' : 'POST'}
	action="/api/v1/devices/{$page.params.dev_eui}/rules"
	on:submit|preventDefault={handleSubmit}
	use:enhance={({ formElement, formData, action, cancel, submitter }) => {
		return async ({ result, update }) => {
			if (result.status && result.status < 400) {
				update();
				goto('/rules');
				toast.push('Rule Created Successfully!', {
					theme: {
						'--toastBackground': 'success',
						'--toastColor': 'black'
					}
				});
			} else {
				toast.push(form?.message ?? 'Error Creating Rule, Contact Support', {
					theme: {
						'--toastBackground': 'red',
						'--toastColor': 'black'
					}
				});
			}
		};
	}}
>
	<input type="hidden" id="ruleGroupId" name="ruleGroupId" bind:value={ruleGroup.groupId} />
	<input type="hidden" id="dev_eui" name="dev_eui" bind:value={$page.params.dev_eui} />
	<div class="mx-4 flex flex-col gap-4">
		<div>
			<label for="name" class="text-surface-100">{$_('rules.rule_name')}:</label>
			<TextField label={$_('rules.ruleName')} id="name" name="name" required bind:value={ruleGroup.ruleName} />
		</div>

		<div class="m-4">
			<p class="text-surface-100">{$_('rules.rule_criteria')}:</p>
			{#await dataItem}
				loading data items
			{:then dataItem}
				{#if ruleGroup.cw_rule_criteria.length == 0}
					<p class="text-surface-100 text-center">{$_('rules.no_rule_criteria')}</p>
				{:else}
					{#each ruleGroup.cw_rule_criteria as singleRule, i}
						<SubRule bind:root={singleRule} dataItem={dataItem}>
							<!-- <button on:click={() => onDelete(i)} color="danger">Delete</button> -->
						</SubRule>
						AND
					{/each}
				{/if}
			{/await}

			<div class="flex flex-row mt-4">
				<Button on:click={() => onAdd()} icon={mdiPlus} variant="outline" color="success"
					>{$_('rules.add_condition_button')}</Button
				>
			</div>
		</div>

		<div>
			<label for="type" class="text-surface-100">{$_('rules.notification_type')}:</label>
			<SelectField
				bind:value={ruleGroup.babylon_notifier_type}
				name="babylon_notifier_type"
				id="babylon_notifier_type_control"
				options={[
					{ value: 1, label: $_('rules.notification_email') },
					{ value: 2, label: 'SMS' }
				]}
			/>
		</div>

		<div class="mb-4">
			<label for="action_recipient" class="text-surface-100">{$_('rules.recipients')}:</label>
			<TextField
				label={$_('rules.emails')}
				id="action_recipient"
				name="action_recipient"
				required
				bind:value={ruleGroup.action_recipient}
			/>
		</div>
	</div>

	<Button
		type="submit"
		disabled={!ruleGroup.cw_rule_criteria || ruleGroup.cw_rule_criteria.length == 0}
		variant="fill"
		color="primary"
		class="w-full">{isNew ? $_('rules.create') : 'Update'}</Button
	>
</form>
