<script lang="ts">
	import type { Tables } from '../../../../../database.types';
	import { page } from '$app/stores';
	import { browser } from '$app/environment';
	import Rules from '$lib/components/rules/Rules.svelte';

	const rules: Promise<Tables<'cw_rules'>[]> = browser
		? fetch(`/api/v1/devices/${$page.params.dev_eui}/rules`, { method: 'GET' }).then((r) =>
				r.json()
			)
		: Promise.resolve([]);

	let selectedRule: Tables<'cw_rules'> | undefined = undefined;
	let openDialog: boolean = false;
</script>

<h1>RULES</h1>
<button on:click={() => openDialog = true}>Create New Rule</button>

{#await rules}
	<p>Loading Rules...</p>
{:then allRules}
	<ul>
		{#each allRules as rule}
			<li
				on:click={() => {
					selectedRule = rule;
					openDialog = true;
				}}
			>
				{rule.name}
			</li>
		{/each}
	</ul>
{/await}

<dialog open={openDialog}>
	{#if selectedRule}
		<Rules existingRule={selectedRule} />
	{:else}
		<Rules existingRule={undefined} />
	{/if}
	<button
        type="button"
		on:click={() => {
			selectedRule = undefined;
			openDialog = false;
		}}>Close</button
	>
</dialog>
