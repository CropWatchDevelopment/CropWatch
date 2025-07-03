<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { success, error as toastError } from '$lib/stores/toast.svelte';
	import GoogleAuthLogin from './GoogleAuthLogin.svelte';
	import DiscordAuthLogin from './DiscordAuthLogin.svelte';
	import { _ } from 'svelte-i18n';

	// Form state
	let email = $state('');
	let password = $state('');
	let loading = $state(false);
	let submitting = $state(false);
	let error = $state<string | null>(null);
	let successMessage = $state<string | null>(null);

	// Check if already logged in
	let isLoggedIn = $state(false);

	onMount(async () => {
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
	class="bg-background-light dark:bg-background-dark flex min-h-screen items-center justify-center p-5 transition-colors duration-300"
>
	<div
		class="bg-card-light dark:bg-card-dark text-text-light dark:text-text-dark w-full max-w-md rounded-lg p-6 shadow-md"
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
					<input
						type="password"
						id="password"
						bind:value={password}
						required
						placeholder="🔒 {$_('Enter your password')}"
						disabled={loading}
						autocomplete="current-password"
						class="text-text-light dark:text-text-dark focus:ring-primary w-full rounded-md border border-gray-300
                               bg-white px-3 py-2 focus:border-transparent
                               focus:ring-2 focus:outline-none dark:border-gray-700 dark:bg-gray-800"
					/>
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
				<div class="flex w-full flex-col items-center gap-2 md:flex-row md:justify-between">
					<GoogleAuthLogin />
					<DiscordAuthLogin />
				</div>
			</form>

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
					class="bg-default hover:bg-primary-hover w-full rounded border px-4 py-2 font-medium text-white transition-colors duration-200 disabled:opacity-50"
					disabled={loading}
					onclick={() => goto('/auth/forgot-password')}
				>
					❓ {$_('Forgot Password')}
				</button>
			</div>
		{/if}
	</div>
</div>
