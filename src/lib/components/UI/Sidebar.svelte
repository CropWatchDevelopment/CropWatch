<script lang="ts">
	import { page } from '$app/stores';
	import { getUserState } from '$lib/state/user-state.svelte';
	import { nameToJapaneseName } from '$lib/utilities/nameToJapanese';
	import { mdiAccountSchool, mdiApi, mdiExitToApp, mdiHome, mdiMapMarker, mdiRouterNetworkWireless } from '@mdi/js';
	import { NavItem } from 'svelte-ux';

	let userContext = getUserState();
	let { user } = $derived(userContext);
</script>

<ul class="flex w-full flex-col text-primary-content">
	{#if user}
		<h1>General</h1>
		<NavItem
			text={nameToJapaneseName('Dashboard')}
			icon={mdiHome}
			currentUrl={$page.url}
			path="/app"
			classes={{ root: 'pl-3', active: 'bg-primary/10 text-primary' }}
		/>


		<h1>Locations</h1>
		<NavItem
			text={nameToJapaneseName('All Locations')}
			icon={mdiMapMarker}
			currentUrl={$page.url}
			path="/app/location"
			classes={{ root: 'pl-3', active: 'bg-primary/10 text-primary' }}
		/>
		
		<h1>Devices</h1>
		<NavItem
			text={nameToJapaneseName('All Devices')}
			icon={mdiMapMarker}
			currentUrl={$page.url}
			path="/app/all-devices"
			classes={{ root: 'pl-3', active: 'bg-primary/10 text-primary' }}
		/>

		<span class="flex-grow"></span>

		<h1>Outside Links</h1>
		<NavItem
			text="CropWatch API"
			icon={mdiApi}
			currentUrl={$page.url}
			path="https://api.cropwatch.io/swagger"
			target="_blank"
			classes={{ root: 'pl-3', active: 'bg-primary/10 text-primary' }}
		/>
		<NavItem
			text="CropWatch Support"
			currentUrl={$page.url}
			icon={mdiAccountSchool}
			path="https://kb.cropwatch.io"
			target="_blank"
			classes={{ root: 'pl-3', active: 'bg-primary/10 text-primary' }}
		/>
		<NavItem
			text={nameToJapaneseName('Logout')}
			icon={mdiExitToApp}
			currentUrl={$page.url}
			path="/auth/logout"
			classes={{ root: 'pl-3', active: 'bg-primary/10 text-primary' }}
		/>
	{/if}
	{#if !user}
		<NavItem
			text={nameToJapaneseName('Login')}
			currentUrl={$page.url}
			path="/auth/login"
			classes={{ root: 'pl-3', active: 'bg-primary/10 text-primary' }}
		/>
	{/if}
</ul>
