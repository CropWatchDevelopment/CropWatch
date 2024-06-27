<script lang="ts">
	import { invalidate, goto, invalidateAll } from '$app/navigation';
	import { onMount } from 'svelte';
	import { _, isLoading } from 'svelte-i18n';
	import cw_LogoImage from '$lib/images/UI/logo_192.png';
	import { ProgressCircle, Drawer, Button, Icon, AppBar, AppLayout } from 'svelte-ux';
	import { navigating } from '$app/stores';
	import Close from '$lib/images/UI/cw_Close Button.svg';
	import { dev } from '$app/environment';
	import { mdiBell, mdiMenu } from '@mdi/js';

	export let data;
	$: ({ supabase } = data);

	onMount(async () => {
		const {
			data: { subscription }
		} = supabase.auth.onAuthStateChange((event, _session) => {
			invalidate('supabase:auth');
			invalidateAll();
		});
		return () => subscription.unsubscribe();
	});

	let rightOpen = false;
</script>

<AppBar title="CropWatch" class="bg-primary text-primary-content p-4 h-16">
	<svelte:fragment slot="menuIcon" let:toggleMenu let:isMenuOpen>
		<a href="/app">
			<img src={cw_LogoImage} alt="CropWatch Logo" width="40px" />
		</a>
	</svelte:fragment>

	<div slot="actions">
		<!-- App actions -->
		<Icon data={mdiBell} class="mr-4" />
		<Icon data={mdiMenu} on:click={() => (rightOpen = true)} />
		<Drawer bind:open={rightOpen} placement="right" class="w-[300px] bg-[#212E23] text-surface-100">
			<div class="pt-12 px-4">
				<div class="w-full text-right">
					<Button on:click={() => (rightOpen = false)} class="w-16"
						><img src={Close} alt="menu hamburger" /></Button
					>
				</div>
				<div class="pl-2">
					<h1 class="text-2xl font-medium">Menu</h1>

					<div class="text-lg mt-12 space-y-2">
						<p>
							<a href="/app">All Locations</a>
						</p>
					</div>
					<div class="text-lg mt-24">
						<form action="/auth/logout?/logout" method="post">
							<button type="submit">Sign Out</button>
						</form>
					</div>
				</div>
			</div>
			<div slot="actions">
				<Button on:click={() => (rightOpen = false)}>Close</Button>
			</div>
		</Drawer>
	</div>
</AppBar>
<main class="flex flex-col min-h-screen">
	{#if $navigating || $isLoading}
		<div class="my-auto mx-auto font-white">
			<ProgressCircle class="my-auto mx-auto" />
			{#if $isLoading}
				&nbsp; {$_('app.loading_translations_message')}
			{:else}
				&nbsp; {$_('app.loading_message')}
			{/if}
		</div>
	{:else}
		<slot />
	{/if}
	<span class="flex-grow" />
</main>
