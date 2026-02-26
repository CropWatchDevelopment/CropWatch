<script lang="ts">
	import { goto } from '$app/navigation';
	import { CwHeader, CwProfileMenu, type CwSideNavMode } from '@cropwatchdevelopment/cwui';
	import CROPWATCH_LOGO from '$lib/images/cropwatch_static.svg';
	import { defaultAppContext, getAppContext } from '$lib/appContext.svelte';

	let { mode } = $props();
	const app = getAppContext();

	const menuItems = [
		{ id: 'profile', label: 'Profile' },
		{ id: 'billing', label: 'Billing' },
		{ id: 'settings', label: 'Settings' },
		{ id: 'logout', label: 'Logout' }
	];
</script>

<CwHeader
	bind:sideNavMode={mode}
	onToggleNav={() => (mode = mode === 'hidden' ? 'open' : 'hidden')}
>
	{#snippet logo()}
		<div class="flex flex-row items-center gap-2">
			<img src={CROPWATCH_LOGO} alt="CropWatch Logo" style="width:2rem;height:2rem" />
			<span class="text-lg font-semibold">CropWatch</span>
		</div>
	{/snippet}

	{#snippet actions()}
		<CwProfileMenu name={app.session?.email ?? ''} subtitle={app.session?.role ?? ''} {menuItems} onselect={(event) => {
			if (event.id === 'logout') {
				goto('/auth/logout').then(() => {
					// Optionally, you can also clear the app context or perform any other cleanup here
					Object.assign(app, defaultAppContext);
					window.location.reload();
				}).catch(() => {
					// Handle any errors that occur during logout
					alert('An error occurred while logging out. Please try again.');
				});
			} else if (event.id === 'profile') {
				goto('/account/profile');
			} else if (event.id === 'settings') {
				goto('/settings');
			} else if (event.id === 'billing') {
				goto('/account/billing');
			}
		}} />
	{/snippet}
</CwHeader>
