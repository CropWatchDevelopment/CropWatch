<script lang="ts">
	import { page } from '$app/state';
	import { getAppContext } from '$lib/appContext.svelte';
	import {
		CwDuration,
		CwExpandPanel,
		CwListBox,
		CwSearchInput,
		CwSideNav,
		type CwListBoxItem,
		type CwSideNavItem
	} from '@cropwatchdevelopment/cwui';
	import DASHBOARD_ICON from '$lib/images/icons/dashboard.svg';
	import LOCATIONS_ICON from '$lib/images/icons/globe_location_pin.svg';
	import RULES_ICON from '$lib/images/icons/rules.svg';
	import REPORTS_ICON from '$lib/images/icons/report.svg';
	import { goto } from '$app/navigation';

	let { mode = $bindable() } = $props();

	const app = getAppContext();

	// ── Read active filters from URL search params ──────────────
	let selectedGroup = $derived(page.url.searchParams.get('group') ?? '');
	let selectedLocation = $derived(page.url.searchParams.get('location') ?? '');
	let selectedLocationGroup = $derived(page.url.searchParams.get('locationGroup') ?? '');
	let dashboardFiltersOpen = $state(false);

	const navItems: CwSideNavItem[] = [
		{ id: 'dashboard', label: 'Dashboard', href: '/', icon: { DASHBOARD_ICON } },
		{
			id: 'locations',
			label: 'Locations',
			href: '/locations',
			icon: { LOCATIONS_ICON }
		},
		{
			id: 'rules',
			label: 'Rules',
			href: '/rules',
			icon: { RULES_ICON }
		},
		{
			id: 'reports',
			label: 'Reports',
			href: '/reports',
			icon: { REPORTS_ICON }
		}
	];

	// ── Groups list (dynamic from API) ──────────────────────────
	const groups: CwListBoxItem<string>[] = $derived.by(() => {
		const allItem: CwListBoxItem<string> = {
			value: '',
			label: 'All groups',
			badge: 'ALL',
			badgeTone: 'secondary',
			endText: String(app.devices?.length ?? 0)
		};
		const groupItems: CwListBoxItem<string>[] = (app.deviceGroups ?? [])
			.filter((g) => g)
			.map((group) => ({
				value: group.group,
				label: group.group,
				badge: group.group.toUpperCase().substring(0, 2),
				badgeTone: 'info' as const,
				endText: String(app.devices?.filter((d) => d.group === group.group).length ?? 0)
			}));
		return [allItem, ...groupItems];
	});

	// ── Location Groups list (dynamic from API) ──────────────────────────
	const locationGroups: CwListBoxItem<string>[] = $derived.by(() => {
		const allItem: CwListBoxItem<string> = {
			value: '',
			label: 'All location groups',
			badge: 'ALL',
			badgeTone: 'secondary',
			endText: String(app.locations?.length ?? 0)
		};
		const groupItems: CwListBoxItem<string>[] = (app.locationGroups ?? [])
			.filter((g) => g)
			.map((group) => ({
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
			label: 'All locations',
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
			placeholder="Search devices..."
			value={page.url.searchParams.get('search') ?? ''}
			oninput={(e) => {
				const value = (e.target as HTMLInputElement).value;
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
			<!-- <div style="overflow-y: scroll; -webkit-overflow-scrolling: touch;" class="flex max-h-[50vh] flex-col gap-2 px-2 py-1"> -->
			<CwExpandPanel title="Dashboard Filters" open={dashboardFiltersOpen}>
				<div class="px-4 py-2 text-sm text-slate-400">Filter devices in view</div>
				<CwListBox
					heading="Device Groups"
					items={groups}
					value={selectedGroup}
					onselect={(item) => applyFilter('group', item.value)}
				/>

				<CwListBox
					heading="Location Groups"
					items={locationGroups}
					value={selectedLocationGroup}
					onselect={(item) => applyFilter('locationGroup', item.value)}
				/>

				<CwListBox
					heading="Locations"
					items={locations}
					value={selectedLocation}
					onselect={(item) => applyFilter('location', item.value)}
				/>
			</CwExpandPanel>
			<!-- </div> -->
		{/if}
	{/snippet}
	{#snippet footer()}
		<div style="padding: 1rem; font-size: 0.875rem; color: #888">
			{#if app.session?.exp}
				<p class="text-xs">
					Current Session Expires: <CwDuration
						from={new Date(app.session.exp * 1000)}
						countDown={true}
						alarmAfterMinutes={0.5}
						alarmCallback={() => {
							goto(`/auth/logout?redirect=${encodeURIComponent(page.url.pathname)}`);
						}}
					/>
				</p>
			{/if}
		</div>
	{/snippet}
</CwSideNav>
