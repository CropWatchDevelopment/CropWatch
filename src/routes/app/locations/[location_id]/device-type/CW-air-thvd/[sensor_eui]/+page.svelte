<script lang="ts">
	import CwBadge from '$lib/components/badge/CWBadge.svelte';
	import { Button, Duration, Tabs } from 'svelte-ux';
	import Details from './details/Details.svelte';
	import History from './history/History.svelte';
	import Rules from './rules/Rules.svelte';
	import Notifications from './notifications/Notifications.svelte';
	import Settings from './settings/Settings.svelte';
	import Permissions from './permissions/Permissions.svelte';
	import { subSeconds } from 'date-fns';
	import { mdiChevronLeft } from '@mdi/js';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	export let data;
	console.log('Data from the THVPD root page', data);

	let userAvailableTabs = [
		{ label: 'Dashboard', value: 1 },
		{ label: 'History', value: 2 },
		{ label: 'Rules', value: 3 },
		{ label: 'Notifications', value: 4 },
		{ label: 'Settings', value: 5 },
		{ label: 'Permissions', value: 6 }
	];
	let currentTab: number = 1;
</script>

<h1 class="flex flex-row text-4xl font-semibold text-slate-700 mb-4 gap-3">
	<Button
		variant="outline"
		icon={mdiChevronLeft}
		size="lg"
		on:click={() => goto(`/app/locations/${$page.params.location_id}`)}
	/>
	<p class="my-auto">Temperature Sensor</p>
</h1>

<div class="grid grid-cols-3 grid-flow-row my-4">
	<div class="flex flex-col">
		<p class="mb-1 text-gray-600">Serial Number</p>
		<p class="text-sm">{$page.params.sensor_eui}</p>
	</div>

	<div class="flex flex-col">
		<p class="mb-1 text-gray-600">Last Update</p>
		<p class="text-sm">
			{new Date(data?.sensor?.data?.at(0).created_at).toLocaleTimeString()}
			<small
				>(<Duration start={subSeconds(data.sensor.data?.at(0).created_at, 0)} totalUnits={1} /> ago)</small
			>
		</p>
	</div>

	<div class="flex flex-col">
		<p class="mb-1 text-gray-600">Tags</p>
		<div>
			<CwBadge text="test" twTextColor="text-blue-800" twBgColor="bg-blue-100" />
		</div>
	</div>
</div>

<Tabs
	options={userAvailableTabs}
	bind:value={currentTab}
	classes={{
		content: 'border px-4 py-2 rounded-b rounded-tr',
		tab: { root: 'rounded-t' }
	}}
>
	<svelte:fragment slot="content" let:value>
		{#if value === 1}
			{#await data}
				loading...
			{:then sensor}
				<Details {sensor} />
			{/await}
		{:else if value === 2}
			{#await data}
				loading...
			{:then sensor}
				<History {sensor} />
			{/await}
		{:else if value === 3}
			<Rules />
		{:else if value === 4}
			<Notifications />
		{:else if value === 5}
			<Settings />
		{:else if value === 6}
			<Permissions />
		{/if}
	</svelte:fragment>
</Tabs>
