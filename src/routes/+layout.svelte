<script lang="ts">
	import '../app.css';
	import ToastContainer from '$lib/components/Toast/ToastContainer.svelte';
	import Header from '$lib/components/Header.svelte';
	// Theme is now initialized directly in the theme module
	import { invalidate } from '$app/navigation';
	import { onMount } from 'svelte';
	import { createBrowserClient } from '@supabase/ssr';
	import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
	import { page } from '$app/stores';

	// No preloading needed - dashboard will load its data when navigated to

	let { children, data } = $props();

	// Create a browser client for client-side auth
	const supabase = createBrowserClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
		auth: {
			persistSession: true,
			detectSessionInUrl: true
		}
	});

	// Use derived values instead of state to avoid infinite loops
	let session = $derived(data.session);
	let user = $derived(data.user);

	// Log user updates without creating an infinite loop
	$effect(() => {
		if (user) {
			console.log('User data updated:', user.email || 'Guest');
		}
	});

	// Improved auth listener to handle session initialization more robustly
	onMount(() => {
		console.log('Setting up auth listener');
		const { data: authData } = supabase.auth.onAuthStateChange((event, _session) => {
			console.log('Auth state change event:', event, _session?.user?.email);

			if (_session) {
				console.log('Session initialized:', _session);
				session = _session;
				user = _session.user;
			} else {
				console.warn('No session found during auth state change');
				session = null;
				user = null;
			}

			// Invalidate to refresh server data when session changes
			invalidate('supabase:auth');
		});

		return () => authData.subscription.unsubscribe();
	});
</script>

<div class="page-transition-container">
	{#if !$page.url.pathname.startsWith('/auth')}
		<Header userName={user?.email ?? 'Unknown User'} />
	{/if}
	<div
		class="bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark min-h-screen transition-colors duration-300"
	>
		{@render children()}
		<ToastContainer position="top-right" />
	</div>
</div>

<style>
	.page-transition-container {
		animation: fadeIn 0.3s ease-in-out;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}
</style>
