<script lang="ts">
	import { invalidate } from '$app/navigation';
	import { page } from '$app/state';
	import { PUBLIC_SUPABASE_ANON_KEY, PUBLIC_SUPABASE_URL } from '$env/static/public';
	import Header from '$lib/components/Header.svelte';
	import GlobalSidebar from '$lib/components/GlobalSidebar.svelte';
	import ToastContainer from '$lib/components/Toast/ToastContainer.svelte';
	import { i18n } from '$lib/i18n/index.svelte';
	import { sidebarStore } from '$lib/stores/SidebarStore.svelte';
	import { createBrowserClient } from '@supabase/ssr';
	import { onMount } from 'svelte';
	import '../app.css';
	import { warning } from '$lib/stores/toast.svelte';

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

	// Check if we should show the sidebar (not on auth pages)
	let showSidebar = $derived(!page.url.pathname.startsWith('/auth'));

	// Dynamic margin based on sidebar state
	let mainMargin = $derived(() => {
		if (!showSidebar) return '';
		if (sidebarStore.isOpen) return 'lg:ml-64';
		if (sidebarStore.isSmallIconMode) return 'lg:ml-16';
		return 'lg:ml-16'; // default collapsed state on desktop
	});

	// Log user updates without creating an infinite loop
	$effect(() => {
		if (user) {
			//console.log('User data updated:', user.email || 'Guest');
		}
	});

	// Improved auth listener to handle session initialization more robustly
	onMount(() => {
		//console.log('Setting up auth listener');
		const { data: authData } = supabase.auth.onAuthStateChange((event, _session) => {
			//console.log('Auth state change event:', event, _session?.user?.email);

			if (_session) {
				//console.log('Session initialized:', _session);
				session = _session;
				user = _session.user;
			} else {
				warning('Your session has expired. Please login again.');
				console.warn('No session found during auth state change');
				session = null;
				user = null;
			}

			// Invalidate to refresh server data when session changes
			invalidate('supabase:auth');
		});

		return () => authData.subscription.unsubscribe();
	});

	onMount(() => {
		i18n.initialize();
	});
</script>

<!-- Wait until svelte-i18n is initialized -->
{#if i18n.initialized}
	<div class="page-transition-container">
		{#if !page.url.pathname.startsWith('/auth')}
			<Header userName={user?.email ?? 'Unknown User'} />
		{/if}
		{#if showSidebar}
			<GlobalSidebar />
		{/if}
		<main
			class="bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark min-h-screen transition-all duration-300"
			style="margin-left: {showSidebar ? (sidebarStore.isOpen ? '256px' : '64px') : '0'}; 
				   padding-top: 119px;
				   --sidebar-width: {showSidebar ? (sidebarStore.isOpen ? '256px' : '64px') : '0'};"
		>
			{@render children()}
			<ToastContainer position="top-right" />
		</main>
	</div>
{/if}

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

	/* Mobile: no sidebar margin */
	@media (max-width: 1023px) {
		main {
			margin-left: 0 !important;
			padding-top: 119px !important;
		}
	}
</style>
