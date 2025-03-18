<script lang="ts">
	import { page } from '$app/stores';
	import { getUserState } from '$lib/state/user-state.svelte';
	import { nameToJapaneseName } from '$lib/utilities/nameToJapanese';
	import {
		mdiExitToApp,
		mdiHome,
		mdiMapMarker,
		mdiRouterNetworkWireless
	} from '@mdi/js';
	import { NavItem } from 'svelte-ux';

	let userContext = getUserState();
	let { user } = $derived(userContext);
</script>

<ul class="w-full text-primary-content">
	{#if user}
		<NavItem
			class="text-primary-content"
			text={nameToJapaneseName('Dashboard')}
			icon={mdiHome}
			currentUrl={$page.url}
			path="/app"
			classes={{ root: 'pl-3', active: 'bg-primary/10 text-primary' }}
		/>
		<NavItem
			class="text-primary-content"
			text={nameToJapaneseName('All Locations')}
			icon={mdiMapMarker}
			currentUrl={$page.url}
			path="/app/location"
			classes={{ root: 'pl-3', active: 'bg-primary/10 text-primary' }}
		/>
		<!-- <NavItem
			class="text-primary-content"
			text="All Devices"
			icon={mdiRouterNetworkWireless}
			currentUrl={$page.url}
			path="/app/location/devices"
			classes={{ root: 'pl-3', active: 'bg-primary/10 text-primary' }}
		/> -->
		<NavItem
			class="text-primary-content"
			text={nameToJapaneseName('Logout')}
			icon={mdiExitToApp}
			currentUrl={$page.url}
			path="/auth/logout"
			classes={{ root: 'pl-3', active: 'bg-primary/10 text-primary' }}
		/>
	{/if}
	{#if !user}
		<NavItem
			class="text-primary-content"
			text={nameToJapaneseName('Login')}
			currentUrl={$page.url}
			path="/auth/login"
			classes={{ root: 'pl-3', active: 'bg-primary/10 text-primary' }}
		/>
	{/if}
</ul>
