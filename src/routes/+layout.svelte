<script lang="ts">
	import '@cropwatchdevelopment/cwui/styles';
	import './layout.css';
	import {
		createCwToastContext,
		CwOfflineOverlay,
		CwToastContainer,
		type CwSideNavMode
	} from '@cropwatchdevelopment/cwui';
	import { afterNavigate } from '$app/navigation';
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

	function syncAppContextFromLayoutData() {
		const rawTriggeredRulesCount = data.triggeredRulesCount;
		let triggeredRulesCount = 0;

		if (typeof rawTriggeredRulesCount === 'number' && Number.isFinite(rawTriggeredRulesCount)) {
			triggeredRulesCount = rawTriggeredRulesCount;
		} else if (rawTriggeredRulesCount && typeof rawTriggeredRulesCount === 'object') {
			const maybeCount =
				(rawTriggeredRulesCount as Record<string, unknown>).count ??
				(rawTriggeredRulesCount as Record<string, unknown>).triggered_count;
			if (typeof maybeCount === 'number' && Number.isFinite(maybeCount)) {
				triggeredRulesCount = maybeCount;
			}
		}

		app.session = data.session ?? null;
		app.devices = data.devices ?? [];
		app.deviceStatuses = data.deviceStatuses ?? { online: 0, offline: 0 };
		app.triggeredRules = data.triggeredRules ?? [];
		app.triggeredRulesCount = triggeredRulesCount;
		app.accessToken = data.authToken ?? undefined;
	}

	const app = $state(createAppContext());

	syncAppContextFromLayoutData();
	afterNavigate(() => {
		syncAppContextFromLayoutData();
	});

	$inspect(app);
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
