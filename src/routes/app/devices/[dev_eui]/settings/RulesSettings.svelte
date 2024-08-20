<script lang="ts">
	import { page } from '$app/stores';
	import type { Tables } from '$lib/types/supabaseSchema';
	import { mdiPlus } from '@mdi/js';
	import { onMount } from 'svelte';
	import { Button, Tooltip } from 'svelte-ux';
	import RuleList from './rules/RuleList.svelte';
	import RuleAdd from './rules/RuleAdd.svelte';
	import { _ } from 'svelte-i18n';

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
	{$_('devices.rules.title')}
	<span class="flex-1" />
	<Tooltip title="{$_('devices.rules.addRule')}">
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
	<RuleAdd bind:state />
{/if}
