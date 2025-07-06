<svelte:head>
	<title>Payment Cancelled - CropWatch</title>
</svelte:head>

<div class="container mx-auto px-4 py-8">
	<div class="mx-auto max-w-md text-center">
		<div class="mb-6 rounded border border-yellow-400 bg-yellow-100 px-4 py-3 text-yellow-700">
			<h1 class="mb-2 text-2xl font-bold">Payment Cancelled</h1>
			<p>Your subscription setup was cancelled. No charges were made.</p>
		</div>

		<div class="space-y-4">
			<a
				href="/app/account-settings/payment/add-subscription"
				class="inline-block rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
			>
				Try Again
			</a>

			<a
				href="/app/account-settings/payment"
				class="ml-4 inline-block rounded-md bg-gray-600 px-4 py-2 text-white hover:bg-gray-700 focus:ring-2 focus:ring-gray-500 focus:outline-none"
			>
				Back to Payment Settings
			</a>
		</div>
	</div>
</div>
