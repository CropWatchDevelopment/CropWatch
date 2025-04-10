<script lang="ts">
	import { page } from '$app/stores';
	import { getUserState } from '$lib/state/user-state.svelte';
	import { nameToJapaneseName } from '$lib/utilities/nameToJapanese';
	import {
		mdiAccountSchool,
		mdiApi,
		mdiExitToApp,
		mdiFileChart,
		mdiFunction,
		mdiHome,
		mdiMapMarker,
		mdiRouterNetworkWireless,

		mdiTableClock

	} from '@mdi/js';
	import { NavItem } from 'svelte-ux';

	let userContext = getUserState();
	let { user } = $derived(userContext);
</script>

<ul class="text-primary-content flex w-full flex-col">
	{#if user}
		<h1>General</h1>
		<NavItem
			text={nameToJapaneseName('Dashboard')}
			icon={mdiHome}
			currentUrl={$page.url}
			path="/app/dashboard"
			classes={{ root: 'pl-3', active: 'bg-primary/20 font-bold' }}
		/>

		<h1>Locations</h1>
		<NavItem
			text={nameToJapaneseName('All Locations')}
			icon={mdiMapMarker}
			currentUrl={$page.url}
			path="/app/location"
			classes={{ root: 'pl-3', active: 'bg-primary/20 font-bold' }}
		/>

		<h1>Devices</h1>
		<NavItem
			text={nameToJapaneseName('All Devices')}
			icon={mdiMapMarker}
			currentUrl={$page.url}
			path="/app/all-devices"
			classes={{ root: 'pl-3', active: 'bg-primary/20 font-bold' }}
		/>

		<h1>Rules</h1>
		<NavItem
			text="All Device Rules"
			icon={mdiFunction}
			currentUrl={$page.url}
			path="/app/all-rules"
			classes={{ root: 'pl-3', active: 'bg-primary/20 font-bold' }}
		/>

		<h1>Reports</h1>
		<!-- <NavItem
			text="Device Reports"
			icon={mdiMapMarker}
			currentUrl={$page.url}
			path="/app/all-devices"
			classes={{ root: 'pl-3', active: 'bg-primary/20 font-bold' }}
		/> -->
		<NavItem
			text="Device Report Schedule"
			icon={mdiFileChart}
			currentUrl={$page.url}
			path="/app/all-reports/schedules"
			classes={{ root: 'pl-3', active: 'bg-primary/20 font-bold' }}
		/>
		<h1>Gateways</h1>
		<NavItem
			text="LoRaWAN Gateways"
			icon={mdiRouterNetworkWireless}
			currentUrl={$page.url}
			path="/app/all-gateways"
			classes={{ root: 'pl-3', active: 'bg-primary/20 font-bold' }}
		/>

		<span class="flex-grow"></span>
		<h1>Outside Links</h1>
		<NavItem
			text="CropWatch API"
			icon={mdiTableClock}
			currentUrl={$page.url}
			path="https://api.cropwatch.io/swagger"
			target="_blank"
			classes={{ root: 'pl-3', active: 'bg-primary/20 font-bold' }}
		/>
		<NavItem
			text="CropWatch Support"
			currentUrl={$page.url}
			icon={mdiAccountSchool}
			path="https://kb.cropwatch.io"
			target="_blank"
			classes={{ root: 'pl-3', active: 'bg-primary/20 font-bold' }}
		/>
		<NavItem
			text={nameToJapaneseName('Logout')}
			icon={mdiExitToApp}
			currentUrl={$page.url}
			path="/auth/logout"
			classes={{ root: 'pl-3', active: 'bg-primary/20 font-bold' }}
		/>
	{/if}
	{#if !user}
		<NavItem
			text={nameToJapaneseName('Login')}
			currentUrl={$page.url}
			path="/auth/login"
			classes={{ root: 'pl-3', active: 'bg-primary/20 font-bold' }}
		/>
	{/if}
</ul>
