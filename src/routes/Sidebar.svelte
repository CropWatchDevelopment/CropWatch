<script lang="ts">
	import { page } from '$app/state';
	import { getAppContext } from '$lib/appContext.svelte';
	import { m } from '$lib/paraglide/messages.js';
	import {
		CwDuration,
		CwExpandPanel,
		CwListBox,
		CwSideNav,
		type CwListBoxItem,
		type CwSideNavItem
	} from '@cropwatchdevelopment/cwui';
	import CROPWATCH_LOGO from '$lib/images/cropwatch_static.svg';
	import { goto } from '$app/navigation';
	import { normalizeDashboardFilterValues } from '$lib/components/dashboard/dashboard-filter-values';

	let { mode = $bindable() } = $props();

	const app = getAppContext();
	const DASHBOARD_ICON_PATH = 'M2 3h5v4H2V3zm7 0h5v4H9V3zM2 9h5v4H2V9zm7 0h5v4H9V9z';
	const LOCATIONS_ICON_PATH =
		'M8 2a6 6 0 100 12A6 6 0 008 2zm0 0c1.5 1.6 2.5 3.7 2.8 6-.3 2.3-1.3 4.4-2.8 6M8 2C6.5 3.6 5.5 5.7 5.2 8c.3 2.3 1.3 4.4 2.8 6M2 8h12M3.5 4.5h9M3.5 11.5h9';
	const RULES_ICON_PATH =
		'M3 4.5h6M3 8h6M3 11.5h6M10.5 4.5l1 1 2-2M10.5 8l1 1 2-2M10.5 11.5l1 1 2-2';
	const REPORTS_ICON_PATH =
		'M4 2.5h5l3 3V13a1 1 0 01-1 1H4a1 1 0 01-1-1v-9a1 1 0 011-1zM9 2.5V5a1 1 0 001 1h2M5.5 8.5h5M5.5 10.5h5';
	// Scaled and centered for 16x16 viewBox
	const GATEWAYS_ICON_PATH =
		'M2.67 13.2q-.55 0-.94-.39t-.39-.94V4.53q0-.55.39-.94t.94-.39h10.66v-1.6h1.33v1.6h1.34q.55 0 .94.39t.39.94v7.34q0 .55-.39.94t-.94.39H2.67Zm0-1.33h12.66V4.53H2.67v7.34Zm1.8-.37q.28 0 .47-.19t.19-.47q0-.28-.19-.47t-.47-.19q-.28 0-.47.19t-.19.47q0 .28.19.47t.47.19Zm2.33 0q.28 0 .47-.19t.19-.47q0-.28-.19-.47t-.47-.19q-.28 0-.47.19t-.19.47q0 .28.19.47t.47.19Zm2.33 0q.28 0 .47-.19t.19-.47q0-.28-.19-.47t-.47-.19q-.28 0-.47.19t-.19.47q0 .28.19.47t.47.19Zm.14-5.42-.77-.77q.35-.32.77-.5t.93-.18q.5 0 .93.18t.77.5l-.77.77q-.19-.19-.42-.3t-.51-.11q-.28 0-.51.11t-.42.3Zm-1.25-1.25-.74-.74q.58-.58 1.35-.91t1.65-.33q.88 0 1.65.33t1.35.91l-.74.74q-.44-.44-1.02-.68t-1.24-.24q-.82 0-1.24.24t-1.02.68Z';

	// ── Read active filters from URL search params ──────────────
	let selectedGroup = $derived(page.url.searchParams.get('group') ?? '');
	let selectedLocation = $derived(page.url.searchParams.get('location') ?? '');
	let selectedLocationGroup = $derived(page.url.searchParams.get('locationGroup') ?? '');
	let dashboardFiltersOpen = $state(false);

	const navItems = $derived<CwSideNavItem[]>([
		{
			id: 'dashboard',
			label: m.nav_dashboard(),
			href: '/',
			icon: { path: DASHBOARD_ICON_PATH }
		},
		{
			id: 'locations',
			label: m.nav_locations(),
			href: '/locations',
			icon: { path: LOCATIONS_ICON_PATH }
		},
		{
			id: 'rules',
			label: m.nav_rules(),
			href: '/rules',
			icon: { path: RULES_ICON_PATH },
			group: 'Info and Management'
		},
		{
			id: 'reports',
			label: m.nav_reports(),
			href: '/reports',
			icon: { path: REPORTS_ICON_PATH },
			group: 'Info and Management'
		},
		// {
		// 	id: 'gateways',
		// 	label: 'Gateways',
		// 	href: '/gateways',
		// 	icon: { path: GATEWAYS_ICON_PATH },
		// 	group: 'Connectivity & Hardware'
		// }
	]);

	// ── Groups list (dynamic from API) ──────────────────────────
	const groups: CwListBoxItem<string>[] = $derived.by(() => {
		const allItem: CwListBoxItem<string> = {
			value: '',
			label: m.sidebar_all_groups(),
			badge: m.common_all_short(),
			badgeTone: 'secondary',
			endText: String(app.devices?.length ?? 0)
		};
		const groupItems: CwListBoxItem<string>[] = normalizeDashboardFilterValues(
			app.deviceGroups
		).map((group) => ({
			value: group,
			label: group,
			badge: group.toUpperCase().substring(0, 2),
			badgeTone: 'info' as const
			// endText: String(group.length ?? 0)
		}));
		return [allItem, ...groupItems];
	});

	// ── Location Groups list (dynamic from API) ──────────────────────────
	const locationGroups: CwListBoxItem<string>[] = $derived.by(() => {
		const allItem: CwListBoxItem<string> = {
			value: '',
			label: m.sidebar_all_location_groups(),
			badge: m.common_all_short(),
			badgeTone: 'secondary',
			endText: String(app.locations?.length ?? 0)
		};
		const groupItems: CwListBoxItem<string>[] = normalizeDashboardFilterValues(
			app.locationGroups
		).map((group) => ({
			value: group,
			label: group,
			badge: group.toUpperCase().substring(0, 2),
			badgeTone: 'info' as const
			// endText: String(group.length ?? 0)
		}));
		return [allItem, ...groupItems];
	});

	// ── Locations list (dynamic from API) ───────────────────────
	const locations: CwListBoxItem<string>[] = $derived.by(() => {
		const allItem: CwListBoxItem<string> = {
			value: '',
			label: m.sidebar_all_locations(),
			endText: String(app.devices?.length ?? 0)
		};
		const locationItems: CwListBoxItem<string>[] = (app.locations ?? []).map((loc) => ({
			value: String(loc.location_id),
			label: loc.name,
			endText: String(app.devices?.filter((d) => d.location_id === loc.location_id).length ?? 0)
		}));
		return [allItem, ...locationItems];
	});

	// ── Navigate with updated search params on filter change ────
	function applyFilter(key: string, value: string) {
		const params = new URLSearchParams(page.url.searchParams);
		if (value) {
			params.set(key, value);
		} else {
			params.delete(key);
		}
		const qs = params.toString();
		goto(qs ? `/?${qs}` : '/', { replaceState: true, keepFocus: true, noScroll: true });
	}
</script>

<CwSideNav bind:mode items={navItems} responsive>
	{#snippet header()}
		<div class="flex h-full w-full flex-row items-center gap-2">
			<img src={CROPWATCH_LOGO} alt={m.app_name()} style="width:2rem;height:2rem" />
			<span class="text-lg text-[var(--cw-accent)] font-semibold">CropWatch</span>
		</div>
	{/snippet}

	{#snippet aboveContent()}
		{#if page.url.pathname === '/'}
			<CwExpandPanel title={m.sidebar_dashboard_filters()} open={dashboardFiltersOpen}>
				<div class="px-4 py-2 text-sm text-slate-400">{m.sidebar_filter_devices_in_view()}</div>
				<div
					class="dashboard-filters-scroll flex max-h-[50dvh] flex-col gap-2 overflow-y-auto overscroll-contain pr-1"
				>
					<CwListBox
						heading={`📱 ${m.sidebar_device_groups()}`}
						items={groups}
						value={selectedGroup}
						onselect={(item) => applyFilter('group', item.value)}
					/>

					<CwListBox
						heading={`📍 ${m.sidebar_location_groups()}`}
						items={locationGroups}
						value={selectedLocationGroup}
						onselect={(item) => applyFilter('locationGroup', item.value)}
					/>

					<CwListBox
						heading={`📍 ${m.sidebar_locations()}`}
						items={locations}
						value={selectedLocation}
						onselect={(item) => applyFilter('location', item.value)}
					/>
				</div>
			</CwExpandPanel>
		{/if}
	{/snippet}
	{#snippet footer()}
		<span class="flex flex-col gap-4">
			<div style="padding: 1rem; font-size: 0.875rem; color: #888">
				{#if app.session?.exp}
					<p class="text-xs">
						{m.sidebar_current_session_expires()}: <CwDuration
							from={new Date(app.session.exp * 1000)}
							countDown={true}
							alarmAfterMinutes={0.5}
							alarmCallback={() => {
								// goto(`/auth/logout?redirect=${encodeURIComponent(page.url.pathname)}`);
								document.location = `/auth/logout?redirect=${encodeURIComponent(page.url.pathname)}`;
							}}
						/>
					</p>
				{/if}
			</div>
		</span>
	{/snippet}
</CwSideNav>

<style>
	:global(.cw-sidenav__above-content) {
		min-height: 0;
	}

	.dashboard-filters-scroll {
		-webkit-overflow-scrolling: touch;
	}
</style>
