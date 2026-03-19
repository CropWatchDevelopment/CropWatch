<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import LanguageSwitcher from '$lib/components/LanguageSwitcher.svelte';
	import { m } from '$lib/paraglide/messages.js';
	import {
		CwHeader,
		CwProfileMenu,
		CwSwitch,
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
		<div class="flex flex-row items-center gap-2">
			<img src={CROPWATCH_LOGO} alt={m.app_name()} style="width:2rem;height:2rem" />
			<span class="text-lg font-semibold">CropWatch</span>
		</div>
	{/snippet}

	{#snippet actions()}
		{#if app.session?.email.endsWith('@cropwatch.io')}
			<CwSwitch
				class="mr-20"
				label={m.header_privacy_mode()}
				onchange={(event: boolean) => {
					debugger;
					app.privacyModeEnabled = event;
				}}
			/>
		{/if}
		<LanguageSwitcher compact class="mr-3" />
		<CwThemePicker onchange={(theme) => console.log(theme)} />
		<CwProfileMenu
			name={app.session?.email ?? ''}
			subtitle={app.session?.role ?? ''}
			{menuItems}
			onselect={(event) => {
				if (event.id === 'logout') {
					goto(resolve('/auth/logout'))
						.then(() => {
							// Optionally, you can also clear the app context or perform any other cleanup here
							Object.assign(app, defaultAppContext);
							window.location.reload();
						})
						.catch(() => {
							alert(m.header_logout_error());
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
	:global(.cw-header.app-header) {
		background: var(--cw-sidenav-bg);
	}
</style>
