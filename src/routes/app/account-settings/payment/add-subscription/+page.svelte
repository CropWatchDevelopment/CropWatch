<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import type { ActionData, PageData } from './$types';

	export let data: PageData;
	export let form: ActionData;

	// Helper function to format price
	function formatPrice(amount: number | null, currency: string) {
		if (!amount) return 'Free';
		const formatter = new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: currency.toUpperCase()
		});
		return formatter.format(amount / 100);
	}

	// Helper function to format billing period
	function formatBillingPeriod(recurring: any) {
		if (!recurring) return '';
		const { interval, interval_count } = recurring;
		const period = interval_count > 1 ? `${interval_count} ${interval}s` : interval;
		return `/ ${period}`;
	}
</script>

<svelte:head>
	<title>Add Subscription - CropWatch</title>
</svelte:head>

<div class="container mx-auto px-4 py-8">
	<h1 class="mb-8 text-3xl font-bold">Add Subscription</h1>

	{#if form?.error}
		<div class="mb-4 rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">
			{form.error}
		</div>
	{/if}

	{#if data.error}
		<div class="mb-4 rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">
			{data.error}
		</div>
	{/if}

	<section class="mx-auto max-w-4xl">
		{#if data.subscriptionProducts.length === 0}
			<div class="py-8 text-center">
				<p class="text-gray-600">No subscription products available at this time.</p>
			</div>
		{:else}
			<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
				{#each data.subscriptionProducts as product}
					<div class="product rounded-lg bg-white p-6 shadow-md">
						{#if product.images.length > 0}
							<img
								src={product.images[0]}
								alt={product.name}
								class="mb-4 h-48 w-full rounded-md object-cover"
							/>
						{/if}

						<div class="mb-4 flex items-center">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								xmlns:xlink="http://www.w3.org/1999/xlink"
								width="14px"
								height="16px"
								viewBox="0 0 14 16"
								version="1.1"
								class="mr-3"
							>
								<defs />
								<g id="Flow" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
									<g id="0-Default" transform="translate(-121.000000, -40.000000)" fill="#E184DF">
										<path
											d="M127,50 L126,50 C123.238576,50 121,47.7614237 121,45 C121,42.2385763 123.238576,40 126,40 L135,40 L135,56 L133,56 L133,42 L129,42 L129,56 L127,56 L127,50 Z M127,48 L127,42 L126,42 C124.343146,42 123,43.3431458 123,45 C123,46.6568542 124.343146,48 126,48 L127,48 Z"
											id="Pilcrow"
										/>
									</g>
								</g>
							</svg>
							<div class="description">
								<h3 class="text-xl font-semibold">{product.name}</h3>
								{#if product.description}
									<p class="mb-2 text-sm text-gray-600">{product.description}</p>
								{/if}
							</div>
						</div>

						<!-- Display all prices for this product -->
						<div class="space-y-3">
							{#each product.prices as price}
								<div class="rounded-lg border p-4">
									<div class="mb-2 flex items-center justify-between">
										<span class="text-lg font-medium">
											{formatPrice(price.unit_amount, price.currency)}
											{formatBillingPeriod(price.recurring)}
										</span>
										{#if price.nickname}
											<span class="text-sm text-gray-500">{price.nickname}</span>
										{/if}
									</div>

									<form
										method="POST"
										action="?/create-checkout-session"
										use:enhance={({ formData }) => {
											return async ({ result }) => {
												if (
													result.type === 'success' &&
													result.data &&
													'redirectUrl' in result.data &&
													result.data.redirectUrl
												) {
													// Redirect to Stripe Checkout
													window.location.href = result.data.redirectUrl as string;
												}
											};
										}}
									>
										<input type="hidden" name="price_id" value={price.id} />
										<button
											type="submit"
											class="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
										>
											Subscribe
										</button>
									</form>
								</div>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</section>
</div>
