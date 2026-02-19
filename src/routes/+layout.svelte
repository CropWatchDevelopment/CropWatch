<script lang="ts">
	import '@cropwatchdevelopment/cwui/styles';
	import CropWatchLOGO from '$lib/images/cropwatch_static.svg';
	import './layout.css';
	import {
		createCwToastContext,
		CwSideNav,
		CwToastContainer,
		type CwSideNavItem,
		type CwSideNavMode
	} from '@cropwatchdevelopment/cwui';
	import { page } from '$app/state';
	import OverviewDrawer from './OverviewDrawer.svelte';
	import Header from './Header.svelte';

	let { children } = $props();
	createCwToastContext();

	let mode = $state<CwSideNavMode>('open');
	const navItems: CwSideNavItem[] = [
		{ id: 'home', label: 'Dashboard', href: '/', icon: 'M8 1.5L1 7h2v6h4V9h2v4h4V7h2L8 1.5z' },
		{ id: 'devices', label: 'Devices', href: '/devices', icon: 'M3 3h10v8H3V3zm2 10h6' }
	];

	let isAuthRoute: boolean = $derived(page.url.pathname.startsWith('/auth'));
</script>

<CwToastContainer />
<div style="display:flex; height:100vh">
	{#if !isAuthRoute}
		<CwSideNav items={navItems} bind:mode responsive>
			{#snippet header()}
				<div class="demo-shell__logo flex flex-row items-center gap-2">
					<img src={CropWatchLOGO} alt="CropWatch Logo" style="width:1.5rem;height:2rem" />
					<span class="demo-shell__logo-text">CropWatch UI</span>
				</div>
			{/snippet}
			{#snippet headerMini()}
				<img src={CropWatchLOGO} alt="CropWatch Logo" style="width:1.25rem;height:1.25rem" />
			{/snippet}
		</CwSideNav>
		<div style="flex:1; display:flex; flex-direction:column">
			<Header {mode} />
			<CwToastContainer />
			<main style="flex:1; overflow-y:auto">
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
