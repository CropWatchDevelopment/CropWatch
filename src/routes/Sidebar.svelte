<script lang="ts">
	import { getAppContext } from '$lib/appContext.svelte';
	import {
		CwDuration,
		CwListBox,
		CwSideNav,
		type CwListBoxItem,
		type CwSideNavItem
	} from '@cropwatchdevelopment/cwui';

	let { mode = $bindable() } = $props();

	const app = getAppContext();

	type Site = 'all' | 'north' | 'south';
	let selectedSite = $state<Site>('all');
	let selectedGroup = $state<string>('all');
	let selectedLocation = $state<string>('all-loc');

	const navItems: CwSideNavItem[] = [
		{ id: 'dashboard', label: 'Dashboard', href: '/', icon: 'M2 8.5l6-5.5 6 5.5' },
		{ id: 'devices', label: 'Devices', href: '/devices', icon: 'M3 4h10v8H3z' },
		{
			id: 'locations',
			label: 'Locations',
			href: '/locations',
			icon: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zM12 11.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z'
		}
	];

	const siteItems: CwListBoxItem<Site>[] = [
		{ value: 'all', label: 'All Sites', endText: '42' },
		{ value: 'north', label: 'North Farm', endText: '18' },
		{ value: 'south', label: 'South Farm', endText: '24' }
	];

	const groups: CwListBoxItem<string>[] = [
		{ value: 'all', label: 'All groups', badge: 'ALL', badgeTone: 'secondary', endText: '196' },
		{ value: 'ungrouped', label: 'Ungrouped', badge: 'UNG', badgeTone: 'secondary', endText: '91' },
		{ value: 'seagaia', label: 'Seagaia', badge: 'SEA', badgeTone: 'success', endText: '41' },
		{ value: 'sa', label: 'SA', badge: 'SA', badgeTone: 'info', endText: '11' },
		{ value: 'kokokara', label: 'Kokokara', badge: 'KOK', badgeTone: 'warning', endText: '2' },
		{ value: 'toyota', label: 'Toyota', badge: 'TOY', badgeTone: 'danger', endText: '2' },
		{ value: 'tk-ebisu', label: 'TK-Ebisu', badge: 'TK-', badgeTone: 'primary', endText: '49' }
	];

	const locations: CwListBoxItem<string>[] = [
		{ value: 'all-loc', label: 'All locations', endText: '196' },
		{ value: 'miyazaki', label: 'Miyazaki House', endText: '7' },
		{ value: 'npo', label: 'NPO法人 東米良創生会', endText: '1' },
		{ value: 'pine1', label: 'パインテラス 1 階', endText: '26' },
		{ value: 'pine-b1', label: 'パインテラス地下 1 階', endText: '6' },
		{ value: 'sa-farm', label: 'SA西都農場', endText: '3' },
		{ value: 'kawagoe', label: '川越農産', endText: '3' },
		{ value: 'takama', label: '高間ハウス', endText: '3' },
		{ value: 'toyotama', label: 'とよたま 2 階', endText: '9' }
	];
</script>

<CwSideNav bind:mode items={navItems} responsive>
	{#snippet aboveContent()}
		<CwListBox
			heading="Site Filter"
			items={siteItems}
			bind:value={selectedSite}
			onselect={(item) => console.log('selected site:', item.value)}
		/>

		<CwListBox
			heading="Groups"
			items={groups}
			bind:value={selectedGroup}
			onselect={(item) => console.log('Group:', item.value)}
		/>

		<CwListBox
			heading="Locations"
			items={locations}
			bind:value={selectedLocation}
			onselect={(item) => console.log('Location:', item.value)}
		/>
	{/snippet}
	{#snippet footer()}
		<div style="padding: 1rem; font-size: 0.875rem; color: #888">
			{#if app.session?.exp}
				<p class="text-xs">
					Current Session Expires: <CwDuration
						from={new Date(app.session.exp * 1000)}
						countDown={true}
					/>
				</p>
			{/if}
		</div>
	{/snippet}
</CwSideNav>
