<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { _ } from 'svelte-i18n';
	// Get the email address from URL parameters, if available
	let email = $page.url.searchParams.get('email') || '';
</script>

<svelte:head>
	<title>{$_('Check Your Email')} | IoT Dashboard</title>
</svelte:head>

<!-- Professional Background Layer -->
<div class="check-email-background"></div>

<div
	class="bg-background-light/30 dark:bg-background-dark/30 relative z-10 flex min-h-screen items-center justify-center px-4 py-12 sm:px-6 lg:px-8"
>
	<div
		class="auth-panel bg-card-light/95 dark:bg-card-dark/95 w-full max-w-md space-y-8 rounded-xl border-2 border-white/40 p-8 shadow-2xl backdrop-blur-xl dark:border-blue-400/30"
	>
		<div class="text-center">
			<div
				class="bg-primary-light/20 dark:bg-primary-dark/20 mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="text-primary-light dark:text-primary-dark h-8 w-8"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
					/>
				</svg>
			</div>

			<h2 class="text-text-light dark:text-text-dark mb-2 text-2xl font-bold">
				{$_('Check your email')}
			</h2>

			<div class="text-text-light/80 dark:text-text-dark/80 mb-8">
				{#if email}
					<p>
						{$_("We've sent a verification link to")} <strong class="font-medium">{email}</strong>
					</p>
				{:else}
					<p>{$_("We've sent a verification link to your email address")}</p>
				{/if}
				<p class="mt-2">
					{$_('Click the link in the email to verify your account and complete your registration.')}
				</p>
			</div>

			<div
				class="mb-8 rounded-md bg-amber-100 p-4 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200"
			>
				<p class="text-sm">
					⚠️ <strong>{$_('Important')}:</strong>
					{$_('Please open the verification link on this same device you used to register.')}
				</p>
			</div>

			<div class="space-y-4">
				<div class="text-text-light/70 dark:text-text-dark/70 text-sm">
					<p>{$_("Didn't receive an email?")}</p>
					<p>
						{$_('Check your spam folder or')}
						<button class="text-primary-light dark:text-primary-dark hover:underline"
							>{$_('request a new verification email')}</button
						>
					</p>
				</div>

				<div class="border-t border-gray-200 pt-4 dark:border-gray-700">
					<button class="auth-primary-button w-full" on:click={() => goto('/auth/login')}>
						{$_('Return to Login')}
					</button>
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	.check-email-background {
		position: fixed;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
		z-index: 1;

		/* Rich corporate gradient - matching other auth pages */
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
	:global(.dark) .check-email-background {
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
