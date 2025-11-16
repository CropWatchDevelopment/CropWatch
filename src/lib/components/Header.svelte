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

	type TriggeredAlert = {
		id: number;
		name: string;
		ruleGroupId: string;
		dev_eui: string | null;
		last_triggered: string | null;
		trigger_count: number;
		device: {
			dev_eui: string;
			location_id: number | null;
			name: string | null;
		} | null;
	};

	const ALERTS_REFRESH_INTERVAL = 60 * 1000;

	let mobileMenuOpen = $state(false);
	let announcementVisible = $state(true);
	let dark = $state(false);
	let alerts = $state<TriggeredAlert[]>([]);
	let alertsOpen = $state(false);
	let alertsLoading = $state(false);
	let alertsError = $state<string | null>(null);
	let alertsInterval: ReturnType<typeof setInterval> | null = null;
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

	async function fetchTriggeredAlerts() {
		try {
			alertsLoading = true;
			alertsError = null;

			const response = await fetch('/api/alerts');
			if (!response.ok) {
				throw new Error('Unable to load alerts');
			}

			const payload = await response.json();
			alerts = payload.alerts ?? [];
		} catch (error) {
			console.error('Failed to load alerts', error);
			alertsError = error instanceof Error ? error.message : 'Failed to load alerts';
		} finally {
			alertsLoading = false;
		}
	}

	function toggleAlertsDropdown() {
		const nextOpen = !alertsOpen;
		alertsOpen = nextOpen;
		if (nextOpen && alerts.length === 0 && !alertsLoading) {
			void fetchTriggeredAlerts();
		}
	}

	function formatTriggerTime(value: string | null) {
		if (!value) return 'Unknown time';
		const parsed = new Date(value);
		if (Number.isNaN(parsed.getTime())) return 'Unknown time';
		return parsed.toLocaleString();
	}

	// Close mobile menu when clicking outside (runtime type guard to stay JS-compatible if TS preproc fails)
	// @ts-ignore - runtime guarded; Svelte preprocessor not inferring JSDoc here
	function handleClickOutside(event) {
		const target = event?.target;
		if (!(target instanceof HTMLElement)) return;
		if (!target.closest('.mobile-menu') && !target.closest('.mobile-menu-btn')) {
			mobileMenuOpen = false;
		}
		if (!target.closest('.alert-dropdown')) {
			alertsOpen = false;
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
		void fetchTriggeredAlerts();
		alertsInterval = window.setInterval(() => {
			void fetchTriggeredAlerts();
		}, ALERTS_REFRESH_INTERVAL);

		return () => {
			document.removeEventListener('click', handleClickOutside);
			_unsubTheme && _unsubTheme();
			if (alertsInterval) {
				clearInterval(alertsInterval);
				alertsInterval = null;
			}
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

		<div class="flex items-center gap-3 text-white">
			<SiteWideRefreshButton />
			<div class="alert-dropdown relative">
				<button
					type="button"
					class={`alert-button relative rounded-full p-2 transition-colors focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-emerald-800 focus-visible:outline-none ${
						alerts.length
							? 'bg-red-600/20 text-red-100 hover:bg-red-600/30'
							: 'bg-white/5 text-white/70 hover:bg-white/15'
					}`}
					aria-haspopup="true"
					aria-expanded={alertsOpen}
					onclick={toggleAlertsDropdown}
				>
					<MaterialIcon
						name={alerts.length ? 'notifications_active' : 'notifications_none'}
						size="large"
						aria-label={alerts.length ? 'Active alerts' : 'No active alerts'}
					/>
					{#if alerts.length > 0}
						<span
							class="absolute -top-1.5 -right-1.5 min-w-[1.6rem] rounded-full bg-red-600 px-1.5 text-center text-xs leading-5 font-semibold text-white shadow-lg"
						>
							{alerts.length}
						</span>
					{/if}
				</button>

				{#if alertsOpen}
					<div
						class="alerts-panel absolute right-0 z-50 mt-3 w-80 max-w-[90vw] rounded-xl border border-white/10 bg-emerald-950/95 p-4 text-white shadow-2xl backdrop-blur"
					>
						<div class="mb-4 flex items-center justify-between gap-2">
							<div>
								<p class="text-xs font-semibold tracking-wide text-white/60 uppercase">
									Active Alerts
								</p>
								<p class="text-lg font-semibold">{alerts.length}</p>
							</div>
							<button
								type="button"
								class="rounded-md px-3 py-1 text-xs font-semibold tracking-wide text-white/80 uppercase transition hover:bg-white/10 hover:text-white disabled:opacity-60"
								onclick={() => void fetchTriggeredAlerts()}
								disabled={alertsLoading}
							>
								{alertsLoading ? 'Refreshing…' : 'Refresh'}
							</button>
						</div>

						{#if alertsLoading && alerts.length === 0}
							<p class="text-sm text-white/80">Loading alerts…</p>
						{:else if alertsError}
							<p class="text-sm text-red-200">{alertsError}</p>
						{:else if alerts.length === 0}
							<p class="text-sm text-white/70">All clear. Triggered alerts will appear here.</p>
						{:else}
							<ul class="space-y-3">
								{#each alerts as alert (alert.id)}
									{@const deviceLocationId = alert.device?.location_id}
									{@const deviceEui = alert.device?.dev_eui}
									<li class="rounded-lg bg-white/5 p-3 text-sm">
										<p class="leading-tight font-semibold">{alert.name}</p>
										<p class="text-xs text-white/70">
											{alert.device?.name ?? alert.dev_eui ?? 'Unknown device'}
										</p>
										<p class="mt-1 text-xs text-white/60">
											Triggered {formatTriggerTime(alert.last_triggered)}
										</p>
										{#if deviceLocationId && deviceEui}
											<a
												class="mt-2 inline-flex w-full items-center justify-center rounded-md bg-white/10 px-3 py-1.5 text-xs font-semibold tracking-wide text-white uppercase transition hover:bg-white/20"
												href={`/app/dashboard/location/${deviceLocationId}/devices/${deviceEui}`}
											>
												View
											</a>
										{:else}
											<p
												class="mt-2 rounded-md bg-white/5 px-3 py-1 text-center text-xs text-white/60"
											>
												Device details unavailable
											</p>
										{/if}
									</li>
								{/each}
							</ul>
						{/if}
					</div>
				{/if}
			</div>

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
