<script>
	import {
		AppLayout,
		Button,
		Dialog,
		NavItem,
		ProgressCircle,
		TextField
	} from 'svelte-ux';
	import Header from '$lib/components/core/header/Header.svelte';
	import {
		mdiCog,
		mdiDevices,
		mdiFunction,
		mdiGithub,
		mdiHome,
		mdiMap,
		mdiShieldLock,
		mdiViewDashboard
	} from '@mdi/js';
	import { navigating, page } from '$app/stores';
	import { _, isLoading } from 'svelte-i18n'

	export let data;

	let { supabase, session } = data;
	$: ({ supabase, session } = data);

	let username = session.user?.user_metadata.full_name || session.user?.email;

</script>

<AppLayout areas="'header header' 'aside main'">
	<nav id="primary_nav" slot="nav" class="nav">
		<NavItem path="/" text={$_('header.home')} icon={mdiHome} currentUrl={$page.url} class="mt-2" />

		<NavItem
			path="/app/dashboard"
			text={$_('sidebar.dashboard')}
			icon={mdiViewDashboard}
			currentUrl={$page.url}
			class="mt-2"
		/>

		<NavItem
			path="/app/locations"
			text={$_('sidebar.my_locations')}
			icon={mdiMap}
			currentUrl={$page.url}
			class="mt-2"
		/>

		<NavItem
			path="/app/devices"
			text={$_('sidebar.all_devices')}
			icon={mdiDevices}
			currentUrl={$page.url}
			class="mt-2" 
		/>

		<NavItem path="/app/all-rules" text={$_('sidebar.sensor_rules')} icon={mdiFunction} currentUrl={$page.url} class="mt-2" />

		<NavItem path="/" text={$_('sidebar.permissions')} icon={mdiShieldLock} currentUrl={$page.url} class="mt-2" />
		
		<NavItem path="/app/change-log" text={$_('sidebar.change_log')} icon={mdiGithub} currentUrl={$page.url} class="mt-2" />

		<span class="flex flex-1" />
		<NavItem
			path="/app/settings"
			text={$_('sidebar.settings')}
			icon={mdiCog}
			currentUrl={$page.url}
			class="mt-2"
		/>
	</nav>

	<Header {username}/>

	<main class="scroll-smooth isolate">
		{#if $navigating || $isLoading}
			<div class="flex items-center justify-center h-full">
				<ProgressCircle />
				{#if $isLoading}
					&nbsp; Loading Translations...
				{:else}
					&nbsp; Loading Content...
				{/if}
			</div>
		{:else}
			<div>
				<slot />
			</div>
		{/if}
	</main>
</AppLayout>

<style>
	#primary_nav {
		display: flex;
		flex-direction: column;
	}
</style>
