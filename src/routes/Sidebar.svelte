<script lang="ts">
	import { CwSearchInput, CwSideNav, type CwSideNavItem } from '@cropwatchdevelopment/cwui';

	let { mode = $bindable() } = $props();

	const navItems: CwSideNavItem[] = [
		{ id: 'home', label: 'Dashboard', href: '/', icon: 'M8 1.5L1 7h2v6h4V9h2v4h4V7h2L8 1.5z' },
		{ id: 'devices', label: 'Devices', href: '/devices', icon: 'M3 3h10v8H3V3zm2 10h6' }
	];
</script>

<CwSideNav items={navItems} bind:mode responsive>
	{#snippet header()}
		<div class="flex flex-row items-center gap-2 pt-2">
			<CwSearchInput
				placeholder="Search components..."
				onselect={() => {}}
				fetchSuggestions={(query: string) => Promise.resolve([])}
			/>
		</div>
	{/snippet}
</CwSideNav>
