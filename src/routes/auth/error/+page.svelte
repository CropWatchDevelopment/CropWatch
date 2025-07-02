<script lang="ts">
	import { goto } from '$app/navigation';
	import { _ } from 'svelte-i18n';
</script>

<svelte:head>
	<title>{$_('Authentication Error')} | CropWatch</title>
</svelte:head>

<div
	class="bg-background-light dark:bg-background-dark flex min-h-screen items-center justify-center p-5 transition-colors duration-300"
>
	<div
		class="bg-card-light dark:bg-card-dark text-text-light dark:text-text-dark w-full max-w-md rounded-lg p-8 shadow-md"
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
				<button
					class="bg-primary hover:bg-primary-hover flex-1 rounded px-4 py-2 font-medium text-white transition-colors duration-200"
					on:click={() => goto('/auth/login')}
				>
					{$_('Go to Login')}
				</button>

				<button
					class="flex-1 rounded border border-gray-300 px-4 py-2 font-medium transition-colors duration-200 hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-800"
					on:click={() => (window.location.href = 'https://cropwatch.io/contact-us')}
				>
					{$_('Contact Support')}
				</button>
			</div>
		</div>
	</div>
</div>
