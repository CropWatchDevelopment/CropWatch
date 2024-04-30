<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidate, invalidateAll, goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { _, isLoading } from 'svelte-i18n';
	import { SvelteToast } from '@zerodevx/svelte-toast';
	import '../app.css';

	export let data;
	$: ({ session, supabase } = data);

	onMount(() => {
		const { data } = supabase.auth.onAuthStateChange((_, newSession) => {
			if (!newSession) {
				/**
				 * Queue this as a task so the navigation won't prevent the
				 * triggering function from completing
				 */
				setTimeout(() => {
					goto('/', { invalidateAll: true });
				});
			}
			if (newSession?.expires_at !== session?.expires_at) {
				invalidate('supabase:auth');
			}
		});

		return () => data.subscription.unsubscribe();
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
<div class="bg-primary text-surface-300 py-2 static">
	<nav>
		<!-- {#if !data.session}
			<p>test</p>
			<a href="/auth/login">login</a> / <a href="/auth/register">signup</a> /
		{:else}
			<a href="/">Home</a> /
			<a href="/auth/user-profile">User profile</a> /
			<a href="/app/devices">Devices</a> /
			<a href="/app/locations">Locations</a>
			<form action="/auth/logout?/logout" method="POST" use:enhance={submitLogout}>
				<button type="submit">Logout</button>
			</form>
		{/if} -->

		<div class="flex justify-between px-4 items-center">
			<!-- HOME/LOGO BUTTON -->
			<div class="w-32">
				<a href="/">
					<img src="/icons/UI/cw_Logo.png" alt="" />
				</a>
			</div>

			<!-- HAMBURGER ICON -->
			<div class="w-14">
				<svg
					id="Layer_1"
					data-name="Layer 1"
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 300 300"
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
<div class="app bg-neutral">
	<!-- <h1>{$_('header.home')}</h1>
	<span id="auth_header">
		{#if !data.session}
			<a href="/auth/login">login</a> / <a href="/auth/register">signup</a> /
		{:else}
			<a href="/">Home</a> /
			<a href="/auth/user-profile">User profile</a> /
			<a href="/app/devices">devices</a>
			<form action="/auth/logout?/logout" method="POST" use:enhance={submitLogout}>
				<button type="submit">Logout</button>
			</form>
		{/if}
	</span> -->
	<main>
		<slot />
	</main>
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
