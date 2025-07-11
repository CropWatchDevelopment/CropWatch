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

<!-- Geometric Background Layer -->
<div class="geometric-background"></div>

<div
	class="bg-background-light/30 dark:bg-background-dark/30 relative z-10 flex h-screen items-center justify-center p-5 transition-colors duration-300"
>
	<div
		class="bg-card-light/95 dark:bg-card-dark/95 text-text-light dark:text-text-dark w-full max-w-md rounded-lg border-2 border-white/40 p-6 shadow-2xl backdrop-blur-xl dark:border-blue-400/30"
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

<style>
	.geometric-background {
		position: fixed;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
		z-index: 1;

		/* Rich corporate gradient - more vibrant blues */
		background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 25%, #2563eb 75%, #1d4ed8 100%);

		/* Ensure it's visible */
		opacity: 1;

		/* Professional corporate overlay patterns */
		background-image: 
			/* Corporate highlight orbs */
			radial-gradient(circle at 15% 25%, rgba(59, 130, 246, 0.3) 0%, transparent 50%),
			radial-gradient(circle at 85% 75%, rgba(139, 92, 246, 0.25) 0%, transparent 45%),
			radial-gradient(circle at 50% 10%, rgba(37, 99, 235, 0.2) 0%, transparent 40%),
			/* Subtle business texture */
				radial-gradient(circle at 25% 80%, rgba(255, 255, 255, 0.08) 0%, transparent 35%),
			radial-gradient(circle at 75% 20%, rgba(255, 255, 255, 0.06) 0%, transparent 30%);

		background-size:
			1000px 1000px,
			800px 800px,
			600px 600px,
			400px 400px,
			500px 500px;

		background-position:
			0 0,
			100px 100px,
			300px 200px,
			500px 300px,
			200px 400px;

		/* Subtle floating animation */
		animation: floatBackground 20s ease-in-out infinite;
	}

	@keyframes floatBackground {
		0%,
		100% {
			transform: translateX(0) translateY(0);
		}
		25% {
			transform: translateX(-20px) translateY(-10px);
		}
		50% {
			transform: translateX(10px) translateY(-20px);
		}
		75% {
			transform: translateX(-10px) translateY(10px);
		}
	}

	/* Dark mode - rich professional dark gradient */
	:global(.dark) .geometric-background {
		background: linear-gradient(135deg, #1e1b4b 0%, #312e81 25%, #1e40af 75%, #1e3a8a 100%);

		background-image: 
			/* Dark mode corporate highlights */
			radial-gradient(circle at 15% 25%, rgba(59, 130, 246, 0.4) 0%, transparent 50%),
			radial-gradient(circle at 85% 75%, rgba(139, 92, 246, 0.35) 0%, transparent 45%),
			radial-gradient(circle at 50% 10%, rgba(37, 99, 235, 0.3) 0%, transparent 40%),
			/* Professional dark texture */
				radial-gradient(circle at 25% 80%, rgba(255, 255, 255, 0.04) 0%, transparent 35%),
			radial-gradient(circle at 75% 20%, rgba(255, 255, 255, 0.03) 0%, transparent 30%);
	}
</style>
