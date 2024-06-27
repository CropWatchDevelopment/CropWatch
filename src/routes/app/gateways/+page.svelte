<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Back from '$lib/components/ui/Back.svelte';
	import { mdiEye, mdiRouterWireless, mdiRouterWirelessOff } from '@mdi/js';
	import { Button, Icon } from 'svelte-ux';
	import DarkCard2 from '$lib/components/ui/DarkCard2.svelte';

	export let data;
</script>

<Back>
	<span class="w-full inline-block flex-nowrap text-xl">
		<h1 class="text-slate-200">{$_('gateways.title')}</h1>
	</span>
</Back>

<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
	{#if data.gateways.length > 0}
		{#each data.gateways as gateway}
			<DarkCard2>
				{#if gateway.isOnline}
					<Icon data={mdiRouterWireless} class="w-full h-12 text-green-600" />
					<p class="text-green-400 text-center">{$_('gateways.online')}</p>
				{:else}
					<Icon data={mdiRouterWirelessOff} class="w-full h-12 text-red-600" />
					<p class="text-red-400 text-center">{$_('gateways.offline')}</p>
				{/if}
				<h2>{gateway.gateway_id}</h2>
				<Button
                    icon={mdiEye}
					class="text-blue-300 hover:underline w-full"
					href="https://ttnmapper.org/gateways/?gateway={gateway.gateway_id}&startdate=&enddate=&gateways=on&lines=off&points=off"
				>
					View On Map
				</Button>
			</DarkCard2>
		{/each}
	{:else}
		<p>{$_('gateways.no_gateways')}</p>
	{/if}
</div>
