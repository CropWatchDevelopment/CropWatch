<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	
	// Get the email address from URL parameters, if available
	let email = $page.url.searchParams.get('email') || '';
</script>

<svelte:head>
	<title>Check Your Email | IoT Dashboard</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark py-12 px-4 sm:px-6 lg:px-8">
	<div class="max-w-md w-full space-y-8 bg-card-light dark:bg-card-dark p-8 rounded-xl shadow-md">
		<div class="text-center">
			<div class="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-primary-light/20 dark:bg-primary-dark/20 mb-6">
				<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-primary-light dark:text-primary-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
				</svg>
			</div>
			
			<h2 class="text-2xl font-bold text-text-light dark:text-text-dark mb-2">
				Check your email
			</h2>
			
			<div class="text-text-light/80 dark:text-text-dark/80 mb-8">
				{#if email}
					<p>We've sent a verification link to <strong class="font-medium">{email}</strong></p>
				{:else}
					<p>We've sent a verification link to your email address</p>
				{/if}
				<p class="mt-2">Click the link in the email to verify your account and complete your registration.</p>
			</div>
			
			<div class="bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 rounded-md p-4 mb-8">
				<p class="text-sm">⚠️ <strong>Important:</strong> Please open the verification link on this same device you used to register.</p>
			</div>
			
			<div class="space-y-4">
				<div class="text-sm text-text-light/70 dark:text-text-dark/70">
					<p>Didn't receive an email?</p>
					<p>Check your spam folder or <button class="text-primary-light dark:text-primary-dark hover:underline">request a new verification email</button></p>
				</div>
				
				<div class="border-t border-gray-200 dark:border-gray-700 pt-4">
					<button 
						class="block w-full text-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-light dark:bg-primary-dark hover:bg-primary-light/90 dark:hover:bg-primary-dark/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-light dark:focus:ring-primary-dark"
						on:click={() => goto('/auth/login')}
					>
						Return to Login
					</button>
				</div>
			</div>
		</div>
	</div>
</div>