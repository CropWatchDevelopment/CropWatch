<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';

	let sessionId = '';

	onMount(() => {
		sessionId = $page.url.searchParams.get('session_id') || '';
	});
</script>

<svelte:head>
	<title>Payment Success - CropWatch</title>
</svelte:head>

<div class="container mx-auto px-4 py-8">
	<div class="mx-auto max-w-md text-center">
		<div class="mb-6 rounded border border-green-400 bg-green-100 px-4 py-3 text-green-700">
			<h1 class="mb-2 text-2xl font-bold">Payment Successful!</h1>
			<p>Your subscription has been created successfully.</p>
		</div>

		{#if sessionId}
			<div class="mb-6 rounded-lg bg-white p-6 shadow-md">
				<h2 class="mb-4 text-xl font-semibold">Manage Your Subscription</h2>
				<form
					method="POST"
					action="/app/account-settings/payment/add-subscription?/create-portal-session"
				>
					<input type="hidden" name="session_id" value={sessionId} />
					<button
						type="submit"
						class="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
					>
						Manage Subscription
					</button>
				</form>
			</div>
		{/if}

		<a
			href="/app/account-settings/payment"
			class="inline-block rounded-md bg-gray-600 px-4 py-2 text-white hover:bg-gray-700 focus:ring-2 focus:ring-gray-500 focus:outline-none"
		>
			Back to Payment Settings
		</a>
	</div>
</div>
