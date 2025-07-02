<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { success, error, warning, info, neutral } from '$lib/stores/toast.svelte';
	import { _ } from 'svelte-i18n';

	let { data } = $props();
	let form = $derived(data.form);

	let email = $state('');
	let loading = $state(false);

	function handleSubmit() {
		return () => {
			loading = true;

			return async ({ result, update }) => {
				loading = false;
				await update();
				if (result.status === 200) {
					success($_('Password reset link sent to your email.'));
					goto('/auth/check-email');
				} else {
					error($_(result.error));
				}
			};
		};
	}
</script>

<svelte:head>
	<title>{$_('Forgot Password')} | CropWatch</title>
</svelte:head>

<div
	class="bg-background-light dark:bg-background-dark flex min-h-screen items-center justify-center p-5 transition-colors duration-300"
>
	<div
		class="bg-card-light dark:bg-card-dark text-text-light dark:text-text-dark w-full max-w-md rounded-lg p-6 shadow-md"
	>
		<h1 class="mb-6 text-center text-2xl font-bold">{$_('Reset Password')}</h1>

		{#if form?.success}
			<div
				class="mb-4 rounded-md bg-green-100 p-4 text-center text-green-700 dark:bg-green-900/30 dark:text-green-400"
			>
				<p>
					{$_('If an account exists with the email')} <strong>{form.email}</strong>, {$_(
						"you'll receive a password reset link shortly."
					)}
				</p>

				<a
					href="/auth/login"
					class="mt-4 inline-block text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
				>
					← {$_('Back to login')}
				</a>
			</div>
		{:else}
			<p class="mb-6 text-sm text-gray-600 dark:text-gray-400">
				{$_("Enter your email address and we'll send you a link to reset your password.")}
			</p>

			<form method="POST" use:enhance={handleSubmit()} class="space-y-4">
				<div>
					<label for="email" class="mb-1 block text-sm font-medium">{$_('Email address')}</label>
					<input
						type="email"
						id="email"
						name="email"
						bind:value={email}
						autocomplete="email"
						required
						placeholder="✉️ {$_('Enter your email')}"
						disabled={loading}
						class="text-text-light dark:text-text-dark focus:ring-primary w-full rounded-md border border-gray-300
                   bg-white px-3 py-2 focus:border-transparent
                   focus:ring-2 focus:outline-none dark:border-gray-700 dark:bg-gray-800"
					/>
				</div>

				{#if form?.error}
					<div
						class="mb-4 rounded-md bg-red-100 p-3 text-center text-red-700 dark:bg-red-900/30 dark:text-red-400"
					>
						{$_(form.error)}
					</div>
				{/if}

				<div>
					<button
						type="submit"
						class="bg-primary hover:bg-primary-hover w-full rounded px-4 py-2 font-medium text-white transition-colors duration-200 disabled:opacity-50"
						disabled={loading}
					>
						{loading ? $_('Sending...') : $_('Send reset link')}
					</button>
				</div>

				<div class="mt-4 text-center">
					<a
						href="/auth/login"
						class="text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
					>
						{$_('Back to login')}
					</a>
				</div>
			</form>
		{/if}
	</div>
</div>
