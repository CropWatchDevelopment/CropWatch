<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { success, error as toastError } from '$lib/stores/toast.svelte';
	import GoogleAuthLogin from './GoogleAuthLogin.svelte';
	import DiscordAuthLogin from './DiscordAuthLogin.svelte';
	import { _ } from 'svelte-i18n';

	let { data } = $props();

	let { supabase } = $derived(data);

	// Form state
	let email = $state('');
	let password = $state('');
	let loading = $state(false);
	let submitting = $state(false);
	let error = $state<string | null>(null);
	let successMessage = $state<string | null>(null);

	// Toggle for password visibility
	let showPassword = $state(false);

	// Check if already logged in
	let isLoggedIn = $state(false);

	// Random background image selection
	const backgroundImages = [
		'/login-background-images/greenhouse.jpg',
		'/login-background-images/field1.jpg',
		'/login-background-images/field2.jpg',
		'/login-background-images/beach.jpg'
	];

	let selectedBackground = $state('');

	// Select random background on component mount
	onMount(async () => {
		// Select random background image
		const randomIndex = Math.floor(Math.random() * backgroundImages.length);
		selectedBackground = backgroundImages[randomIndex];

		// Check if user has just registered
		if ($page.url.searchParams.get('registered') === 'true') {
			success('Registration successful! You can now log in.');
		}

		// Check if user is already logged in
		try {
			const response = await fetch('/api/auth/status');
			const data = await response.json();
			isLoggedIn = data.authenticated;

			if (isLoggedIn) {
				successMessage = $_('You are already logged in');
				//console.log('Login page: User is logged in, showing success message');
				// Add a button for manual navigation rather than automatic redirect
				// This prevents potential redirect loops
			}
		} catch (err) {
			console.error($_('loginErrorMessage'), err);
			// Ignore error, assume not logged in
			isLoggedIn = false;
		}
	});

	// Handle login form submission
	async function handleSubmit(event: Event) {
		if (submitting) return;
		event.preventDefault();
		submitting = true;
		loading = true;
		error = null;

		try {
			const response = await fetch('/api/auth/login', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ email, password })
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || 'Login failed');
			}

			// Immediately redirect to dashboard - no delay, no success message
			// window.location.href = '/app/dashboard';
			successMessage = $_('Login successful! Redirecting to dashboard...');
			success(successMessage);
			goto('/app/dashboard');
		} catch (err) {
			error = err instanceof Error ? err.message : 'Login failed. Please try again.';
			loading = false;
			submitting = false;
			toastError($_('loginErrorMessage'));
		}
	}
</script>

<svelte:head>
	<title>{$_('Login')} | {$_('IoT Dashboard')}</title>
</svelte:head>

<div
	class="bg-background-light dark:bg-background-dark relative flex h-screen items-center justify-center overflow-hidden p-5 transition-colors duration-300"
	style="background-image: url('{selectedBackground}'); background-size: cover; background-position: center; background-repeat: no-repeat;"
>
	<!-- Background overlay for better readability -->
	<div class="absolute inset-0 bg-black/20 dark:bg-black/40"></div>

	<!-- Content container with higher z-index -->
	<div class="relative z-10 w-full max-w-md">
		<div
			class="bg-card-light/95 dark:bg-card-dark/95 text-text-light dark:text-text-dark rounded-lg border border-white/20 p-6 shadow-xl backdrop-blur-lg dark:border-gray-700/50"
		>
			<h1 class="mb-6 text-center text-2xl font-bold">{$_('Login')}</h1>

			<!-- {#if error}
			<div
				class="mb-4 rounded-md bg-red-100 p-3 text-center text-red-700 dark:bg-red-900/30 dark:text-red-400"
			>
				{error}
			</div>
		{/if} -->

			{#if successMessage}
				<div
					class="mb-4 rounded-md bg-green-100 p-4 text-center text-green-700 dark:bg-green-900/30 dark:text-green-400"
				>
					<p>{successMessage}</p>
					<button
						class="bg-primary hover:bg-primary-hover mt-4 w-full rounded px-4 py-2 font-medium text-white transition-colors duration-200"
						onclick={() => goto('/app/dashboard')}
					>
						{$_('Go to Dashboard')}
					</button>
				</div>
			{:else if !isLoggedIn}
				<form onsubmit={handleSubmit} class="space-y-4">
					<div>
						<label for="email" class="mb-1 block text-sm font-medium">{$_('Email')}</label>
						<input
							type="email"
							id="email"
							bind:value={email}
							required
							autocomplete="email"
							placeholder="✉️ {$_('Enter your email')}"
							disabled={loading}
							class="text-text-light dark:text-text-dark focus:ring-primary w-full rounded-md border border-gray-300
                               bg-white px-3 py-2 focus:border-transparent
                               focus:ring-2 focus:outline-none dark:border-gray-700 dark:bg-gray-800"
						/>
					</div>

					<div>
						<label for="password" class="mb-1 block text-sm font-medium">{$_('Password')}</label>
						<div class="relative">
							<input
								id="password"
								type={showPassword ? 'text' : 'password'}
								bind:value={password}
								required
								placeholder="🔒 {$_('Enter your password')}"
								disabled={loading}
								autocomplete="current-password"
								class="text-text-light dark:text-text-dark focus:ring-primary w-full rounded-md border border-gray-300 bg-white px-3 py-2 pr-10 focus:border-transparent focus:ring-2 focus:outline-none dark:border-gray-700 dark:bg-gray-800"
							/>
							<button
								type="button"
								class="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 transition-colors hover:text-gray-700 focus:outline-none dark:text-gray-400 dark:hover:text-gray-200"
								onclick={() => (showPassword = !showPassword)}
								aria-label={showPassword ? $_('Hide password') : $_('Show password')}
								title={showPassword ? $_('Hide password') : $_('Show password')}
							>
								{#if showPassword}
									<!-- Eye off icon -->
									<svg
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
										class="h-5 w-5"
									>
										<path
											d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-10-8-10-8a21.77 21.77 0 0 1 5.17-7.19m3.11-1.6A10.94 10.94 0 0 1 12 4c7 0 10 8 10 8a21.83 21.83 0 0 1-2.16 3.19"
										/>
										<path d="M1 1l22 22" />
									</svg>
								{:else}
									<!-- Eye icon -->
									<svg
										xmlns="http://www.w3.org/2000/svg"
										fill="none"
										viewBox="0 0 24 24"
										stroke-width="2"
										stroke="currentColor"
										stroke-linecap="round"
										stroke-linejoin="round"
										class="h-5 w-5"
									>
										<path d="M1 12s3-8 11-8 11 8 11 8-3 8-11 8-11-8-11-8Z" />
										<circle cx="12" cy="12" r="3" />
									</svg>
								{/if}
							</button>
						</div>
					</div>

					<div>
						<button
							type="submit"
							class="bg-primary hover:bg-primary-hover w-full rounded px-4 py-2 font-medium text-white transition-colors duration-200 disabled:opacity-50"
							disabled={submitting}
						>
							{submitting ? $_('Logging in...') : `🔑 ${$_('Login')}`}
						</button>
					</div>
				</form>
				<div class="mt-2 flex w-full flex-col items-center gap-2 md:flex-row md:justify-between">
					<GoogleAuthLogin {data} />
					<DiscordAuthLogin {data} />
				</div>

				<div
					class="mt-6 flex flex-col gap-2 border-t border-gray-200 pt-4 text-center text-sm text-gray-600 dark:border-gray-700 dark:text-gray-400"
				>
					<button
						type="submit"
						class="hover:bg-slate-600-hover w-full rounded bg-slate-500 px-4 py-2 font-medium text-white transition-colors duration-200 disabled:opacity-50"
						disabled={loading}
						onclick={() => goto('/api/')}
					>
						🌐 {$_('Go to API')}
					</button>

					<button
						type="submit"
						class="bg-info hover:bg-primary-hover w-full rounded px-4 py-2 font-medium text-white transition-colors duration-200 disabled:opacity-50"
						disabled={loading}
						onclick={() => goto('/auth/register')}
					>
						🚀 {$_('Create an account')}
					</button>

					<button
						type="submit"
						class="bg-warning hover:bg-primary-hover w-full rounded border px-4 py-2 font-medium text-black shadow-sm transition-colors duration-200 disabled:opacity-50"
						disabled={loading}
						onclick={() => goto('/auth/forgot-password')}
					>
						❓ {$_('Forgot Password')}
					</button>
				</div>
			{/if}
		</div>
	</div>
</div>
