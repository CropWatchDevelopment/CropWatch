<script lang="ts">
	import { goto } from '$app/navigation';
	import { _ } from 'svelte-i18n';
</script>

<svelte:head>
	<title>{$_('Page Not Found')} | CropWatch</title>
</svelte:head>

<div
	class="bg-background-light dark:bg-background-dark flex min-h-screen items-center justify-center p-5 transition-colors duration-300"
>
	<div
		class="bg-card-light dark:bg-card-dark text-text-light dark:text-text-dark w-full max-w-md rounded-lg p-8 shadow-md"
	>
		<div class="flex flex-col items-center">
			<div class="mb-4 text-gray-500 dark:text-gray-400">
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
						d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
					/>
				</svg>
			</div>

			<h1 class="mb-2 text-center text-4xl font-bold">404</h1>
			<h2 class="mb-4 text-center text-xl font-semibold">{$_('Page Not Found')}</h2>

			<p class="mb-6 text-center text-gray-600 dark:text-gray-400">
				{$_(
					'The page you are looking for does not exist. It might have been moved, deleted, or you entered the wrong URL.'
				)}
			</p>

			<div class="flex w-full flex-col gap-4 sm:flex-row">
				<button
					class="bg-primary hover:bg-primary-hover flex-1 rounded px-4 py-2 font-medium text-white transition-colors duration-200"
					on:click={() => goto('/app/dashboard')}
				>
					🏠 {$_('Go to Dashboard')}
				</button>

				<button
					class="flex-1 rounded border border-gray-300 px-4 py-2 font-medium transition-colors duration-200 hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-800"
					on:click={() => goto('/')}
				>
					🔙 {$_('Go Home')}
				</button>
			</div>

			<div class="mt-4 w-full">
				<button
					class="bg-info hover:bg-primary-hover w-full rounded px-4 py-2 font-medium text-white transition-colors duration-200"
					on:click={() => goto('/auth/login')}
				>
					🔑 {$_('Login')}
				</button>
			</div>
		</div>
	</div>
</div>
