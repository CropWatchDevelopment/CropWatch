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
	const profileMenuName = $derived(app.profile?.full_name?.trim() || app.session?.email || '');
	const profileMenuSubtitle = $derived.by(() => {
		const employer = app.profile?.employer?.trim();
		if (employer) {
			return employer;
		}

		if (profileMenuName !== (app.session?.email || '')) {
			return app.session?.email || '';
		}

		return '';
	});
</script>

<CwHeader
	class="app-header"
	bind:sideNavMode={mode}
	onToggleNav={() => (mode = mode === 'hidden' ? 'open' : 'hidden')}
>
	{#snippet logo()}
		<div class="app-header__brand">
			<img src={CROPWATCH_LOGO} alt={m.app_name()} class="app-header__brand-mark" />
			<span class="app-header__brand-name">CropWatch</span>
		</div>
	{/snippet}

	{#snippet actions()}
		<div class="app-header__actions-group">
			<div class="app-header__utility-group">
				<LanguageSwitcher compact />
				<CwThemePicker />
			</div>
		</div>
		<CwProfileMenu
			class="app-header__profile-menu"
			name={profileMenuName}
			subtitle={profileMenuSubtitle}
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
	:global(.app-header) {
		height: calc(5rem + var(--app-shell-padding-block-start));
		padding-top: var(--app-shell-padding-block-start);
		padding-inline: var(--app-shell-padding-inline-start) var(--app-shell-padding-inline-end);
		gap: var(--cw-space-2);
	}

	:global(.app-header .cw-header__link) {
		min-width: 0;
	}

	:global(.app-header .cw-header__logo) {
		min-width: 0;
	}

	:global(.app-header .cw-header__actions) {
		min-width: 0;
	}

	.app-header__brand {
		display: flex;
		align-items: center;
		gap: var(--cw-space-2);
		min-width: 0;
		color: white;
	}

	.app-header__brand-mark {
		width: 1.5rem;
		height: 1.5rem;
		flex: none;
	}

	.app-header__brand-name {
		font-size: 1rem;
		font-weight: var(--cw-font-semibold);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.app-header__actions-group,
	.app-header__utility-group {
		display: flex;
		align-items: center;
		gap: var(--cw-space-2);
		min-width: 0;
	}

	@media (max-width: 1023px) {
		.app-header__utility-group {
			display: none;
		}
	}

	@media (max-width: 639px) {
		:global(.app-header .cw-header__logo) {
			display: flex;
		}

		:global(.app-header .cw-profile-menu__trigger) {
			gap: 0;
			padding: var(--cw-space-2);
		}

		:global(.app-header .cw-profile-menu__info),
		:global(.app-header .cw-profile-menu__chevron),
		:global(.app-header .cw-profile-menu__icon) {
			display: none;
		}

		:global(.app-header .cw-profile-menu__avatar) {
			width: 2.25rem;
			height: 2.25rem;
		}
	}

	@media (min-width: 640px) {
		.app-header__brand-name {
			font-size: 1.0625rem;
		}
	}
</style>
