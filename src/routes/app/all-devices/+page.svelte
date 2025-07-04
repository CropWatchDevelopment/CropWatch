<script>
	import Button from '$lib/components/UI/dashboard/components/Button.svelte';

	let { data } = $props();

	let allDevicesPromise = $derived(data.allDevicesPromise);
</script>

<div class="space-y-6 p-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold text-gray-900 dark:text-white">All Devices</h1>
			<p class="mt-1 text-gray-600 dark:text-gray-400">
				Manage and view all your monitoring locations
			</p>
		</div>
	</div>
</div>

{#await allDevicesPromise}
	<p class="text-gray-500 dark:text-gray-300">Loading devices...</p>
{:then devices}
	<div class="space-y-4">
		{#if devices.length > 0}
			<ul class="space-y-2">
				{#each devices as device}
					<li class="rounded-lg bg-white p-4 shadow dark:bg-gray-800">
						<h2 class="text-xl font-semibold text-gray-900 dark:text-white">{device.name}</h2>
						<p class="text-gray-600 dark:text-gray-400">ID: {device.id}</p>
						<p class="text-gray-600 dark:text-gray-400">Location: {device.location}</p>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="text-gray-500 dark:text-gray-300">No devices found.</p>
		{/if}
	</div>
{:catch error}
	<p class="text-red-500 dark:text-red-400">Error loading devices: {error.message}</p>
{/await}
<pre>{JSON.stringify(allDevicesPromise, null, 2)}</pre>
