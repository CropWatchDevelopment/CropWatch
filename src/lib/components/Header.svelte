<script>
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import CropWatchLogo from '$lib/images/favicon.svg';
	import { onMount } from 'svelte';
	import { _, locale } from 'svelte-i18n';
	import Breadcrumbs from './global/Breadcrumbs.svelte';
	import { getDarkMode } from './theme/theme.svelte';
	import ThemeToggle from './theme/ThemeToggle.svelte';
	import Button from './UI/buttons/Button.svelte';
	import MaterialIcon from './UI/icons/MaterialIcon.svelte';
	import { sidebarStore } from '$lib/stores/SidebarStore.svelte';
	import LanguageSelector from './UI/form/LanguageSelector.svelte';

	let { userName } = $props();

	let mobileMenuOpen = $state(false);
	let announcementVisible = $state(true);

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

	// Close mobile menu when clicking outside
	function handleClickOutside(event) {
		if (!event.target.closest('.mobile-menu') && !event.target.closest('.mobile-menu-btn')) {
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

		return () => {
			document.removeEventListener('click', handleClickOutside);
		};
	});
</script>

<!-- Main Header -->
<header
	class="fixed top-0 right-0 left-0 z-50 overflow-hidden border-b transition-colors duration-300 {getDarkMode()
		? 'border-emerald-900 bg-emerald-800'
		: 'border-emerald-500 bg-slate-800'}"
>
	<!-- Animated background pattern -->
	<div class="absolute inset-0">
		<div
			class="absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,_{getDarkMode()
				? '#22c55e'
				: '#10b981'}_2px,_transparent_2px),radial-gradient(circle_at_75%_75%,_{getDarkMode()
				? '#10b981'
				: '#059669'}_1px,_transparent_1px)] animate-[drift_20s_linear_infinite] bg-[length:60px_60px]"
		></div>
	</div>

	<nav class="relative z-10 flex w-full p-4">
		<!-- Logo -->
		<a
			href="/app/dashboard"
			class="mr-5 flex items-center gap-3 no-underline transition-transform hover:scale-105 hover:no-underline focus:no-underline"
			style="text-decoration: none !important;"
		>
			<img src={CropWatchLogo} alt="CropWatch Logo" class="h-10" width="40px" height="40px" />
			<div
				class="cropwatch-shine rounded-md text-2xl font-bold tracking-tight text-white transition-colors duration-300"
				style="text-decoration: none !important;"
			>
				<h1>𝘾𝙧𝙤𝙥𝙒𝙖𝙩𝙘𝙝<sup><small>®</small></sup></h1>
			</div>
		</a>

		<!-- Desktop Navigation -->
		<ul class="hidden items-center gap-8 lg:flex">
			<!-- <li>
				<a
					href="#about"
					class="relative rounded-lg px-4 py-2 font-medium backdrop-blur-sm transition-all duration-300 after:absolute after:bottom-0 after:left-1/2 after:h-0.5 after:w-0 after:-translate-x-1/2 after:bg-gradient-to-r after:from-green-500 after:to-emerald-500 after:transition-all after:duration-300 hover:-translate-y-0.5 hover:after:w-4/5 {getDarkMode()
						? 'text-white/80 hover:bg-green-500/10 hover:text-green-400'
						: 'text-gray-700 hover:bg-green-500/10 hover:text-green-600'}"
				>
					About
				</a>
			</li> -->
		</ul>

		<!-- CTA Button -->
		<span class="flex-1"></span>
		<div class="hidden items-center gap-3 md:flex">
			<!-- @todo Move the language and theme selectors to the user settings page -->
			<LanguageSelector />
			<ThemeToggle />
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
			class="mobile-menu absolute top-full right-0 left-0 z-50 border-b transition-all duration-300 lg:hidden {getDarkMode()
				? 'border-slate-700 bg-slate-800'
				: 'border-gray-200 bg-white'}"
		>
			<div class="px-4 py-4">
				<!-- Mobile Navigation Links -->
				<div
					class="space-y-3 border-b pb-4 {getDarkMode()
						? 'border-slate-700/30'
						: 'border-gray-200/30'}"
				>
					<a
						href="/app/dashboard"
						class="block rounded-lg px-4 py-2 font-medium transition-colors {getDarkMode()
							? 'text-white/80 hover:bg-green-500/10 hover:text-green-400'
							: 'text-gray-700 hover:bg-green-500/10 hover:text-green-600'}"
						onclick={() => (mobileMenuOpen = false)}
					>
						Dashboard
					</a>
					<a
						href="/app/dashboard/location"
						class="block rounded-lg px-4 py-2 font-medium transition-colors {getDarkMode()
							? 'text-white/80 hover:bg-green-500/10 hover:text-green-400'
							: 'text-gray-700 hover:bg-green-500/10 hover:text-green-600'}"
						onclick={() => (mobileMenuOpen = false)}
					>
						Locations
					</a>
					<a
						href="/app/devices"
						class="block rounded-lg px-4 py-2 font-medium transition-colors {getDarkMode()
							? 'text-white/80 hover:bg-green-500/10 hover:text-green-400'
							: 'text-gray-700 hover:bg-green-500/10 hover:text-green-600'}"
						onclick={() => (mobileMenuOpen = false)}
					>
						Devices
					</a>
					<a
						href="/app/reports"
						class="block rounded-lg px-4 py-2 font-medium transition-colors {getDarkMode()
							? 'text-white/80 hover:bg-green-500/10 hover:text-green-400'
							: 'text-gray-700 hover:bg-green-500/10 hover:text-green-600'}"
						onclick={() => (mobileMenuOpen = false)}
					>
						Reports
					</a>
					<a
						href="/app/settings"
						class="block rounded-lg px-4 py-2 font-medium transition-colors {getDarkMode()
							? 'text-white/80 hover:bg-green-500/10 hover:text-green-400'
							: 'text-gray-700 hover:bg-green-500/10 hover:text-green-600'}"
						onclick={() => (mobileMenuOpen = false)}
					>
						Settings
					</a>
				</div>

				<!-- Mobile Actions -->
				<div class="space-y-3 pt-4">
					<!-- Theme Toggle -->
					<div class="flex items-center justify-between">
						<span class="text-sm font-medium {getDarkMode() ? 'text-slate-400' : 'text-gray-600'}">
							Theme
						</span>
						<ThemeToggle />
					</div>

					<!-- Language Toggle -->
					<div class="flex items-center justify-between">
						<span class="text-sm font-medium {getDarkMode() ? 'text-slate-400' : 'text-gray-600'}">
							Language
						</span>
						<button
							onclick={(event) => {
								event.preventDefault();
								$locale = $locale === 'ja' ? 'en' : 'ja';
							}}
							class="flex items-center gap-1 rounded-lg px-3 py-1 text-sm transition-colors {getDarkMode()
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
						class="flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors {getDarkMode()
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
					<div class="border-t pt-4 {getDarkMode() ? 'border-slate-700/30' : 'border-gray-200/30'}">
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

<!-- Secondary Navigation/Breadcrumb Bar -->
<div
	class="fixed right-0 left-0 z-40 border-b transition-colors {getDarkMode()
		? 'border-slate-700 bg-slate-800'
		: 'border-gray-200 bg-slate-200 shadow-sm'} titlebar-safe-area"
	style="top: 72px;"
>
	<div class="mx-auto px-4 py-3">
		<div class="flex flex-wrap items-center gap-4">
			<!-- Breadcrumb or secondary nav -->
			<div
				class="flex items-center gap-2 text-sm {getDarkMode() ? 'text-slate-400' : 'text-gray-600'}"
			>
				<Breadcrumbs />
			</div>
			<div class="flex-1"></div>
			<!-- Quick actions -->
			<div class="hidden items-center gap-4 text-sm md:flex">
				<a
					href={`https://kb.cropwatch.io/doku.php?id=${page.route.id}`}
					target="_blank"
					class="flex items-center gap-1 transition-colors hover:text-green-400 {getDarkMode()
						? 'text-slate-400'
						: 'text-gray-600'}"
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
			</div>
		</div>
	</div>
</div>

<style>
	.titlebar-safe-area {
		padding-top: env(titlebar-area-height, 0px);
	}

	/* Math Sans Bold Italic for CropWatch header */
	.cropwatch-shine {
		position: relative;
		overflow: hidden;
	}

	.cropwatch-shine::before {
		content: '';
		position: absolute;
		top: 0;
		left: -100%;
		width: 100%;
		height: 100%;
		background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
		animation: shine 2s ease-in-out 0.5s;
		pointer-events: none;
	}

	@keyframes shine {
		0% {
			left: -100%;
		}
		100% {
			left: 100%;
		}
	}

	/* Alternative brighter shine effect */
	.cropwatch-shine-bright::before {
		background: linear-gradient(
			90deg,
			transparent,
			rgba(255, 255, 255, 0.8),
			rgba(255, 255, 255, 0.4),
			rgba(255, 255, 255, 0.8),
			transparent
		);
		animation: shine 2.5s ease-in-out 0.5s;
	}
	@keyframes drift {
		0% {
			transform: translateX(0) translateY(0);
		}
		100% {
			transform: translateX(-60px) translateY(-60px);
		}
	}
</style>
