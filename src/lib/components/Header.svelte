<!-- <script lang="ts">
	import { goto } from '$app/navigation';
	import ThemeToggle from './theme/ThemeToggle.svelte';
	let { userName } = $props();

	// Simplified logout function
	function handleLogout() {
		console.log('Logging out user:', userName);

		// Call the API endpoint for server-side logout
		fetch('/api/auth/logout', {
			method: 'POST'
		})
			.then(() => {
				console.log('Server logout successful');
				// Redirect to login page
				goto('/auth/login');
			})
			.catch((err) => {
				console.error('Server logout error:', err);
				// Redirect anyway
				goto('/auth/login');
			});
	}

	// Simple log when userName changes for debugging
	$effect(() => {
		console.log('Header userName updated:', userName);
	});
</script>

<header class="dashboard-header bg-cyan-800 p-4 pt-1 pb-2 text-white">
        <h1 class="">{$_('IoT Dashboard')}</h1>
        <div class="user-controls">
                <span class="welcome-user">{$_('Welcome')}, {userName}</span>
                <ThemeToggle />
                <button class="logout-button !px-3 !py-1" onclick={handleLogout}> {$_('Logout')} </button>
        </div>
</header>

<style>
	.dashboard-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		/* margin-bottom: 20px; */
	}

	.user-controls {
		display: flex;
		align-items: center;
		gap: 15px;
	}

	.welcome-user {
		font-weight: 500;
	}

	.logout-button {
		background-color: #f44336;
		color: white;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		font-size: 14px;
		transition: background-color 0.2s;
	}

	.logout-button:hover {
		background-color: #d32f2f;
	}
</style> -->

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

	let { userName } = $props();

	let mobileMenuOpen = $state(false);
	let announcementVisible = $state(true);

	function toggleMobileMenu() {
		mobileMenuOpen = !mobileMenuOpen;
	}

	function closeAnnouncement() {
		announcementVisible = false;
	}

	// Close mobile menu when clicking outside
	function handleClickOutside(event) {
		if (!event.target.closest('.mobile-menu') && !event.target.closest('.mobile-menu-btn')) {
			mobileMenuOpen = false;
		}
	}

	function handleLogout() {
		console.log('Logging out user:', userName);

		// Call the API endpoint for server-side logout
		fetch('/api/auth/logout', {
			method: 'POST'
		})
			.then(() => {
				console.log('Server logout successful');
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
	class="relative overflow-hidden border-b transition-colors duration-300 {getDarkMode()
		? 'border-green-500/20 bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-700'
		: 'border-green-500/20 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700'}"
>
	<!-- Animated background pattern -->
	<div class="absolute inset-0 opacity-10">
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
			href="/"
			class="mr-5 flex items-center gap-3 no-underline transition-transform hover:scale-105"
		>
			<!-- <div class="relative w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/30"> -->
			<img src={CropWatchLogo} alt="CropWatch Logo" class="h-10" width="40px" height="40px" />
			<!-- </div> -->
			<div class="text-2xl font-bold tracking-tight text-white transition-colors duration-300">
				CropWatch<sup><small>®</small></sup>
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
			<ThemeToggle />
			{#if page.data.session?.user}
				<Button variant="secondary" onclick={handleLogout}>{$_('Logout')}</Button>
			{:else}
				<Button variant="primary" href="/auth/login">{$_('Login')}</Button>
			{/if}
		</div>

		<!-- Mobile menu button -->
		<button
			onclick={toggleMobileMenu}
			class="mobile-menu-btn rounded-lg p-2 transition-colors lg:hidden {getDarkMode()
				? 'text-white hover:bg-white/10'
				: 'text-gray-700 hover:bg-gray-200/50'}"
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
</header>

<!-- Secondary Navigation/Breadcrumb Bar -->
<div
	class="border-b backdrop-blur-sm transition-colors duration-300 {getDarkMode()
		? 'border-slate-700/30 bg-slate-800/50'
		: 'border-gray-200/30 bg-white/50'}"
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
			<div class="text-sm">
				<a
					href="/"
					onclick={(event) => {
						event.preventDefault();
						$locale = $locale === 'ja' ? 'en' : 'ja';
					}}
					class="flex items-center gap-1 transition-colors hover:text-green-400 {getDarkMode()
						? 'text-slate-400'
						: 'text-gray-600'}"
				>
					<MaterialIcon name="globe" size="small" style="float:left" />
					{$locale === 'ja' ? 'English' : '日本語'}
				</a>
			</div>
			<!-- Quick actions -->
			<div class="hidden items-center gap-4 text-sm md:flex">
				<!-- <a
					href="/marketplace"
					class="flex items-center gap-1 transition-colors hover:text-green-400 {getDarkMode()
						? 'text-slate-400'
						: 'text-gray-600'}"
				>
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
						/>
					</svg>
					Marketplace
				</a>
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
				</a> -->
			</div>
		</div>
	</div>
</div>

<!-- Mobile Menu -->
{#if mobileMenuOpen}
	<div
		class="mobile-menu absolute top-full right-0 left-0 z-50 border-t text-slate-200 backdrop-blur-lg transition-colors duration-300 lg:hidden"
	>
		<div class="space-y-2 p-4">
			<a href="/app/dashboard" class="block rounded-lg px-4 py-3 text-slate-200 transition-colors">
				{$_('Dashboard')}
			</a>
			<a
				href="#pricing"
				class="block rounded-lg px-4 py-3 transition-colors {getDarkMode()
					? 'text-white/80 hover:bg-green-500/10 hover:text-green-400'
					: 'text-gray-700 hover:bg-green-500/10 hover:text-green-600'}"
			>
				{$_('Pricing')}
			</a>
			<a
				href="#devices"
				class="block rounded-lg px-4 py-3 transition-colors {getDarkMode()
					? 'text-white/80 hover:bg-green-500/10 hover:text-green-400'
					: 'text-gray-700 hover:bg-green-500/10 hover:text-green-600'}"
			>
				{$_('Devices')}
			</a>
			<a
				href="#resources"
				class="block rounded-lg px-4 py-3 transition-colors {getDarkMode()
					? 'text-white/80 hover:bg-green-500/10 hover:text-green-400'
					: 'text-gray-700 hover:bg-green-500/10 hover:text-green-600'}"
			>
				{$_('Resources')}
			</a>
			<a
				href="#about"
				class="block rounded-lg px-4 py-3 transition-colors {getDarkMode()
					? 'text-white/80 hover:bg-green-500/10 hover:text-green-400'
					: 'text-gray-700 hover:bg-green-500/10 hover:text-green-600'}"
			>
				{$_('About')}
			</a>
			<div class="space-y-2 border-t pt-2 {getDarkMode() ? 'border-white/10' : 'border-gray-200'}">
				<a
					href="/demo"
					class="block rounded-lg px-4 py-3 transition-colors {getDarkMode()
						? 'text-white/80 hover:bg-green-500/10 hover:text-green-400'
						: 'text-gray-700 hover:bg-green-500/10 hover:text-green-600'}"
				>
					{$_('Demo')}
				</a>
				<a
					href="/contact-us"
					class="block rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 px-4 py-3 text-center font-semibold text-white"
				>
					{$_('Get Started')}
				</a>
			</div>
		</div>
	</div>
{/if}

<style>
	@keyframes drift {
		0% {
			transform: translateX(0) translateY(0);
		}
		100% {
			transform: translateX(-60px) translateY(-60px);
		}
	}
</style>
