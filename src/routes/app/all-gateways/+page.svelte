<script lang="ts">
	let searchTerm = $state('');
</script>

<div class="space-y-6 p-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold text-gray-900 dark:text-white">All Gateways</h1>
			<p class="mt-1 text-gray-600 dark:text-gray-400">Watch the status of all your gateways</p>
		</div>
		<div class="search-container">
			<div class="relative">
				<input
					type="text"
					bind:value={searchTerm}
					placeholder="Search devices..."
					class="search-input"
				/>
			</div>
		</div>
	</div>
	<!-- Content -->
</div>
