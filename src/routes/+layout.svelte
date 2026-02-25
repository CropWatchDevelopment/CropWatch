<script lang="ts">
	import '@cropwatchdevelopment/cwui/styles';
	import './layout.css';
	import {
		createCwToastContext,
		CwOfflineOverlay,
		CwToastContainer,
		type CwSideNavMode
	} from '@cropwatchdevelopment/cwui';
	import { page } from '$app/state';
	import OverviewDrawer from './OverviewDrawer.svelte';
	import Header from './Header.svelte';
	import Sidebar from './Sidebar.svelte';
	import { createAppContext, setAppContext } from '$lib/appContext.svelte';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();
	createCwToastContext();

	let mode = $state<CwSideNavMode>('open');
	let isAuthRoute: boolean = $derived(page.url.pathname.startsWith('/auth'));

	const app = $state(
		createAppContext({
			session: (() => data.session)(),
			devices: (() => data.devices)(),
			deviceStatuses: (() => data.deviceStatuses)(),
			triggeredRules: (() => data.triggeredRules)(),
			triggeredRulesCount: (() => data.triggeredRulesCount.triggered_count)(),
			accessToken: (() => data.authToken)(),
		})
	);
	setAppContext(app);
</script>

<CwOfflineOverlay />
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
