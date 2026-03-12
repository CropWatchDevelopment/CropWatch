<script lang="ts">
	import './layout.css';
	import { onDestroy } from 'svelte';
	import {
		createCwToastContext,
		CwOfflineOverlay,
		CwToastContainer,
		type CwSideNavMode
	} from '@cropwatchdevelopment/cwui';
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import OverviewDrawer from './OverviewDrawer.svelte';
	import Sidebar from './Sidebar.svelte';
	import { createAppContext, setAppContext } from '$lib/appContext.svelte';
	import type { LayoutProps } from './$types';
	import Header from './Header.svelte';

	let { data, children }: LayoutProps = $props();
	createCwToastContext();

	let mode = $state<CwSideNavMode>('open');
	let isAuthRoute: boolean = $derived(page.url.pathname.startsWith('/auth'));
	let resizeTimer: ReturnType<typeof setTimeout> | null = null;

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
		app.totalDeviceCount = data.totalDeviceCount ?? app.devices.length;
		app.deviceStatuses = data.deviceStatuses ?? { online: 0, offline: 0 };
		app.triggeredRules = data.triggeredRules ?? [];
		app.triggeredRulesCount = triggeredRulesCount;
		app.accessToken = data.authToken ?? undefined;
		app.deviceGroups = (data.deviceGroups ?? []).filter((g): g is string => !!g);
		app.locationGroups = (data.locationGroups ?? []).filter((g): g is string => !!g);
		app.locations = data.locations ?? [];
	}

	const app = $state(createAppContext());

	syncAppContextFromLayoutData();
	afterNavigate(() => {
		syncAppContextFromLayoutData();
	});

	setAppContext(app);

	function handleWindowResize() {
		document.querySelector('.cw-sidenav')?.classList.add('cw-sidenav--resizing');
		if (resizeTimer) {
			clearTimeout(resizeTimer);
		}
		resizeTimer = setTimeout(() => {
			document.querySelector('.cw-sidenav')?.classList.remove('cw-sidenav--resizing');
		}, 100);
	}

	onDestroy(() => {
		if (resizeTimer) {
			clearTimeout(resizeTimer);
		}
	});
</script>

<CwOfflineOverlay />
<CwToastContainer />
<svelte:window onresize={handleWindowResize} />

<div class="flex h-dvh w-full overflow-hidden">
	{#if !isAuthRoute}
		<Sidebar bind:mode />
		<div class="flex min-h-0 min-w-0 flex-1 flex-col">
			<Header bind:mode={mode} />
			<main class="flex min-h-0 flex-1 flex-col overflow-hidden p-1">
				{@render children()}
			</main>
			<OverviewDrawer />
		</div>
	{:else}
		<main class="flex-1 overflow-y-auto">
			{@render children()}
		</main>
	{/if}
</div>
