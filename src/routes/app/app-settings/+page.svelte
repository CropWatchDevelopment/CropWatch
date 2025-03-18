<script lang="ts">
	import GeneralAppSettings from '$lib/components/UI/GeneralAppSettings.svelte';
	import { getUserState } from '$lib/state/user-state.svelte.js';
	import { mdiCog } from '@mdi/js';
	import { Icon, Tabs } from 'svelte-ux';

	let { data } = $props();

	let userContext = getUserState();
	userContext.fetchLocations();

	let options = [
		{ label: 'General', value: 1 },
        { label: 'Notation Settings', value: 2 },
	];

	let value: number = $state(1);
</script>

<h1 class="mb-1 flex w-full flex-row">
	<Icon data={mdiCog} class="mr-2 items-center" />
	App wide Settings
</h1>

<Tabs {options} bind:value>
	<svelte:fragment slot="content" let:value>
		{#if value === 1}
			<GeneralAppSettings />
		{:else if value === 2}
			settings 2
		{/if}
	</svelte:fragment>
</Tabs>

<pre>{JSON.stringify(data, null, 2)}</pre>