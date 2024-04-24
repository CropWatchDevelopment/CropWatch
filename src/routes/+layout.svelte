<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidate, invalidateAll, goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { _, isLoading } from 'svelte-i18n';
	import { SvelteToast } from '@zerodevx/svelte-toast';
	import '../app.css';

	export let data;

	$: ({ supabase } = data);

	onMount(() => {
		const {
			data: { subscription }
		} = supabase.auth.onAuthStateChange((event, _session) => {
			// If you want to fain grain which routes should rerun their load function
			// when onAuthStateChange changges
			// use invalidate('supabase:auth')
			// which is linked to +layout.js depends('supabase:auth').
			// This should mainly concern all routes
			//that should be accesible only for logged in user.
			// Otherwise use invalidateAll()
			// which will rerun every load function of you app.
			invalidate('supabase:auth');
			invalidateAll();
		});
		return () => subscription.unsubscribe();
	});

	const submitLogout = async (): Promise<void> => {
		const { error } = await data.supabase.auth.signOut();
		if (error) {
			console.log(error);
		}
		await goto('/');
	};
</script>

<SvelteToast />
<div class="bg-primary text-surface-300 py-2">
	<nav>
		<!-- {#if !data.session}
			<p>test</p>
			<a href="/auth/login">login</a> / <a href="/auth/register">signup</a> /
		{:else}
			<a href="/">Home</a> /
			<a href="/auth/user-profile">User profile</a> /
			<a href="/app/devices">devices</a>
			<form action="/auth/logout?/logout" method="POST" use:enhance={submitLogout}>
				<button type="submit">Logout</button>
			</form>
		{/if} -->

		<div class="flex justify-between px-4 items-center">

			<!-- HOME/LOGO BUTTON -->
			<div class="w-32">
				<img src="/icons/UI/cw_Logo.png" alt="">	
			</div>
			
			<!-- HAMBURGER ICON -->
			<div class="w-14">
				<svg id="Layer_1" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300"
				><defs
				><style>
						.cls-1 {
							fill: #0dbf34;
						}
						</style></defs
				><title>cw</title><rect
				class="cls-1"
				x="27.92"
				y="66.2"
				width="244.15"
				height="35.66"
				/><rect class="cls-1" x="27.96" y="132.19" width="244.15" height="35.66" /><rect
				class="cls-1"
				x="27.96"
				y="198.18"
				width="244.15"
				height="35.66"
				/></svg
				>
			</div>
		</div>
		</nav>
	</div>
	<div class="app">
		<!-- <h1>{$_('header.home')}</h1> -->
		<span id="auth_header">
		{#if !data.session}
			<a href="/auth/login">login</a> / <a href="/auth/register">signup</a> /
		{:else}
			<!-- <a href="/">Home</a> /
			<a href="/auth/user-profile">User profile</a> /
			<a href="/app/devices">devices</a> -->
			<form action="/auth/logout?/logout" method="POST" use:enhance={submitLogout}>
				<!-- <button type="submit">Logout</button> -->
			</form>
		{/if}
	</span>
	<main>
		<slot />
	</main>

	<footer>
		<p>visit <a href="https://kit.svelte.dev">kit.svelte.dev</a> to learn SvelteKit</p>
	</footer>
</div>

<style>
	.app {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
	}

	main {
		flex: 1;
		display: flex;
		flex-direction: column;
		padding: 0rem;
		width: 100%;
		max-width: 64rem;
		margin: 0 auto;
		box-sizing: border-box;
	}

	footer {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		padding: 12px;
	}

	footer a {
		font-weight: bold;
	}

	@media (min-width: 480px) {
		footer {
			padding: 12px 0;
		}
	}
</style>
