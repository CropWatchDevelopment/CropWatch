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

<div
	class="bg-background-light dark:bg-background-dark flex min-h-screen items-center justify-center px-4 py-12 sm:px-6 lg:px-8"
>
	<div class="bg-card-light dark:bg-card-dark w-full max-w-md space-y-8 rounded-xl p-8 shadow-md">
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
					<button
						class="bg-primary-light dark:bg-primary-dark hover:bg-primary-light/90 dark:hover:bg-primary-dark/90 focus:ring-primary-light dark:focus:ring-primary-dark block w-full rounded-md border border-transparent px-4 py-2 text-center text-sm font-medium text-white shadow-sm focus:ring-2 focus:ring-offset-2 focus:outline-none"
						on:click={() => goto('/auth/login')}
					>
						{$_('Return to Login')}
					</button>
				</div>
			</div>
		</div>
	</div>
</div>
