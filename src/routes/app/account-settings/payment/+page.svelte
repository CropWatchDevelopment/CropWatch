<script lang="ts">
	import { onMount } from 'svelte';
	import { loadStripe } from '@stripe/stripe-js';
	import type { Stripe, StripeElements, StripeCardElement } from '@stripe/stripe-js';
	import { PUBLIC_STRIPE_PUBLISHABLE_KEY } from '$env/static/public';
	import { getDarkMode } from '$lib/components/theme/theme.svelte';

	// Replace with your actual Stripe publishable key
	const STRIPE_PUBLISHABLE_KEY = PUBLIC_STRIPE_PUBLISHABLE_KEY;

	let stripe: Stripe | null = null;
	let elements: StripeElements | null = null;
	let cardElement: StripeCardElement | null = null;
	let cardContainer: HTMLElement;
	let processing = false;
	let error = '';
	let success = false;
	let cardholderName = '';
	let email = '';

	// Subscription management variables
	let subscriptions = [
		{
			id: 'sub_1234567890',
			name: 'CropWatch Pro Plan',
			status: 'active',
			amount: 29.99,
			currency: 'USD',
			interval: 'month',
			current_period_end: '2025-08-04',
			assignedDevEui: ''
		},
		{
			id: 'sub_09234544321',
			name: 'CropWatch Premium Plan',
			status: 'paused',
			amount: 49.99,
			currency: 'USD',
			interval: 'month',
			current_period_end: '2025-08-04',
			assignedDevEui: ''
		},
		{
			id: 'sub_093245654321',
			name: 'CropWatch Premium Plan',
			status: 'Canceled',
			amount: 49.99,
			currency: 'USD',
			interval: 'month',
			current_period_end: '2025-08-04',
			assignedDevEui: ''
		},
		{
			id: 'sub_0987654321',
			name: 'CropWatch Premium Plan',
			status: 'active',
			amount: 49.99,
			currency: 'USD',
			interval: 'month',
			current_period_end: '2025-08-04',
			assignedDevEui: ''
		}
	];

	// Mock device EUI options
	let deviceEuis = ['DEV-001-ABC123', 'DEV-002-DEF456', 'DEV-003-GHI789', 'DEV-004-JKL012'];

	function viewAccountHistory(subscriptionId: string) {
		// Open Stripe customer portal or billing history
		window.open(`https://billing.stripe.com/p/session/${subscriptionId}`, '_blank');
	}

	async function cancelSubscription(subscriptionId: string) {
		if (
			!confirm('Are you sure you want to cancel this subscription? This action cannot be undone.')
		) {
			return;
		}

		try {
			// Simulate API call to cancel subscription
			await new Promise((resolve) => setTimeout(resolve, 1000));

			// Remove subscription from list
			subscriptions = subscriptions.filter((sub) => sub.id !== subscriptionId);

			alert('Subscription cancelled successfully');
		} catch (err) {
			console.error('Error cancelling subscription:', err);
			alert('Failed to cancel subscription');
		}
	}

	function updateDeviceAssignment(subscriptionId: string, devEui: string) {
		subscriptions = subscriptions.map((sub) =>
			sub.id === subscriptionId ? { ...sub, assignedDevEui: devEui } : sub
		);
	}

	onMount(async () => {
		try {
			stripe = await loadStripe(STRIPE_PUBLISHABLE_KEY);
			if (stripe) {
				elements = stripe.elements();
				cardElement = elements.create('card', {
					style: {
						base: {
							fontSize: '16px',
							color: getDarkMode() ? 'white' : '#424770',
							'::placeholder': {
								color: getDarkMode() ? 'white' : '#aab7c4'
							}
						},
						invalid: {
							color: '#9e2146'
						}
					}
				});
				cardElement.mount(cardContainer);

				cardElement.on('change', (event) => {
					if (event.error) {
						error = event.error.message;
					} else {
						error = '';
					}
				});
			}
		} catch (err) {
			error = 'Failed to load Stripe';
			console.error('Error loading Stripe:', err);
		}
	});

	async function handleSubmit(event: Event) {
		event.preventDefault();

		if (!stripe || !cardElement) {
			error = 'Stripe not loaded';
			return;
		}

		processing = true;
		error = '';

		try {
			const { token, error: stripeError } = await stripe.createToken(cardElement, {
				name: cardholderName
			});

			if (stripeError) {
				error = stripeError.message || 'An error occurred';
				processing = false;
				return;
			}

			// Here you would typically send the token to your server
			// For demo purposes, we'll just show success
			console.log('Token created:', token);

			// Simulate API call
			fetch('/api/payment-methods', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					token: token.id,
					cardholderName,
					email
				})
			}).then((response) => {
				if (!response.ok) {
					throw new Error('Failed to add payment method');
				}
			});

			success = true;
			processing = false;

			// Reset form
			cardElement.clear();
			cardholderName = '';
			email = '';
		} catch (err) {
			error = 'Payment processing failed';
			processing = false;
			console.error('Payment error:', err);
		}
	}
</script>

<div class="space-y-6 p-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div class="w-full border-b pb-4">
			<h1 class="text-3xl font-bold text-gray-900 dark:text-white">💳 Account Payment Settings</h1>
			<p class="mt-1 text-gray-600 dark:text-gray-400">
				Add or update your payment method securely with Stripe.
			</p>
		</div>
	</div>

	<a
		href="/app/account-settings/payment/add-subscription"
		class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
	>
		➡️ Add Subscription
	</a>

	<!-- Subscription Management -->
	<div class="w-full space-y-6">
		<!-- Active Subscriptions -->
		<div class="rounded-lg bg-white p-6 shadow-lg dark:bg-gray-800">
			<h2 class="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
				📋 Active Subscriptions
			</h2>
			<p class="mb-6 text-sm text-gray-600 dark:text-gray-400">
				Manage your active subscriptions and assign devices.
			</p>

			{#if subscriptions.length === 0}
				<div class="py-8 text-center">
					<svg
						class="mx-auto h-12 w-12 text-gray-400"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
						/>
					</svg>
					<h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-white">No subscriptions</h3>
					<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
						You don't have any active subscriptions.
					</p>
				</div>
			{:else}
				<div class="space-y-4">
					{#each subscriptions as subscription (subscription.id)}
						<div class="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
							<div class="mb-3 flex items-center justify-between">
								<div class="flex-1">
									<h3 class="text-lg font-medium text-gray-900 dark:text-white">
										{subscription.name}
									</h3>
									<div class="mt-1 flex items-center space-x-4">
										<span class="text-sm text-gray-500 dark:text-gray-400">
											${subscription.amount}/{subscription.interval}
										</span>
										<span
											class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium
											{subscription.status === 'active'
												? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
												: subscription.status === 'paused'
													? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-500'
													: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'}"
										>
											{subscription.status}
										</span>
										{#if subscription.pausedUntil}
											<span class="text-xs text-gray-500 dark:text-gray-400">
												Paused until {subscription.pausedUntil}
											</span>
										{/if}
									</div>
									<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
										Next billing: {subscription.current_period_end}
									</p>
								</div>
							</div>

							<div class="flex items-center space-x-4">
								<label
									for="device-{subscription.id}"
									class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
								>
									Assign Device EUI
								</label>
								<div class="flex-1">
									<select
										id="device-{subscription.id}"
										value={subscription.assignedDevEui}
										on:change={(e) => updateDeviceAssignment(subscription.id, e.target.value)}
										class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
									>
										<option value="">Select a device...</option>
										{#each deviceEuis as devEui}
											<option value={devEui}>{devEui}</option>
										{/each}
									</select>
								</div>

								<div class="flex space-x-2">
									<button
										type="button"
										on:click={() => viewAccountHistory(subscription.id)}
										class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
									>
										View History
									</button>

									<button
										type="button"
										on:click={() => cancelSubscription(subscription.id)}
										class="rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:outline-none dark:bg-red-500 dark:hover:bg-red-600"
									>
										Cancel
									</button>
								</div>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</div>
