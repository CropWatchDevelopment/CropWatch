<script lang="ts">
	import { page } from '$app/stores';
	import type { Tables } from '$lib/types/supabaseSchema';
	import { mdiEye, mdiPencil, mdiPlus, mdiTrashCan } from '@mdi/js';
	import { onMount } from 'svelte';
	import { Button, ListItem, Tooltip } from 'svelte-ux';
	import RuleList from './rules/RuleList.svelte';
	import RuleAdd from './rules/RuleAdd.svelte';

	let rules: Tables<'cw_rules'>[] = [];
	let devEui = $page.params.dev_eui;
	let state: 'list' | 'add' | 'edit' = 'list';

	onMount(async () => {
		console.log(devEui);
		const rulesPromise = await fetch(`/api/v1/rules/${devEui}`);
		rules = await rulesPromise.json();
		console.log(rules);
	});
</script>

<h1 class="flex flex-row justify-center px-4 text-center">
	Configured Rules
	<span class="flex-1" />
	<Tooltip title="Add a new rule">
		<Button
			icon={mdiPlus}
			variant="fill"
			color="success"
			on:click={() => {
				state = 'add';
			}}
		/>
	</Tooltip>
</h1>

{#if state === 'list'}
	<RuleList {rules} />
{:else if state === 'add'}
	<RuleAdd />
{/if}
