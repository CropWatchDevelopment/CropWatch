<script lang="ts">
	import CWCopy from '$lib/components/CWCopy.svelte';
	import CWDuration from '$lib/components/CWDuration.svelte';

	let {
		deviceName,
		devEui,
		facilityName,
		locationName,
		latestTimestamp
	}: {
		deviceName?: string | null;
		devEui: string;
		facilityName?: string | null;
		locationName?: string | null;
		latestTimestamp: string;
	} = $props();
</script>

<header class="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-lg shadow-slate-950/40">
	<div class="flex flex-wrap items-center justify-between gap-4">
		<div>
			<h1 class="mt-1 text-3xl font-semibold text-white">{deviceName}</h1>
			<p class="text-sm text-slate-400">
				Device EUI •
				<CWCopy value={devEui} size="sm" />
			</p>
		</div>
		<div class="text-right text-sm text-slate-400">
			{#if locationName}
				<p>Location: {locationName}</p>
			{/if}
			{#if facilityName}
				<p>Facility: {facilityName}</p>
			{/if}
			<p>Updated: <CWDuration date={latestTimestamp}></CWDuration></p>
		</div>
	</div>
</header>
