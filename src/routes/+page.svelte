<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { AppPage } from '$lib/components/layout';
	import { CwButton, CwSpinner } from '@cropwatchdevelopment/cwui';
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import DashboardDeviceTable from '$lib/components/dashboard/DashboardDeviceTable.svelte';
	import DashboardDeviceCards from '$lib/components/dashboard/DashboardDeviceCards.svelte';
	import type { CardLayout } from '$lib/components/dashboard/DashboardDeviceCards.svelte';
	import {
		countDashboardDevices,
		type DashboardDeviceFilters
	} from '$lib/components/dashboard/device-table';
	import { normalizeDashboardFilterValues } from '$lib/components/dashboard/dashboard-filter-values';
	import { getAppContext } from '$lib/appContext.svelte';
	import { m } from '$lib/paraglide/messages.js';
	import { page } from '$app/state';
	import TABLE_ICON from '$lib/images/icons/table.svg';
	import SENSOR_CARDS_ICON from '$lib/images/icons/sensor_cards.svg';
	import GRID_VIEW_ICON from '$lib/images/icons/grid_view.svg';
	import MASONRY_VIEW_ICON from '$lib/images/icons/masonary.svg';

	type DashboardView = 'table' | 'sensor-cards';

	const DASHBOARD_VIEW_STORAGE_KEY = 'cropwatch.dashboard.view';
	const DASHBOARD_CARD_LAYOUT_STORAGE_KEY = 'cropwatch.dashboard.cardLayout';
	const MOBILE_DASHBOARD_MEDIA_QUERY = '(max-width: 767px)';

	const app = getAppContext();

	function readTriggeredRulesCount(rawTriggeredRulesCount: unknown): number {
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

	function syncDashboardContext(data: Record<string, unknown>) {
		app.accessToken = ((page.data as Record<string, unknown>).authToken as string) ?? undefined;
		app.devices = (data.devices as typeof app.devices) ?? [];
		app.deviceTypeLookup =
			(data.deviceTypeLookup as typeof app.deviceTypeLookup) ?? { byModel: {}, idToModel: {} };
		app.totalDeviceCount = (data.totalDeviceCount as number) ?? app.devices.length;
		app.deviceStatuses = (data.deviceStatuses as typeof app.deviceStatuses) ?? {
			online: 0,
			offline: 0
		};
		app.triggeredRules = (data.triggeredRules as typeof app.triggeredRules) ?? [];
		app.triggeredRulesCount = readTriggeredRulesCount(data.triggeredRulesCount);
		app.deviceGroups = normalizeDashboardFilterValues(data.deviceGroups as string[]);
		app.locationGroups = normalizeDashboardFilterValues(data.locationGroups as string[]);
		app.locations = (data.locations as typeof app.locations) ?? [];
	}

	let dashboardLoading = $state(true);

	$effect(() => {
		const raw = (page.data as Record<string, unknown>).dashboard;
		if (!raw) {
			dashboardLoading = false;
			return;
		}

		if (raw instanceof Promise) {
			dashboardLoading = true;
			let cancelled = false;
			raw.then((resolved: Record<string, unknown>) => {
				if (!cancelled) {
					syncDashboardContext(resolved);
					dashboardLoading = false;
				}
			});
			return () => {
				cancelled = true;
			};
		} else {
			syncDashboardContext(raw as Record<string, unknown>);
			dashboardLoading = false;
		}
	});

	// ── Reactive filter state from URL search params ────────────
	let activeGroup = $derived(page.url.searchParams.get('group') ?? '');
	let activeLocationGroup = $derived(page.url.searchParams.get('locationGroup') ?? '');
	let activeLocation = $derived(page.url.searchParams.get('location') ?? '');
	let dashboardView = $state<DashboardView>('table');
	let cardLayout = $state<CardLayout>('grid');
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

	function setCardLayout(layout: CardLayout) {
		cardLayout = layout;

		if (browser) {
			window.localStorage.setItem(DASHBOARD_CARD_LAYOUT_STORAGE_KEY, layout);
		}
	}

	onMount(() => {
		const storedDashboardView = window.localStorage.getItem(DASHBOARD_VIEW_STORAGE_KEY);
		if (storedDashboardView === 'table' || storedDashboardView === 'sensor-cards') {
			dashboardView = storedDashboardView;
		} else if (window.matchMedia(MOBILE_DASHBOARD_MEDIA_QUERY).matches) {
			dashboardView = 'sensor-cards';
		}

		const storedCardLayout = window.localStorage.getItem(DASHBOARD_CARD_LAYOUT_STORAGE_KEY);
		if (storedCardLayout === 'grid' || storedCardLayout === 'masonry') {
			cardLayout = storedCardLayout;
		}

		dashboardViewReady = true;
	});
</script>

<svelte:head>
	<title>{m.dashboard_page_title()}</title>
</svelte:head>

<AppPage width="full" class="dashboard-page">
	<div class="--cw-bg-base flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
		<header class="flex-none">
			<div class="flex w-full flex-col gap-4 mb-4">
				<div
					id="Dashboard__Overview__actions"
					class="flex w-full flex-row gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end"
				>
					<CwButton
						class="w-full md:w-auto"
						variant={dashboardView === 'table' ? 'info' : 'secondary'}
						onclick={() => setDashboardView('table')}
					>
						<Icon src={TABLE_ICON} alt={m.dashboard_table_view()} />
						{m.dashboard_table_view()}
					</CwButton>
					<CwButton
						class="w-full md:w-auto"
						variant={dashboardView === 'sensor-cards' ? 'info' : 'secondary'}
						onclick={() => setDashboardView('sensor-cards')}
					>
						<Icon src={SENSOR_CARDS_ICON} alt={m.dashboard_sensor_cards_view()} />
						{m.dashboard_sensor_cards_view()}
					</CwButton>
					{#if dashboardView === 'sensor-cards'}
						<div
							class="hidden md:flex items-center justify-end gap-1 border-t border-slate-600/70 pt-2 sm:border-t-0 sm:border-l sm:pl-2 sm:pt-0"
						>
							<CwButton
								class="px-2 py-1 text-xs"
								variant={cardLayout === 'grid' ? 'info' : 'secondary'}
								onclick={() => setCardLayout('grid')}
							>
								<Icon src={GRID_VIEW_ICON} alt="Grid Layout" />
							</CwButton>
							<CwButton
								class="px-2 py-1 text-xs"
								variant={cardLayout === 'masonry' ? 'info' : 'secondary'}
								onclick={() => setCardLayout('masonry')}
							>
								<Icon src={MASONRY_VIEW_ICON} alt="Masonry Layout" />
							</CwButton>
						</div>
					{/if}
				</div>
			</div>
		</header>

		{#if dashboardLoading}
			<div class="flex min-h-0 flex-1 items-center justify-center px-6 pb-6">
				<div class="flex flex-col items-center gap-6">
					<div class="scale-[4]">
						<CwSpinner />
					</div>
					<span class="text-center text-3xl text-slate-400 sm:text-4xl">
						{m.dashboard_loading_devices()}
					</span>
				</div>
			</div>
		{:else if dashboardViewReady}
			{#if dashboardView === 'sensor-cards'}
				<DashboardDeviceCards filters={dashboardFilters} {cardLayout} />
			{:else}
				<DashboardDeviceTable filters={dashboardFilters} />
			{/if}
		{:else}
			<div class="flex min-h-0 flex-1 items-center justify-center px-6 pb-6">
				<p class="text-sm text-slate-400">{m.dashboard_loading_view()}</p>
			</div>
		{/if}
	</div>
</AppPage>
