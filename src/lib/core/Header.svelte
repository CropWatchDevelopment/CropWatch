<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import CWButton from '$lib/components/CWButton.svelte';
	import CWDialog from '$lib/components/CWDialog.svelte';
	import logo from '$lib/images/cropwatch_static.svg';
	import LOCK_ICON from '$lib/images/icons/lock.svg';
	import LOGOUT_ICON from '$lib/images/icons/logout.svg';
	import type { AppState } from '$lib/Interfaces/appState.interface';
	import { getContext } from 'svelte';
	import { getToastContext } from '$lib/components/toast';
	import Avatar from '$lib/components/Avatar.svelte';
	import COMPARE_ARROWS_ICON from '$lib/images/icons/compare_arrows.svg';
	import GATEWAY_ICON from '$lib/images/icons/router.svg';
	import REPORT_ICON from '$lib/images/icons/picture_as_pdf.svg';
	import SETTINGS_ICON from '$lib/images/icons/settings.svg';
	import type { SupabaseClient } from '@supabase/supabase-js';

	const toast = getToastContext();

	const getAppState = getContext<() => AppState>('appState');
	let appState = $derived(getAppState());

	let { isLoggedIn, profile, userEmail, supabase } = $props<{
		isLoggedIn: boolean;
		profile: AppState['profile'];
		userEmail?: string | null;
		supabase: SupabaseClient;
	}>();

	const activeProfile = $derived(profile ?? appState.profile);
	const activeEmail = $derived(userEmail ?? appState.userEmail ?? null);
	let avatarUrl = $derived(activeProfile?.avatar_url ?? '');
	let userInitials = $derived.by(() => {
		const name = activeProfile?.full_name?.trim();
		if (name) {
			const parts = name.split(/\s+/).filter(Boolean);
			const first = parts[0]?.[0] ?? '';
			const second = parts[1]?.[0] ?? '';
			const compact = `${first}${second}`.trim();
			if (compact) return compact.toUpperCase();
		}

		const emailFallback = activeEmail?.[0] ?? '';
		return emailFallback ? emailFallback.toUpperCase() : '?';
	});

	let accountMenuOpen = $state(false);
	let accountMenuRef: HTMLDivElement | null = $state(null);

	function toggleAccountMenu() {
		accountMenuOpen = !accountMenuOpen;
	}

	function closeAccountMenu() {
		accountMenuOpen = false;
	}

	function handleClickOutside(event: MouseEvent) {
		if (accountMenuRef && !accountMenuRef.contains(event.target as Node)) {
			closeAccountMenu();
		}
	}

	$effect(() => {
		if (accountMenuOpen) {
			document.addEventListener('click', handleClickOutside);
			return () => document.removeEventListener('click', handleClickOutside);
		}
	});

	function toggleSidebar() {
		if (typeof window === 'undefined') return;
		window.dispatchEvent(new CustomEvent('sidebar:toggle'));
	}

	async function logout() {
		loggingOutLoading = true;
		try {
			const res = await fetch(resolve('/api/public/logout'), {
				method: 'GET',
				credentials: 'include'
			});
			if (!res.ok) throw new Error(`Logout failed with ${res.status}`);
			await invalidateAll();
			goto(resolve('/auth'));
			logoutDialog = false;
			loggingOutLoading = false;
			appState.isLoggedIn = false;
			appState.profile = null;
			appState.userEmail = null;
			toast.success('You have been logged out.', { title: 'Logged Out' });
		} catch (error) {
			console.error('Logout failed:', error);
			loggingOutLoading = false;
			toast.error('Logout failed. Please try again.', { title: 'Error' });
		}
	}

	let logoutDialog: boolean = $state<boolean>(false);
	let loggingOutLoading: boolean = $state<boolean>(false);
</script>

<header class="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/90 backdrop-blur-md">
	<div class="flex items-center justify-between px-6 py-3">
		<!-- Left: Mobile toggle + Logo -->
		<div class="flex items-center gap-4">
			<button
				type="button"
				onclick={toggleSidebar}
				class="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700 bg-slate-900/50 text-slate-300 transition hover:border-sky-500/50 hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 md:hidden"
				aria-label="Toggle sidebar"
			>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-5 w-5">
					<path d="M4 7h16M4 12h16M4 17h16" stroke-linecap="round" />
				</svg>
			</button>

			<a href="/" class="flex items-center gap-3 transition hover:opacity-80">
				<img src={logo} alt="Company Tree Logo" class="h-8 w-8" />
				<span class="hidden text-lg font-semibold tracking-tight text-white sm:inline"
					>CropWatch</span
				>
			</a>
		</div>

		<!-- Center: Navigation -->
		<nav class="hidden md:flex">
			<ul class="flex items-center gap-1">
				<li>
					<a
						href={resolve('/')}
						class="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all {page
							.url.pathname === '/'
							? 'bg-sky-500/10 text-sky-400 ring-1 ring-sky-500/30'
							: 'text-slate-400 hover:bg-slate-800 hover:text-white'}"
					>
						<svg
							class="h-4 w-4"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							stroke-width="2"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
							/>
						</svg>
						Home
					</a>
				</li>
				<li>
					<a
						href={resolve('/locations')}
						class="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all {page.url.pathname.startsWith(
							'/locations'
						)
							? 'bg-sky-500/10 text-sky-400 ring-1 ring-sky-500/30'
							: 'text-slate-400 hover:bg-slate-800 hover:text-white'}"
					>
						<svg
							class="h-4 w-4"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							stroke-width="2"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
							/>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
							/>
						</svg>
						Locations
					</a>
				</li>
				<li>
					<a
						href="/rules"
						class="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all {page.url.pathname.startsWith(
							'/rules'
						)
							? 'bg-sky-500/10 text-sky-400 ring-1 ring-sky-500/30'
							: 'text-slate-400 hover:bg-slate-800 hover:text-white'}"
					>
						<svg
							class="h-4 w-4"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							stroke-width="2"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
							/>
						</svg>
						Rules
					</a>
				</li>
				<li>
					<a
						href="/reports"
						class="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all {page.url.pathname.startsWith(
							'/reports'
						)
							? 'bg-sky-500/10 text-sky-400 ring-1 ring-sky-500/30'
							: 'text-slate-400 hover:bg-slate-800 hover:text-white'}"
					>
						<img src={REPORT_ICON} alt="Report Icon" class="h-4 w-4" />
						Reports
					</a>
				</li>
				<li>
					<a
						href="/gateways"
						class="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all {page.url.pathname.startsWith(
							'/gateways'
						)
							? 'bg-sky-500/10 text-sky-400 ring-1 ring-sky-500/30'
							: 'text-slate-400 hover:bg-slate-800 hover:text-white'}"
					>
						<img src={GATEWAY_ICON} alt="Gateway Icon" class="h-4 w-4" />
						Gateways
					</a>
				</li>
				<li>
					<a
						href="/compare"
						class="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all {page.url.pathname.startsWith(
							'/compare'
						)
							? 'bg-sky-500/10 text-sky-400 ring-1 ring-sky-500/30'
							: 'text-slate-400 hover:bg-slate-800 hover:text-white'}"
					>
						<img src={COMPARE_ARROWS_ICON} alt="Compare Icon" class="h-4 w-4" />
						Compare
					</a>
				</li>
			</ul>
		</nav>

		<!-- Right: Actions -->
		{#if isLoggedIn}
			<div class="flex items-center gap-3">
				<!-- Account Menu Dropdown -->
				<div class="relative" bind:this={accountMenuRef}>
					<CWButton variant="secondary" size="sm" onclick={toggleAccountMenu}>
						<div class="h-9 w-9 overflow-hidden rounded-full bg-slate-800 ring-1 ring-slate-700">
							<Avatar size={36} avatarUrl={avatarUrl || null} initials={userInitials} {supabase} />
						</div>
						<div class="flex flex-col ml-3 text-left">
							<p class="text-md">{userEmail}</p>
							<p class="text-center">Administrator</p>
						</div>
					</CWButton>

					{#if accountMenuOpen}
						<div
							class="absolute right-0 top-full z-50 mt-2 w-48 origin-top-right rounded-xl border border-slate-700 bg-slate-800 py-1 shadow-lg ring-1 ring-black ring-opacity-5"
						>
							<a
								href={resolve('/account')}
								onclick={closeAccountMenu}
								class="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-300 transition hover:bg-slate-700 hover:text-white"
							>
								<img src={SETTINGS_ICON} alt="Settings Icon" class="h-4 w-4" />
								Account Settings
							</a>
							<CWButton variant="secondary" class="w-full mt-5" size="sm" onclick={() => (logoutDialog = true)}>
								<svg
									class="h-4 w-4"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
									stroke-width="2"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
									/>
								</svg>
								<span class="hidden sm:inline">Log Out</span>
							</CWButton>
						</div>
					{/if}
				</div>
			</div>
		{/if}
	</div>
</header>

<CWDialog
	open={logoutDialog}
	title="Log out"
	showCloseButton={true}
	closeOnBackdrop={true}
	closeOnEscape={true}
>
	<p class="mb-5">Are you sure you want to log out of your account?</p>

	<div class="flex justify-end gap-5">
		<button
			onclick={() => (logoutDialog = false)}
			class="inline-flex items-center gap-2 rounded-xl border border-slate-600 bg-slate-700/60 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-700 hover:bg-slate-800"
		>
			<img src={LOCK_ICON} alt="Log out of account" class="h-4 w-4" />
			Stay Logged in
		</button>

		<CWButton variant="danger" loading={loggingOutLoading} onclick={() => logout()}>
			<img src={LOGOUT_ICON} alt="Log out of account" class="h-4 w-4" />
			Log Out
		</CWButton>
	</div>
</CWDialog>
