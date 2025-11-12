<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import CropWatchLogo from '$lib/images/favicon.svg';
	import { onMount } from 'svelte';
	import { _, locale } from 'svelte-i18n';
	import Breadcrumbs from './global/Breadcrumbs.svelte';
	// The legacy getDarkMode wrapper is removed; subscribe directly to themeStore
	import ThemeModeSelector from './theme/ThemeModeSelector.svelte';
	import { themeStore } from '$lib/stores/theme';
	import Button from './UI/buttons/Button.svelte';
	import MaterialIcon from './UI/icons/MaterialIcon.svelte';
	import { sidebarStore } from '$lib/stores/SidebarStore.svelte';
	import LanguageSelector from './UI/form/LanguageSelector.svelte';
	import SiteWideRefreshButton from './SiteWideRefreshButton.svelte';

	let { userName } = $props();

	let mobileMenuOpen = $state(false);
	let announcementVisible = $state(true);
	let dark = $state(false);
	// Subscribe to theme store for live dark mode updates
	const _unsubTheme = themeStore.subscribe((v) => (dark = v.effective === 'dark'));

	function toggleMobileMenu() {
		mobileMenuOpen = !mobileMenuOpen;
	}

	function closeAnnouncement() {
		announcementVisible = false;
	}

	// Toggle sidebar when hamburger menu is clicked
	function toggleSidebar() {
		sidebarStore.toggle();
	}

	// Close mobile menu when clicking outside (runtime type guard to stay JS-compatible if TS preproc fails)
	// @ts-ignore - runtime guarded; Svelte preprocessor not inferring JSDoc here
	function handleClickOutside(event) {
		const target = event?.target;
		if (!(target instanceof HTMLElement)) return;
		if (!target.closest('.mobile-menu') && !target.closest('.mobile-menu-btn')) {
			mobileMenuOpen = false;
		}
	}

	function handleLogout() {
		//console.log('Logging out user:', userName);

		// Call the API endpoint for server-side logout
		fetch('/api/auth/logout', {
			method: 'POST'
		})
			.then(() => {
				//console.log('Server logout successful');
				// Redirect to login page
				goto('/auth/login');
			})
			.catch((err) => {
				console.error('Server logout error:', err);
				// Redirect anyway
				goto('/auth/login');
			});
	}

	onMount(() => {
		document.addEventListener('click', handleClickOutside);
		// Ensure initial dark flag is correct (in case subscription fired before mount)
		dark =
			typeof document !== 'undefined' ? document.documentElement.classList.contains('dark') : dark;

		return () => {
			document.removeEventListener('click', handleClickOutside);
			_unsubTheme && _unsubTheme();
		};
	});
</script>

<!-- Main Header -->
<header class="fixed inset-x-0 top-0 z-50 border-b border-emerald-900 bg-emerald-800 text-white">
	<nav class="flex w-full flex-row items-center gap-4 px-6 py-3">
		<!-- Logo -->
		<a
			href="/app/dashboard"
			class="mr-5 flex items-center gap-3 rounded-lg px-2 py-1 no-underline transition-transform hover:scale-[1.02] hover:no-underline focus:no-underline"
			style="text-decoration: none !important;"
		>
			<img src={CropWatchLogo} alt="CropWatch Logo" class="h-9 w-9" width="36" height="36" />
			<div
				class="font-heading text-xl font-semibold tracking-tight text-white transition-colors duration-300"
			>
				<h1>𝘾𝙧𝙤𝙥𝙒𝙖𝙩𝙘𝙝<sup><small>®</small></sup></h1>
			</div>
		</a>

		<span class="flex-1"></span>

		<div class="hidden items-center gap-3 text-white md:flex">
			<!-- @todo Move the language and theme selectors to the user settings page -->
			<LanguageSelector />
			<ThemeModeSelector />
			{#if page.data.session?.user}
				<Button variant="secondary" onclick={handleLogout}>{$_('Logout')}</Button>
			{:else}
				<Button variant="primary" href="/auth/login">{$_('Login')}</Button>
			{/if}
		</div>

		<!-- Mobile menu button -->
		<button
			onclick={toggleSidebar}
			class="mobile-menu-btn rounded-lg p-2 text-white transition-colors lg:hidden"
			aria-label="Toggle mobile menu"
			aria-expanded={mobileMenuOpen}
			aria-controls="mobile-menu"
			class:open={mobileMenuOpen}
		>
			<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M4 6h16M4 12h16M4 18h16"
				></path>
			</svg>
		</button>
	</nav>

	<!-- Mobile Menu -->
	{#if mobileMenuOpen}
		<div
			class="mobile-menu absolute top-full right-0 left-0 z-50 border-b border-emerald-900 bg-emerald-800/95 text-white transition-all duration-300 lg:hidden"
		>
			<div class="px-4 py-4">
				<!-- Mobile Navigation Links -->
				<div class="space-y-3 border-b border-emerald-900/60 pb-4">
					<a
						href="/app/dashboard"
						class="block rounded-lg px-4 py-2 font-medium text-white transition-colors hover:bg-white/10"
						onclick={() => (mobileMenuOpen = false)}
					>
						Dashboard
					</a>
					<a
						href="/app/dashboard/location"
						class="block rounded-lg px-4 py-2 font-medium text-white transition-colors hover:bg-white/10"
						onclick={() => (mobileMenuOpen = false)}
					>
						Locations
					</a>
					<a
						href="/app/devices"
						class="block rounded-lg px-4 py-2 font-medium text-white transition-colors hover:bg-white/10"
						onclick={() => (mobileMenuOpen = false)}
					>
						Devices
					</a>
					<a
						href="/app/reports"
						class="block rounded-lg px-4 py-2 font-medium text-white transition-colors hover:bg-white/10"
						onclick={() => (mobileMenuOpen = false)}
					>
						Reports
					</a>
					<a
						href="/app/settings"
						class="block rounded-lg px-4 py-2 font-medium transition-colors {dark
							? 'text-white/80 hover:bg-green-500/10 hover:text-green-400'
							: 'text-gray-700 hover:bg-green-500/10 hover:text-green-600'}"
						onclick={() => (mobileMenuOpen = false)}
					>
						Settings
					</a>
				</div>

				<!-- Mobile Actions -->
				<div class="space-y-3 pt-4">
					<!-- Theme Mode Selector -->
					<div class="flex items-center justify-between">
						<span class="text-sm font-medium {dark ? 'text-slate-400' : 'text-gray-600'}">
							Theme
						</span>
						<ThemeModeSelector />
					</div>

					<!-- Language Toggle -->
					<div class="flex items-center justify-between">
						<span class="text-sm font-medium {dark ? 'text-slate-400' : 'text-gray-600'}">
							Language
						</span>
						<button
							onclick={(event) => {
								event.preventDefault();
								$locale = $locale === 'ja' ? 'en' : 'ja';
							}}
							class="flex items-center gap-1 rounded-lg px-3 py-1 text-sm transition-colors {dark
								? 'text-slate-400 hover:bg-slate-700/50 hover:text-green-400'
								: 'text-gray-600 hover:bg-gray-100 hover:text-green-600'}"
						>
							<MaterialIcon name="globe" size="small" />
							{$locale === 'ja' ? 'English' : '日本語'}
						</button>
					</div>

					<!-- Help Link -->
					<a
						href={`https://kb.cropwatch.io/doku.php?id=${page.route.id}`}
						target="_blank"
						class="flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors {dark
							? 'text-slate-400 hover:bg-slate-700/50 hover:text-green-400'
							: 'text-gray-600 hover:bg-gray-100 hover:text-green-600'}"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="16"
							height="16"
							fill="currentColor"
							class="bi bi-question-circle"
							viewBox="0 0 16 16"
						>
							<path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16" />
							<path
								d="M5.255 5.786a.237.237 0 0 0 .241.247h.825c.138 0 .248-.113.266-.25.09-.656.54-1.134 1.342-1.134.686 0 1.314.343 1.314 1.168 0 .635-.374.927-.965 1.371-.673.489-1.206 1.06-1.168 1.987l.003.217a.25.25 0 0 0 .25.246h.811a.25.25 0 0 0 .25-.25v-.105c0-.718.273-.927 1.01-1.486.609-.463 1.244-.977 1.244-2.056 0-1.511-1.276-2.241-2.673-2.241-1.267 0-2.655.59-2.75 2.286m1.557 5.763c0 .533.425.927 1.01.927.609 0 1.028-.394 1.028-.927 0-.552-.42-.94-1.029-.94-.584 0-1.009.388-1.009.94"
							/>
						</svg>
						Help
					</a>

					<!-- Login/Logout Button -->
					<div class="border-t pt-4 {dark ? 'border-slate-700/30' : 'border-gray-200/30'}">
						{#if page.data.session?.user}
							<Button
								variant="secondary"
								onclick={() => {
									handleLogout();
									mobileMenuOpen = false;
								}}
								class="w-full"
							>
								{$_('Logout')}
							</Button>
						{:else}
							<Button
								variant="primary"
								href="/auth/login"
								class="w-full"
								onclick={() => (mobileMenuOpen = false)}
							>
								{$_('Login')}
							</Button>
						{/if}
					</div>
				</div>
			</div>
		</div>
	{/if}
</header>

<style>
	.titlebar-safe-area {
		padding-top: env(titlebar-area-height, 0px);
	}
</style>
