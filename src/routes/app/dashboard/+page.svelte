<script lang="ts">
	import { mdiViewDashboard } from '@mdi/js';
	import { Avatar, Card, Header, Icon, MenuItem } from 'svelte-ux';
	import CWStatCard from '$lib/components/stat-card/CWStatCard.svelte';
	import backgroundImg from '$lib/images/breadcrumb-bg.jpg';
	import CwTable from '$lib/components/table/CWTable.svelte';
	import { openFeedback } from '$lib/stores/feedback.store.js';
	import { onMount } from 'svelte';

	export let data;

	let devices = null;

	onMount(async () => {

		const deviceTableResponse = await fetch('/api/device-table', {method: 'GET'});
		devices = await deviceTableResponse.json();

	});
</script>

<h1
	class="flex items-center text-2xl font-bold border-b mb-4 w-full text-white relative"
	style="left:-8px; top:-8px; background-image:url({backgroundImg}); width:100%; height: 120px;"
>
	<div class="flex items-center space-x-2 ml-2">
		<Icon data={mdiViewDashboard} />
		<span>Dashboard</span>
	</div>
</h1>

<div class="grid grid-cols-1 md:grid-cols-3 gap-5">
	<Card>
		<Header title="Device Status" subheading="Subheading" slot="header">
			<div slot="avatar">
				<Avatar class="bg-primary text-primary-content font-bold">A</Avatar>
			</div>
			<div slot="actions">
				<MenuItem on:click={() => openFeedback()}>Give Feedback</MenuItem>
			</div>
		</Header>
		<h1 class="text-4xl md:text-2xl lg:text-4xl text-gray-700" slot="contents">
			{data.online.length} / {data.online.length + data.offline.length} Online
		</h1>
	</Card>

	<CWStatCard title="Gateways Online" value={3} notation=" Online" counterStartTime={null}
		><div slot="headerMore">
			<MenuItem on:click={() => openFeedback()}>Give Feedback</MenuItem>
		</div>
	</CWStatCard>
	<CWStatCard counterStartTime={null}
		><div slot="headerMore">
			<MenuItem on:click={() => openFeedback()}>Give Feedback</MenuItem>
		</div>
	</CWStatCard>
</div>

<Card class="mt-10">
	{#if devices}
		<CwTable data={devices} />
		{/if}
</Card>

<style global>
	@import 'https://cdn.jsdelivr.net/npm/gridjs/dist/theme/mermaid.min.css';
</style>
