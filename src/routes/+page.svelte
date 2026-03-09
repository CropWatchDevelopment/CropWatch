<script lang="ts">
	import { CwBadge, CwButton } from '@cropwatchdevelopment/cwui';
	import DashboardDeviceTable from '$lib/components/dashboard/DashboardDeviceTable.svelte';
	import {
		countDashboardDevices,
		getLocationGroupName,
		type DashboardDeviceFilters
	} from '$lib/components/dashboard/device-table';
	import NOTIFICATIONS_ICON from '$lib/images/icons/notifications.svg';
	import REFRESH_ICON from '$lib/images/icons/refresh.svg';
	import { getAppContext } from '$lib/appContext.svelte';
	import { page } from '$app/state';

	const app = getAppContext();

	// ── Reactive filter state from URL search params ────────────
	let activeGroup = $derived(page.url.searchParams.get('group') ?? '');
	let activeLocationGroup = $derived(page.url.searchParams.get('locationGroup') ?? '');
	let activeLocation = $derived(page.url.searchParams.get('location') ?? '');
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
</script>

<svelte:head>
	<title>CropWatch Dashboard</title>
</svelte:head>

<div class="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
	<header style="margin-bottom: 23px;" class="flex-none">
		<div class="flex min-h-12 items-center justify-between px-6 py-3 md:py-4">
			<div class="hidden flex-col gap-1 md:flex">
				<div class="flex items-center gap-2 text-xs text-slate-400" style="margin-left: 1rem;">
					<span>Group</span>
					<span class="text-slate-600">/</span>
					<span class="truncate">{activeGroup || 'All groups'}</span>
					{#if activeLocationGroupName}
						<span class="text-slate-600">/</span>
						<span>Location Group</span>
						<span class="text-slate-600">/</span>
						<span class="truncate">{activeLocationGroupName}</span>
					{/if}
					{#if activeLocationName}
						<span class="text-slate-600">/</span>
						<span>Location</span>
						<span class="text-slate-600">/</span>
						<span class="truncate">{activeLocationName}</span>
					{/if}
				</div>
			</div>
		</div>

		<div
			class="mb-3 flex min-h-[4rem] flex-row items-end justify-between gap-3 border-t border-slate-800 px-6 py-3 text-xs md:py-4"
			style="margin-left: 1rem;"
		>
			<div class="hidden flex-col gap-2 text-slate-400 md:flex">
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

	<DashboardDeviceTable filters={dashboardFilters} />
</div>
