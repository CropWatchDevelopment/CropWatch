<script lang="ts">
	import { goto } from '$app/navigation';
	import { _ } from 'svelte-i18n';
</script>

<svelte:head>
	<title>{$_('Authentication Error')} | CropWatch</title>
</svelte:head>

<!-- Professional Background Layer -->
<div class="auth-error-background"></div>

<div
	class="bg-background-light/30 dark:bg-background-dark/30 relative z-10 flex min-h-screen items-center justify-center p-5 transition-colors duration-300"
>
	<div
		class="auth-panel bg-card-light/95 dark:bg-card-dark/95 text-text-light dark:text-text-dark w-full max-w-md rounded-lg border-2 border-white/40 p-8 shadow-2xl backdrop-blur-xl dark:border-blue-400/30"
	>
		<div class="flex flex-col items-center">
			<div class="mb-4 text-red-500">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-16 w-16"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
					/>
				</svg>
			</div>

			<h1 class="mb-4 text-center text-2xl font-bold">{$_('Authentication Error')}</h1>

			<p class="mb-6 text-center">
				{$_(
					'There was a problem with your authentication request. Please try signing in again on the login page. If you continue to experience issues, please contact our support team for additional help.'
				)}
			</p>

			<div class="flex w-full flex-col gap-4 sm:flex-row">
				<button class="auth-primary-button w-full sm:flex-1" on:click={() => goto('/auth/login')}>
					{$_('Go to Login')}
				</button>

				<button
					class="auth-secondary-button w-full sm:flex-1"
					on:click={() => (window.location.href = 'https://cropwatch.io/contact-us')}
				>
					{$_('Contact Support')}
				</button>
			</div>
		</div>
	</div>
</div>

<style>
	.auth-error-background {
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
	:global(.dark) .auth-error-background {
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
