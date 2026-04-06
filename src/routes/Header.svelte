<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import LanguageSwitcher from '$lib/components/LanguageSwitcher.svelte';
	import { m } from '$lib/paraglide/messages.js';
	import { buildLogoutPath } from '$lib/utils/auth-redirect';
	import {
		CwHeader,
		CwProfileMenu,
		CwThemePicker,
		type CwSideNavMode
	} from '@cropwatchdevelopment/cwui';
	import CROPWATCH_LOGO from '$lib/images/cropwatch_static.svg';
	import { defaultAppContext, getAppContext } from '$lib/appContext.svelte';

	let { mode = $bindable<CwSideNavMode>() } = $props();
	const app = getAppContext();

	const menuItems = $derived([
		{ id: 'profile', label: m.nav_profile() },
		{ id: 'billing', label: m.nav_billing() },
		{ id: 'settings', label: m.nav_settings() },
		{ id: 'logout', label: m.nav_logout(), separator: true, danger: true }
	]);
</script>

<CwHeader
	class="app-header"
	bind:sideNavMode={mode}
	onToggleNav={() => (mode = mode === 'hidden' ? 'open' : 'hidden')}
>
	{#snippet logo()}
		{#if mode === 'mini'}
			<!-- <div class="app-header__brand">
				<img src={CROPWATCH_LOGO} alt={m.app_name()} class="app-header__brand-mark" />
				<span class="app-header__brand-name">CropWatch</span>
			</div> -->
			<div class="app-header__brand">
				<img
					src={CROPWATCH_LOGO}
					alt="CropWatch Logo"
					style="width:1.5rem;height:1.5rem"
				/>
				<span class="app-header__brand-name">𝘾𝙧𝙤𝙥𝙒𝙖𝙩𝙘𝙝® UI</span>
			</div>
		{/if}
	{/snippet}

	{#snippet actions()}
		<LanguageSwitcher compact class="mr-3" />
		<CwThemePicker />
		<CwProfileMenu
			name={app.session?.email ?? ''}
			subtitle={app.profile?.employer ?? ''}
			{menuItems}
			onselect={(event) => {
				if (event.id === 'logout') {
					Object.assign(app, defaultAppContext);
					window.location.href = buildLogoutPath({
						path: resolve('/auth/logout'),
						redirectTo: `${page.url.pathname}${page.url.search}`
					});
				} else if (event.id === 'profile') {
					goto(resolve('/account/profile'));
				} else if (event.id === 'settings') {
					goto(resolve('/settings'));
				} else if (event.id === 'billing') {
					goto(resolve('/account/billing'));
				}
			}}
		/>
	{/snippet}
</CwHeader>

<style>
	.app-header__brand {
		display: flex;
		align-items: center;
		gap: var(--cw-space-2);
		color: white;
	}

	.app-header__brand-name {
		font-size: 1.125rem;
		font-weight: var(--cw-font-semibold);
	}
</style>
