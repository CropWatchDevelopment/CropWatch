<script lang="ts">
	import { page } from '$app/state';
	import { getAppContext } from '$lib/appContext.svelte';
	import {
		CwDuration,
		CwListBox,
		CwSearchInput,
		CwSideNav,
		type CwListBoxItem,
		type CwSideNavItem
	} from '@cropwatchdevelopment/cwui';
	import DASHBOARD_ICON from '$lib/images/icons/dashboard.svg';
	import { goto } from '$app/navigation';

	let { mode = $bindable() } = $props();

	const app = getAppContext();

	// ── Read active filters from URL search params ──────────────
	let selectedGroup = $derived(page.url.searchParams.get('group') ?? '');
	let selectedLocation = $derived(page.url.searchParams.get('location') ?? '');

	const navItems: CwSideNavItem[] = [
		{ id: 'dashboard', label: 'Dashboard', href: '/', icon: { DASHBOARD_ICON } },
		{ id: 'devices', label: 'Devices', href: '/devices', icon: 'M3 4h10v8H3z' },
		{
			id: 'locations',
			label: 'Locations',
			href: '/locations',
			icon: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zM12 11.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z'
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
			.filter((g) => g && g.trim() !== '')
			.map((group) => ({
				value: group,
				label: group,
				badge: group.toUpperCase().substring(0, 2),
				badgeTone: 'info' as const,
				endText: String(app.devices?.filter((d) => d.group === group).length ?? 0)
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
			<div class="px-4 py-2 text-sm text-slate-400">Filter devices in view</div>
			<CwListBox
				heading="Groups"
				items={groups}
				value={selectedGroup}
				onselect={(item) => applyFilter('group', item.value)}
			/>

			<CwListBox
				heading="Locations"
				items={locations}
				value={selectedLocation}
				onselect={(item) => applyFilter('location', item.value)}
			/>
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
