<script lang="ts">
	import { invalidate, beforeNavigate, afterNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import { PUBLIC_SUPABASE_ANON_KEY, PUBLIC_SUPABASE_URL } from '$env/static/public';
	import Header from '$lib/components/Header.svelte';
	import GlobalSidebar from '$lib/components/GlobalSidebar.svelte';
	import GlobalLoading from '$lib/components/GlobalLoading.svelte';
	import ToastContainer from '$lib/components/Toast/ToastContainer.svelte';
	import { i18n } from '$lib/i18n/index.svelte';
	import { sidebarStore } from '$lib/stores/SidebarStore.svelte';
	import { globalLoading, startLoading, stopLoading } from '$lib/stores/loadingStore';
	import { createBrowserClient } from '@supabase/ssr';
	import { onMount } from 'svelte';
	import '../app.css';
	import { info, warning } from '$lib/stores/toast.svelte';
	import { ONE_SIGNAL_PUBLIC_CONFIG } from '$lib/onesignalPublic';
	import { themeStore, initThemeOnce } from '$lib/stores/theme';

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
			console.log('Auth state change event:', event);
			switch (event) {
				case 'TOKEN_REFRESHED':
					info('Your session was refreshed successfully.');
					break;

				case 'SIGNED_OUT':
					warning('Your session has ended. Please login again.');
					break;
				default:
					break;
			}
			// Invalidate to refresh server data when session changes
			invalidate('supabase:auth');
		});

		return () => authData.subscription.unsubscribe();
	});

	onMount(() => {
		i18n.initialize();
	});

	// OneSignal Web Push (2025 docs style) - only loads if appId present
	onMount(() => {
		if (typeof window === 'undefined') return;
		if (!ONE_SIGNAL_PUBLIC_CONFIG.appId) return;
		// Inject script once
		if (!document.querySelector('script[data-onesignal-sdk]')) {
			const s = document.createElement('script');
			s.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
			s.defer = true;
			s.setAttribute('data-onesignal-sdk', 'true');
			document.head.appendChild(s);
		}
		// Queue init
		(window as any).OneSignalDeferred = (window as any).OneSignalDeferred || [];
		(window as any).OneSignalDeferred.push(async function (OneSignal: any) {
			await OneSignal.init({
				appId: ONE_SIGNAL_PUBLIC_CONFIG.appId,
				safari_web_id: ONE_SIGNAL_PUBLIC_CONFIG.safari_web_id,
				notifyButton: { enable: true }
			});
		});
	});

	// Handle navigation loading states with a small delay to avoid flash on fast transitions
	let navTimer: ReturnType<typeof setTimeout> | null = null;
	beforeNavigate(() => {
		if (navTimer) clearTimeout(navTimer);
		navTimer = setTimeout(() => startLoading(), 150); // show after 150ms if still navigating
	});

	afterNavigate(() => {
		if (navTimer) {
			clearTimeout(navTimer);
			navTimer = null;
		}
		stopLoading();
	});

	import { get } from 'svelte/store';
	let theme = $state(get(themeStore));
	let unsub: () => void;
	onMount(() => {
		initThemeOnce();
		unsub = themeStore.subscribe((v) => (theme = v));
		return () => unsub && unsub();
	});
</script>

<!-- Wait until svelte-i18n is initialized -->
{#if i18n.initialized}
	<div class="page-transition-container" data-theme={theme.effective}>
		{#if !page.url.pathname.startsWith('/auth')}
			<Header userName={user?.email ?? 'Unknown User'} />
		{/if}
		{#if showSidebar}
			<GlobalSidebar />
		{/if}
		<main
			class="bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark min-h-screen transition-all duration-300"
			style="margin-left: {showSidebar ? (sidebarStore.isOpen ? '256px' : '64px') : '0'}; 
				   padding-top: {showSidebar ? '70px' : '0'};
				   --sidebar-width: {showSidebar ? (sidebarStore.isOpen ? '256px' : '64px') : '0'};"
			data-auth-page={page.url.pathname.startsWith('/auth') ? 'true' : undefined}
		>
			{@render children()}
			<ToastContainer position="top-right" />
		</main>
		<GlobalLoading />
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
			padding-top: 70px !important;
		}

		/* Auth pages should have no padding even on mobile */
		main[data-auth-page] {
			padding-top: 0 !important;
		}
	}
</style>
