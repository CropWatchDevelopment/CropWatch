<script lang="ts">
	import '@cropwatchdevelopment/cwui/styles';
	import CropWatchLOGO from '$lib/images/cropwatch_static.svg';
	import './layout.css';
	import {
		createCwToastContext,
		CwOfflineOverlay,
		CwSearchInput,
		CwSideNav,
		CwToastContainer,
		type CwSideNavItem,
		type CwSideNavMode
	} from '@cropwatchdevelopment/cwui';
	import { page } from '$app/state';
	import OverviewDrawer from './OverviewDrawer.svelte';
	import Header from './Header.svelte';
	import Sidebar from './Sidebar.svelte';

	let { children } = $props();
	createCwToastContext();

	let mode = $state<CwSideNavMode>('open');

	let isAuthRoute: boolean = $derived(page.url.pathname.startsWith('/auth'));
</script>

<CwToastContainer />
<div style="display:flex; height:100vh">
	{#if !isAuthRoute}
		<Sidebar bind:mode />
		<div style="flex:1; display:flex; flex-direction:column">
			<Header {mode} />
			<CwToastContainer />
			<main style="flex:1; padding:0.5rem; overflow-y:auto">
				{@render children()}
			</main>
			<OverviewDrawer />
		</div>
	{:else}
		<main style="flex:1; overflow-y:auto">
			{@render children()}
		</main>
	{/if}
</div>

<CwOfflineOverlay />
