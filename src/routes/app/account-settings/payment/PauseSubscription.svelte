<script lang="ts">
	let pauseDuration = '1'; // Default to 1 month
	let pausingSubscriptions = false;

	async function pauseAllSubscriptions() {
		pausingSubscriptions = true;
		try {
			// Simulate API call to pause subscriptions
			await new Promise((resolve) => setTimeout(resolve, 1500));

			// Update subscription statuses
			subscriptions = subscriptions.map((sub) => ({
				...sub,
				status: 'paused',
				pausedUntil: new Date(Date.now() + parseInt(pauseDuration) * 30 * 24 * 60 * 60 * 1000)
					.toISOString()
					.split('T')[0]
			}));

			alert(`All subscriptions paused for ${pauseDuration} month(s)`);
		} catch (err) {
			console.error('Error pausing subscriptions:', err);
			alert('Failed to pause subscriptions');
		} finally {
			pausingSubscriptions = false;
		}
	}
</script>

<!-- Pause All Subscriptions -->
<div class="rounded-lg bg-white p-6 shadow-lg dark:bg-gray-800">
	<h2 class="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
		⏸️ Pause All Subscriptions
	</h2>
	<p class="mb-4 text-sm text-gray-600 dark:text-gray-400">
		Temporarily pause all your active subscriptions. You won't be charged during the pause period.
	</p>

	<div class="flex items-center space-x-4">
		<div class="flex-1">
			<label
				for="pause-duration"
				class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
			>
				Pause Duration
			</label>
			<select
				id="pause-duration"
				bind:value={pauseDuration}
				class="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
			>
				<option value="1">1 Month</option>
				<option value="2">2 Months</option>
			</select>
		</div>

		<button
			type="button"
			on:click={pauseAllSubscriptions}
			disabled={pausingSubscriptions}
			class="rounded-md border border-transparent bg-orange-600 px-6 py-2 text-sm font-medium text-white shadow-sm hover:bg-orange-700 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-orange-500 dark:hover:bg-orange-600"
		>
			{#if pausingSubscriptions}
				<svg
					class="mr-2 -ml-1 inline h-4 w-4 animate-spin text-white"
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
				>
					<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
					></circle>
					<path
						class="opacity-75"
						fill="currentColor"
						d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
					></path>
				</svg>
				Pausing...
			{:else}
				Pause All Subscriptions
			{/if}
		</button>
	</div>
</div>
