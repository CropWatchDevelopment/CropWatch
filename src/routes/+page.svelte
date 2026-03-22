<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { CwBadge, CwButton } from '@cropwatchdevelopment/cwui';
	import { afterNavigate } from '$app/navigation';
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import DashboardDeviceTable from '$lib/components/dashboard/DashboardDeviceTable.svelte';
	import DashboardDeviceCards from '$lib/components/dashboard/DashboardDeviceCards.svelte';
	import {
		countDashboardDevices,
		getLocationGroupName,
		type DashboardDeviceFilters
	} from '$lib/components/dashboard/device-table';
	import { normalizeDashboardFilterValues } from '$lib/components/dashboard/dashboard-filter-values';
	import NOTIFICATIONS_ICON from '$lib/images/icons/notifications.svg';
	import REFRESH_ICON from '$lib/images/icons/refresh.svg';
	import { getAppContext } from '$lib/appContext.svelte';
	import { m } from '$lib/paraglide/messages.js';
	import { page } from '$app/state';
	import type { PageProps } from './$types';
	import TABLE_ICON from '$lib/images/icons/table.svg';
	import SENSOR_CARDS_ICON from '$lib/images/icons/sensor_cards.svg';

	type DashboardView = 'table' | 'sensor-cards';

	const DASHBOARD_VIEW_STORAGE_KEY = 'cropwatch.dashboard.view';
	const MOBILE_DASHBOARD_MEDIA_QUERY = '(max-width: 767px)';

	const app = getAppContext();

	function readTriggeredRulesCount(
		rawTriggeredRulesCount: PageProps['data']['triggeredRulesCount']
	): number {
		if (typeof rawTriggeredRulesCount === 'number' && Number.isFinite(rawTriggeredRulesCount)) {
			return rawTriggeredRulesCount;
		}

		if (rawTriggeredRulesCount && typeof rawTriggeredRulesCount === 'object') {
			const maybeCount =
				(rawTriggeredRulesCount as Record<string, unknown>).count ??
				(rawTriggeredRulesCount as Record<string, unknown>).triggered_count;
			if (typeof maybeCount === 'number' && Number.isFinite(maybeCount)) {
				return maybeCount;
			}
		}

		return 0;
	}

	function syncDashboardContext(pageData: PageProps['data']) {
		app.accessToken = pageData.authToken ?? undefined;
		app.devices = pageData.devices ?? [];
		app.totalDeviceCount = pageData.totalDeviceCount ?? app.devices.length;
		app.deviceStatuses = pageData.deviceStatuses ?? { online: 0, offline: 0 };
		app.triggeredRules = pageData.triggeredRules ?? [];
		app.triggeredRulesCount = readTriggeredRulesCount(pageData.triggeredRulesCount);
		app.deviceGroups = normalizeDashboardFilterValues(pageData.deviceGroups);
		app.locationGroups = normalizeDashboardFilterValues(pageData.locationGroups);
		app.locations = pageData.locations ?? [];
	}

	syncDashboardContext(page.data as PageProps['data']);
	afterNavigate(() => {
		if (page.url.pathname === '/') {
			syncDashboardContext(page.data as PageProps['data']);
		}
	});

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
	<title>{m.dashboard_page_title()}</title>
</svelte:head>

<div class="--cw-bg-base flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
	<header class="flex-none">
		<div class="my-0 my-1 flex flex-row justify-between px-6 text-xs md:my-2 md:my-4">
			<div class="hidden flex-col gap-2 text-slate-400 md:flex">
				<div class="flex flex-wrap items-center gap-3">
					<span class="flex items-center gap-1">
						<span class="font-mono text-slate-100">{devicesInView}</span>
						<span>{m.dashboard_devices_in_view()}</span>
					</span>
					<span class="flex items-center gap-1 text-amber-200">
						<span class="font-mono">{app.triggeredRules?.length ?? 0}</span>
						<span>{m.dashboard_with_active_alerts()}</span>
					</span>
				</div>
				<span class="flex items-center gap-1">
					<p class="text-emerald-300">
						{m.dashboard_total_online({ count: String(app.deviceStatuses?.online ?? 0) })}
					</p>
					|
					<p class="text-rose-300">
						{m.dashboard_total_offline({ count: String(app.deviceStatuses?.offline ?? 0) })}
					</p>
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
						<Icon src={TABLE_ICON} alt={m.dashboard_table_view()} />
						{m.dashboard_table_view()}
					</CwButton>
					<CwButton
						variant={dashboardView === 'sensor-cards' ? 'info' : 'secondary'}
						onclick={() => setDashboardView('sensor-cards')}
					>
						<Icon src={SENSOR_CARDS_ICON} alt={m.dashboard_sensor_cards_view()} />
						{m.dashboard_sensor_cards_view()}
					</CwButton>
				</div>
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
			<p class="text-sm text-slate-400">{m.dashboard_loading_view()}</p>
		</div>
	{/if}
</div>
