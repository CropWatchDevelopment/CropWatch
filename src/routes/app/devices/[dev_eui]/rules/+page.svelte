<script lang="ts">
	import type { Tables } from '../../../../../database.types';
	import { page } from '$app/stores';
	import { browser } from '$app/environment';
	import Rules from '$lib/components/rules/Rules.svelte';
	import { toast } from '@zerodevx/svelte-toast';

	const rules: Promise<Tables<'cw_rules'>[]> = browser
		? fetch(`/api/v1/devices/${$page.params.dev_eui}/rules`, { method: 'GET' }).then((r) =>
				r.json()
			)
		: Promise.resolve([]);
	const deleteRule = (id: number) => {
		fetch(`/api/v1/devices/${$page.params.dev_eui}/rules?rule-id=${id}`, {
			method: 'DELETE'
		}).then((r) => {
			if (r.ok) {
				toast.push(`Rule Deleted Successfully`, {
					theme: {
						'--toastBackground': 'green',
						'--toastColor': 'black'
					}
				});
			} else {
				toast.push(`Failed to delete Rule`, {
					theme: {
						'--toastBackground': 'red',
						'--toastColor': 'black'
					}
				});
			}
		});
	};

	let selectedRule: Tables<'cw_rules'> | undefined = undefined;
	let openDialog: boolean = false;
</script>

<h1>RULES</h1>
<button on:click={() => (openDialog = true)}>Create New Rule</button>

{#await rules}
	<p>Loading Rules...</p>
{:then allRules}
	<ul>
		{#each allRules as rule}
			<li>
				{rule.name}
				<button
					on:click={() => {
						selectedRule = rule;
						openDialog = true;
					}}>Edit</button
				>
				<button on:click={() => deleteRule(rule.id)}>Delete</button>
			</li>
		{/each}
	</ul>
{/await}

<dialog open={openDialog}>
	{#if selectedRule}
		{JSON.stringify(selectedRule)}
		<Rules existingRule={selectedRule} bind:dialogOpen={openDialog} />
	{:else}
		<Rules existingRule={undefined} bind:dialogOpen={openDialog} />
	{/if}
	<button
		type="button"
		on:click={() => {
			selectedRule = undefined;
			openDialog = false;
		}}>Close</button
	>
</dialog>
