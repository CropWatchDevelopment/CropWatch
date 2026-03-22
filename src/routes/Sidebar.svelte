<script lang="ts">
	import { page } from '$app/state';
	import { getAppContext } from '$lib/appContext.svelte';
	import { m } from '$lib/paraglide/messages.js';
	import {
		CwDuration,
		CwExpandPanel,
		CwListBox,
		CwSearchInput,
		CwSideNav,
		CwThemePicker,
		type CwListBoxItem,
		type CwSideNavItem
	} from '@cropwatchdevelopment/cwui';
	import DASHBOARD_ICON from '$lib/images/icons/dashboard.svg';
	import LOCATIONS_ICON from '$lib/images/icons/globe_location_pin.svg';
	import RULES_ICON from '$lib/images/icons/rules.svg';
	import REPORTS_ICON from '$lib/images/icons/report.svg';
	import { goto } from '$app/navigation';
	import { normalizeDashboardFilterValues } from '$lib/components/dashboard/dashboard-filter-values';

	let { mode = $bindable() } = $props();

	const app = getAppContext();

	// ── Read active filters from URL search params ──────────────
	let selectedGroup = $derived(page.url.searchParams.get('group') ?? '');
	let selectedLocation = $derived(page.url.searchParams.get('location') ?? '');
	let selectedLocationGroup = $derived(page.url.searchParams.get('locationGroup') ?? '');
	let dashboardFiltersOpen = $state(false);

	const navItems = $derived<CwSideNavItem[]>([
		{ id: 'dashboard', label: m.nav_dashboard(), href: '/', icon: { DASHBOARD_ICON } },
		{
			id: 'locations',
			label: m.nav_locations(),
			href: '/locations',
			icon: { LOCATIONS_ICON }
		},
		{
			id: 'rules',
			label: m.nav_rules(),
			href: '/rules',
			icon: { RULES_ICON }
		},
		{
			id: 'reports',
			label: m.nav_reports(),
			href: '/reports',
			icon: { REPORTS_ICON }
		}
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
			badgeTone: 'info' as const,
			endText: String(app.devices?.filter((d) => d.group === group).length ?? 0)
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
			badgeTone: 'info' as const,
			endText: String(app.locations?.filter((d) => d.location_group === group).length ?? 0)
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
		<CwSearchInput
			placeholder={m.sidebar_search_devices_placeholder()}
			value={page.url.searchParams.get('search') ?? ''}
			oninput={(value) => {
				const params = new URLSearchParams(page.url.searchParams);
				if (value) {
					params.set('search', value);
				} else {
					params.delete('search');
				}
				const qs = params.toString();
				goto(qs ? `/?${qs}` : '/', { replaceState: true, keepFocus: true, noScroll: true });
			}}
			class="mx-4 my-2"
		/>
	{/snippet}

	{#snippet aboveContent()}
		{#if page.url.pathname === '/'}
			<CwExpandPanel title={m.sidebar_dashboard_filters()} open={dashboardFiltersOpen}>
				<div class="px-4 py-2 text-sm text-slate-400">{m.sidebar_filter_devices_in_view()}</div>
				<div
					class="dashboard-filters-scroll flex max-h-[50dvh] flex-col gap-2 overflow-y-auto overscroll-contain pr-1"
				>
					<CwListBox
						heading={m.sidebar_device_groups()}
						items={groups}
						value={selectedGroup}
						onselect={(item) => applyFilter('group', item.value)}
					/>

					<CwListBox
						heading={m.sidebar_location_groups()}
						items={locationGroups}
						value={selectedLocationGroup}
						onselect={(item) => applyFilter('locationGroup', item.value)}
					/>

					<CwListBox
						heading={m.sidebar_locations()}
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
