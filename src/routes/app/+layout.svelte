<script>
	import { AppLayout, Breadcrumb, ListItem, NavItem } from 'svelte-ux';
	import Header from '$lib/components/core/header/Header.svelte';
	import {
		mdiCog,
		mdiDevices,
		mdiFunction,
		mdiHome,
		mdiMap,
		mdiShieldLock,
		mdiViewDashboard
	} from '@mdi/js';
	import { page } from '$app/stores';

	let items = ['First', 'Second', 'Third'];
</script>

<AppLayout areas="'header header' 'aside main'">
	<nav id="primary_nav" slot="nav" class="nav">
		<NavItem path="/" text="Home" icon={mdiHome} currentUrl={$page.url} class="mt-2" />

		<NavItem
			path="/app/dashboard"
			text="Dashboard"
			icon={mdiViewDashboard}
			currentUrl={$page.url}
			class="mt-2"
		/>

		<NavItem
			path="/app/locations"
			text="My Locations"
			icon={mdiMap}
			currentUrl={$page.url}
			class="mt-2"
		/>

		<NavItem path="/" text="My Devices" icon={mdiDevices} currentUrl={$page.url} class="mt-2" />

		<NavItem path="/" text="Data Rules" icon={mdiFunction} currentUrl={$page.url} class="mt-2" />

		<NavItem path="/" text="Permissions" icon={mdiShieldLock} currentUrl={$page.url} class="mt-2" />

		<NavItem
			path="/app/settings"
			text="Settings"
			icon={mdiCog}
			currentUrl={$page.url}
			class="mt-2"
		/>
	</nav>

	<Header />

	<main class="scroll-smooth isolate">
		<!-- <div
			class="[@media(min-height:900px)]:sticky top-0 z-[60] bg-surface-200/90 backdrop-blur px-5 py-4 [mask-image:linear-gradient(to_bottom,rgba(0,0,0,1)calc(100%-4px),rgba(0,0,0,0))]"
		>
			<div class="flex gap-2 mt-3">
				<Breadcrumb {items} />
			</div>
			<div class="text-2xl font-bold">Breadcrumb</div>
		</div> -->
		<div class="p-2">
			<slot />
		</div>
	</main>
</AppLayout>

<style>
	#primary_nav {
		display: flex;
		flex-direction: column;
	}
</style>
