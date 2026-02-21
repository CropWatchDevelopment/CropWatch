<!-- <script lang="ts">
	import {
		CwButton,
		CwSearchInput,
		CwSideNav,
		type CwSideNavItem
	} from '@cropwatchdevelopment/cwui';
	import CropWatchLOGO from '$lib/images/cropwatch_static.svg';

	let { mode = $bindable() } = $props();

	const icons = {
		home: 'M2 8.5l6-5.5 6 5.5M4 7.5V13a1 1 0 001 1h2v-3h2v3h2a1 1 0 001-1V7.5',
		chart: 'M3 13V7m3.5 6V5M10 13V3m3.5 10V8',
		settings:
			'M8 10a2 2 0 100-4 2 2 0 000 4zM12.5 8a4.5 4.5 0 01-.3 1.6l1.3 1.3-1.1 1.1-1.3-1.3A4.5 4.5 0 018 12.5a4.5 4.5 0 01-3.1-1.8L3.5 12l-1-1.1 1.3-1.3A4.5 4.5 0 013.5 8c0-.6.1-1.1.3-1.6L2.5 5.1l1.1-1.1 1.3 1.3A4.5 4.5 0 018 3.5c1.2 0 2.3.5 3.1 1.3l1.3-1.3 1.1 1.1-1.3 1.3c.2.5.3 1 .3 1.6z',
		users:
			'M5.5 7.5a2 2 0 100-4 2 2 0 000 4zm5 0a2 2 0 100-4 2 2 0 000 4zM2 13c0-2 1.5-3.5 3.5-3.5S9 11 9 13m-2-3.5c.5-.3 1.2-.5 2-.5 2 0 3.5 1.5 3.5 3.5',
		bell: 'M4 10V7a4 4 0 118 0v3l1.5 2H2.5L4 10zm3 4h2',
		folder:
			'M2 4.5A1.5 1.5 0 013.5 3H6l1.5 1.5h5A1.5 1.5 0 0114 6v6a1.5 1.5 0 01-1.5 1.5h-9A1.5 1.5 0 012 12V4.5z'
	};

	const demoItems: CwSideNavItem[] = [
		{
			id: 'home',
			title: 'Dashboard',
			label: 'Dashboard',
			icon: icons.home,
			href: '/',
			active: true,
			group: 'Main'
		},
		{
			id: 'analytics',
			label: 'Analytics',
			icon: icons.chart,
			href: '#analytics',
			group: 'Main',
			trailing: 4
		},
		{
			id: 'users',
			label: 'Users',
			icon: icons.users,
			goto: () => console.log('goto -> users'),
			group: 'Main',
			trailing: 18
		},
		{
			id: 'notifications',
			label: 'Notifications',
			icon: icons.bell,
			href: '#notifications',
			separator: true,
			group: 'Main',
			trailing: 12
		},
		{ id: 'files', label: 'Files', icon: icons.folder, href: '#files', group: 'Library' },
		{
			id: 'settings',
			label: 'Settings',
			icon: icons.settings,
			href: '#settings',
			separator: true,
			group: 'Library'
		},
		{
			id: 'disabled',
			label: 'Archived',
			icon: icons.folder,
			disabled: true,
			group: 'Library',
			trailing: 2
		}
	];

	let activeId = $state('home');

	function handleSelect(item: CwSideNavItem) {
		activeId = item.id;
	}
</script> -->

<!-- <CwSideNav items={demoItems} bind:mode side="left" onselect={handleSelect}>
	{#snippet headerMini()}
		<svg
			viewBox="0 0 24 24"
			fill="none"
			style="width:1.25rem;height:1.25rem;color:var(--cw-accent)"
		>
			<path
				d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
				stroke="currentColor"
				stroke-width="1.5"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
		</svg>
	{/snippet}
	{#snippet footer()}
		<span class="demo-version">v0.1.0</span>
	{/snippet}
	{#snippet footerMini()}
		<span class="demo-version" title="v0.1.0">v</span>
	{/snippet}
	{#snippet itemTrailing(item)}
		{#if item.id === 'settings'}
			<CwButton
				size="sm"
				variant="ghost"
				class="demo-trail-btn"
				onclick={(event) => {
					event.preventDefault();
					event.stopPropagation();
				}}
			>
				Open
			</CwButton>
		{:else if item.id === 'notifications'}
			<svg class="demo-trail-icon" viewBox="0 0 16 16" fill="none" aria-hidden="true">
				<path
					d="M8 2v6M5.5 5.5L8 8l2.5-2.5"
					stroke="currentColor"
					stroke-width="1.5"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
			</svg>
		{/if}
	{/snippet}
</CwSideNav> -->



<script lang="ts">
	import { CwListBox, CwSideNav, type CwListBoxItem, type CwSideNavItem } from "@cropwatchdevelopment/cwui";


	type Site = 'all' | 'north' | 'south';
	let selectedSite = $state<Site>('all');

	const navItems: CwSideNavItem[] = [
		{ id: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: 'M2 8.5l6-5.5 6 5.5' },
		{ id: 'devices', label: 'Devices', href: '/devices', icon: 'M3 4h10v8H3z' }
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
</CwSideNav>
