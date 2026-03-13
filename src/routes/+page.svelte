<script lang="ts">
	import { CwBadge, CwButton } from '@cropwatchdevelopment/cwui';
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import DashboardDeviceTable from '$lib/components/dashboard/DashboardDeviceTable.svelte';
	import DashboardDeviceCards from '$lib/components/dashboard/DashboardDeviceCards.svelte';
	import {
		countDashboardDevices,
		getLocationGroupName,
		type DashboardDeviceFilters
	} from '$lib/components/dashboard/device-table';
	import NOTIFICATIONS_ICON from '$lib/images/icons/notifications.svg';
	import REFRESH_ICON from '$lib/images/icons/refresh.svg';
	import { getAppContext } from '$lib/appContext.svelte';
	import { page } from '$app/state';

	type DashboardView = 'table' | 'sensor-cards';

	const DASHBOARD_VIEW_STORAGE_KEY = 'cropwatch.dashboard.view';
	const MOBILE_DASHBOARD_MEDIA_QUERY = '(max-width: 767px)';

	const app = getAppContext();

	// ── Reactive filter state from URL search params ────────────
	let activeGroup = $derived(page.url.searchParams.get('group') ?? '');
	let activeLocationGroup = $derived(page.url.searchParams.get('locationGroup') ?? '');
	let activeLocation = $derived(page.url.searchParams.get('location') ?? '');
	let dashboardView = $state<DashboardView>('table');
	let dashboardViewReady = $state(!browser);
	let dashboardFilters = $derived.by(
		(): DashboardDeviceFilters => ({
			group: activeGroup,
			locationGroup: activeLocationGroup,
			location: activeLocation
		})
	);

	let activeLocationGroupName = $derived.by(() => {
		if (!activeLocationGroup) return '';
		const location = (app.locations ?? []).find(
			(loc) => getLocationGroupName(loc) === activeLocationGroup
		);
		return getLocationGroupName(location) || activeLocationGroup;
	});

	let activeLocationName = $derived.by(() => {
		if (!activeLocation) return '';
		const location = (app.locations ?? []).find(
			(loc) => String(loc.location_id) === activeLocation
		);
		return location?.name ?? activeLocation;
	});

	let devicesInView = $derived(
		countDashboardDevices(app.devices ?? [], app.locations ?? [], dashboardFilters)
	);

	function refreshDashboard() {
		window.location.reload();
	}

	function setDashboardView(view: DashboardView) {
		dashboardView = view;

		if (browser) {
			window.localStorage.setItem(DASHBOARD_VIEW_STORAGE_KEY, view);
		}
	}

	onMount(() => {
		const storedDashboardView = window.localStorage.getItem(DASHBOARD_VIEW_STORAGE_KEY);
		if (storedDashboardView === 'table' || storedDashboardView === 'sensor-cards') {
			dashboardView = storedDashboardView;
		} else if (window.matchMedia(MOBILE_DASHBOARD_MEDIA_QUERY).matches) {
			dashboardView = 'sensor-cards';
		}

		dashboardViewReady = true;
	});
</script>

<svelte:head>
	<title>CropWatch Dashboard</title>
</svelte:head>

<div class="--cw-bg-base flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
	<header class="flex-none">
		<div class="my-3 flex min-h-[4rem] flex-row justify-between px-6 text-xs">
			<div class="hidden flex-col gap-2 pt-4 text-slate-400 md:flex">
				<div class="flex flex-wrap items-center gap-3">
					<span class="flex items-center gap-1">
						<span class="font-mono text-slate-100">{devicesInView}</span>
						<span>devices in view</span>
					</span>
					<span class="flex items-center gap-1 text-amber-200">
						<span class="font-mono">{app.triggeredRules?.length ?? 0}</span>
						<span>with active alerts</span>
					</span>
				</div>
				<span class="flex items-center gap-1">
					<p class="text-emerald-300">Total Online: {app.deviceStatuses?.online ?? 0}</p>
					|
					<p class="text-rose-300">Total Offline: {app.deviceStatuses?.offline ?? 0}</p>
				</span>
			</div>

			<div
				id="Dashboard__Overview__actions"
				class="flex w-full items-center justify-end gap-3 md:w-auto"
			>
				<span class="hidden flex-1 md:flex"></span>

				<div class="flex items-center gap-2">
					<CwButton
						variant={dashboardView === 'table' ? 'info' : 'secondary'}
						onclick={() => setDashboardView('table')}
					>
						Table
					</CwButton>
					<CwButton
						variant={dashboardView === 'sensor-cards' ? 'info' : 'secondary'}
						onclick={() => setDashboardView('sensor-cards')}
					>
						Sensor Cards
					</CwButton>
				</div>

				<CwButton variant="secondary" onclick={refreshDashboard}>
					<img src={REFRESH_ICON} alt="Refresh Icon" class="h-4 w-4" />
					Refresh
				</CwButton>

				<CwBadge value={app.triggeredRulesCount} position="bottom_left" size="md" tone="danger">
					<CwButton
						variant="secondary"
						onclick={() => {
							app.drawerOpen = !app.drawerOpen;
						}}
					>
						<img src={NOTIFICATIONS_ICON} alt="Notifications Icon" class="h-5 w-5" />
					</CwButton>
				</CwBadge>
			</div>
		</div>
	</header>

	{#if dashboardViewReady}
		{#if dashboardView === 'sensor-cards'}
			<DashboardDeviceCards filters={dashboardFilters} />
		{:else}
			<DashboardDeviceTable filters={dashboardFilters} />
		{/if}
	{:else}
		<div class="flex min-h-0 flex-1 items-center justify-center px-6 pb-6">
			<p class="text-sm text-slate-400">Loading dashboard view...</p>
		</div>
	{/if}
</div>
