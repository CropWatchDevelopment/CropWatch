<script lang="ts">
	import { getAppContext } from '$lib/appContext.svelte';
	import {
		CwDuration,
		CwListBox,
		CwSideNav,
		type CwListBoxItem,
		type CwSideNavItem
	} from '@cropwatchdevelopment/cwui';

	const app = getAppContext();

	type Site = 'all' | 'north' | 'south';
	let selectedSite = $state<Site>('all');

	const navItems: CwSideNavItem[] = [
		{ id: 'dashboard', label: 'Dashboard', href: '/', icon: 'M2 8.5l6-5.5 6 5.5' },
		{ id: 'devices', label: 'Devices', href: '/devices', icon: 'M3 4h10v8H3z' },
		{ id: 'locations', label: 'Locations', href: '/locations', icon: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zM12 11.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z' },
		
	];

	const siteItems: CwListBoxItem<Site>[] = [
		{ value: 'all', label: 'All Sites', endText: '42' },
		{ value: 'north', label: 'North Farm', endText: '18' },
		{ value: 'south', label: 'South Farm', endText: '24' }
	];
</script>

<CwSideNav items={navItems}>
	{#snippet aboveContent()}
		<CwListBox
			heading="Site Filter"
			items={siteItems}
			bind:value={selectedSite}
			onselect={(item) => console.log('selected site:', item.value)}
		/>
	{/snippet}
	{#snippet footer()}
		<div style="padding: 1rem; font-size: 0.875rem; color: #888">
			{#if app.session?.exp}
				<p class="text-xs">Current Session Expires: <CwDuration from={new Date(app.session.exp * 1000)} countDown={true} /></p>
			{/if}
		</div>
	{/snippet}
</CwSideNav>
