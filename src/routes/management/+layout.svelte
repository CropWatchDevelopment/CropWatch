<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { m } from '$lib/paraglide/messages.js';
	import { AppPage } from '$lib/components/layout';
	import { CwButton } from '@cropwatchdevelopment/cwui';
	import { getAppContext } from '$lib/appContext.svelte';
	import { Capability, can } from '$lib/auth/capabilities';

	let { children } = $props();
	const app = getAppContext();

	const tabs = $derived([
		{ href: resolve('/management/users'), label: m.management_tab_users() },
		// Settings is Owner-only (org.settings.manage); the server load 403s deep links.
		...(can(app.orgContext, Capability.OrgSettingsManage)
			? [{ href: resolve('/management/settings'), label: m.management_tab_settings() }]
			: [])
	]);
</script>

<AppPage width="lg">
	<CwButton variant="secondary" size="sm" onclick={() => goto(resolve('/'))}>
		&larr; {m.action_back()}
	</CwButton>

	<nav class="management-tabs" aria-label={m.management_page_title()}>
		{#each tabs as tab (tab.href)}
			<CwButton
				size="sm"
				variant={page.url.pathname.startsWith(tab.href) ? 'primary' : 'ghost'}
				onclick={() => goto(tab.href)}
			>
				{tab.label}
			</CwButton>
		{/each}
	</nav>

	{@render children()}
</AppPage>

<style>
	.management-tabs {
		display: flex;
		flex-wrap: wrap;
		gap: var(--cw-space-2);
	}
</style>
