<script lang="ts">
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { AppPage } from '$lib/components/layout';
	import { CwButton, CwSearchInput } from '@cropwatchdevelopment/cwui';
	import DashboardCards, { type CardLayout } from '$lib/components/dashboard/DashboardCards.svelte';
	import DashboardTable from '$lib/components/dashboard/DashboardTable.svelte';
	import { getAppContext } from '$lib/appContext.svelte';
	import { ApiService } from '$lib/api/api.service';
	import { m } from '$lib/paraglide/messages.js';
	import TABLE_ICON from '$lib/images/icons/table.svg';
	import SENSOR_CARDS_ICON from '$lib/images/icons/sensor_cards.svg';
	import GRID_VIEW_ICON from '$lib/images/icons/grid_view.svg';
	import MASONRY_VIEW_ICON from '$lib/images/icons/masonary.svg';

	type DashboardView = 'table' | 'cards';

	const VIEW_STORAGE_KEY = 'cropwatch.dashboard.view';
	const CARD_LAYOUT_STORAGE_KEY = 'cropwatch.dashboard.cardLayout';
	const MOBILE_QUERY = '(max-width: 767px)';
	const SEARCH_DEBOUNCE_MS = 300;

	const app = getAppContext();

	let view = $state<DashboardView>('table');
	let cardLayout = $state<CardLayout>('grid');
	let viewReady = $state(!browser);

	// Free-text search box. `searchName` updates on every keystroke; `debouncedName`
	// trails it so the views re-fetch once the user pauses, not on every key.
	let searchName = $state(page.url.searchParams.get('name') ?? '');
	let debouncedName = $state(page.url.searchParams.get('name') ?? '');
	$effect(() => {
		const next = searchName;
		const timer = setTimeout(() => {
			debouncedName = next;
		}, SEARCH_DEBOUNCE_MS);
		return () => clearTimeout(timer);
	});

	const filters = $derived({
		group: page.url.searchParams.get('group') ?? '',
		locationGroup: page.url.searchParams.get('locationGroup') ?? '',
		location: page.url.searchParams.get('location') ?? '',
		name: debouncedName.trim()
	});

	function setView(next: DashboardView) {
		view = next;
		if (browser) window.localStorage.setItem(VIEW_STORAGE_KEY, next);
	}

	function setCardLayout(next: CardLayout) {
		cardLayout = next;
		if (browser) window.localStorage.setItem(CARD_LAYOUT_STORAGE_KEY, next);
	}

	onMount(() => {
		const stored = window.localStorage.getItem(VIEW_STORAGE_KEY);
		if (stored === 'table' || stored === 'cards') {
			view = stored;
		} else if (window.matchMedia(MOBILE_QUERY).matches) {
			view = 'cards';
		}

		const storedLayout = window.localStorage.getItem(CARD_LAYOUT_STORAGE_KEY);
		if (storedLayout === 'grid' || storedLayout === 'masonry') {
			cardLayout = storedLayout;
		}

		viewReady = true;
	});

	// Populate the sidebar's location-group filter list. Cheap aggregate endpoint.
	// Runs as an effect (not onMount) because on a fresh login the auth token can
	// still be undefined at mount — the effect re-runs once app.accessToken
	// arrives. The guard keeps it to a single fetch.
	let sidebarDataLoaded = false;
	$effect(() => {
		const token = app.accessToken;
		if (!token || sidebarDataLoaded) return;
		sidebarDataLoaded = true;
		const api = new ApiService({ authToken: token });
		api
			.getLocationGroups()
			.then((groups) => {
				app.locationGroups = groups;
			})
			.catch(() => {
				/* sidebar tolerates an empty list */
			});
		api
			.getLocations()
			.then((locations) => {
				app.locations = locations;
			})
			.catch(() => {
				/* sidebar tolerates an empty list */
			});
	});
</script>

<svelte:head>
	<title>{m.dashboard_page_title()}</title>
</svelte:head>

<AppPage width="full" class="dashboard-page">
	<div class="--cw-bg-base flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
		<header class="flex-none">
			<div class="flex w-full flex-row gap-4">
				<div
					class="hidden w-full flex-row gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-start md:flex"
				>
					<CwSearchInput
						bind:value={searchName}
						placeholder={m.dashboard_search_placeholder()}
						class="w-full min-w-0"
					/>
				</div>
				<span class="flex-1"></span>
				<div
					id="view-layout-selection-section"
					class="flex w-full flex-row gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end"
				>
					<CwButton
						class="w-full md:w-auto"
						size="sm"
						variant={view === 'table' ? 'info' : 'secondary'}
						onclick={() => setView('table')}
					>
						<Icon src={TABLE_ICON} alt={m.dashboard_table_view()} />
						{m.dashboard_table_view()}
					</CwButton>
					<CwButton
						class="w-full md:w-auto"
						size="sm"
						variant={view === 'cards' ? 'info' : 'secondary'}
						onclick={() => setView('cards')}
					>
						<Icon src={SENSOR_CARDS_ICON} alt={m.dashboard_sensor_cards_view()} />
						{m.dashboard_sensor_cards_view()}
					</CwButton>
					{#if view === 'cards'}
						<div
							class="hidden items-center justify-end gap-1 border-t border-slate-600/70 pt-2 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-2 md:flex"
						>
							<CwButton
								class="px-2 text-xs"
								size="sm"
								variant={cardLayout === 'grid' ? 'info' : 'secondary'}
								onclick={() => setCardLayout('grid')}
							>
								<Icon src={GRID_VIEW_ICON} alt={m.dashboard_grid_layout()} />
							</CwButton>
							<CwButton
								class="px-2 text-xs"
								size="sm"
								variant={cardLayout === 'masonry' ? 'info' : 'secondary'}
								onclick={() => setCardLayout('masonry')}
							>
								<Icon src={MASONRY_VIEW_ICON} alt={m.dashboard_masonry_layout()} />
							</CwButton>
						</div>
					{/if}
				</div>
			</div>
		</header>

		{#if viewReady}
			{#if view === 'cards'}
				<DashboardCards {filters} {cardLayout} />
			{:else}
				<DashboardTable {filters} />
			{/if}
		{:else}
			<div class="flex min-h-0 flex-1 items-center justify-center px-6 pb-6">
				<p class="text-sm text-slate-400">{m.dashboard_loading_view()}</p>
			</div>
		{/if}
	</div>
</AppPage>

<style>
	/*
	 * Dashboard uses viewport-fill layout (internal scroll in table/cards).
	 * AppPage uses flex: 1 0 auto globally for list pages; dashboard overrides
	 * back to 1 1 auto so child scroll containers receive a definite height.
	 */
	:global(.app-page.dashboard-page),
	:global(.app-page.dashboard-page .app-page__shell) {
		flex: 1 1 auto;
		min-height: 0;
	}
</style>
