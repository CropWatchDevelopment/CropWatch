<script lang="ts">
	import { goto } from '$app/navigation';
	import { CwHeader, CwProfileMenu, type CwSideNavMode } from '@cropwatchdevelopment/cwui';

	let { mode } = $props();

	const menuItems = [
		{ id: 'profile', label: 'Profile' },
		{ id: 'settings', label: 'Settings' },
		{ id: 'logout', label: 'Logout' }
	];
</script>

<CwHeader
	title="My App"
	bind:sideNavMode={mode}
	onToggleNav={() => (mode = mode === 'hidden' ? 'open' : 'hidden')}
>
	{#snippet actions()}
		<CwProfileMenu name="kevin@cropwatch.io" subtitle="Administrator" {menuItems} onselect={(event) => {
			if (event.id === 'logout') {
				goto('/auth/logout');
			}
		}} />
	{/snippet}
</CwHeader>
