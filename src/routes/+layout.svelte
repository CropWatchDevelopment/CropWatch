<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidate, invalidateAll, goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { _, isLoading } from 'svelte-i18n';
	import { SvelteToast } from '@zerodevx/svelte-toast';

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
<div class="app">
	<h1>{$_('header.home')}</h1>
	<span id="auth_header">
		{#if !data.session}
			<a href="/auth/login">login</a> / <a href="/auth/register">signup</a> /
		{:else}
			<a href="/">Home</a> /
			<a href="/auth/user-profile">User profile</a> /
			<a href="/app/devices">Devices</a> /
			<a href="/app/locations">Locations</a>
			<form action="/auth/logout?/logout" method="POST" use:enhance={submitLogout}>
				<button type="submit">Logout</button>
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
		padding: 1rem;
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
