<script lang="ts">
	import Button from '$lib/components/UI/dashboard/components/Button.svelte';
	import { Icon } from 'svelte-ux';
	import { mdiDevices, mdiMapMarker, mdiIdentifier, mdiAlert, mdiMagnify } from '@mdi/js';

	let { data } = $props();

	let allDevicesPromise = $derived(data.allDevicesPromise);
	let searchTerm = $state('');

	// Filter devices based on search term
	function filterDevices(devices: any[]) {
		if (!searchTerm.trim()) return devices;

		return devices.filter((device: any) => {
			const name = (device.name || device.dev_eui || '').toLowerCase();
			const id = (device.device_id || device.dev_eui || '').toLowerCase();
			const search = searchTerm.toLowerCase();

			return name.includes(search) || id.includes(search);
		});
	}
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
		<div class="search-container">
			<div class="relative">
				<Icon
					class="absolute top-1/2 left-3 -translate-y-1/2 transform text-gray-400"
					path={mdiMagnify}
					size="20"
				/>
				<input
					type="text"
					bind:value={searchTerm}
					placeholder="Search devices..."
					class="search-input"
				/>
			</div>
		</div>
	</div>

	{#await allDevicesPromise}
		<div class="loading">
			<p class="text-gray-500 dark:text-gray-300">Loading devices...</p>
		</div>
	{:then devices}
		{@const filteredDevices = filterDevices(devices)}
		<div class="devices-grid">
			{#if filteredDevices.length > 0}
				{#each filteredDevices as device, index (device.device_id || device.dev_eui || device.name || index)}
					<div class="device-card">
						<div class="device-header">
							<div class="device-icon">
								<Icon class="text-xl text-blue-400" path={mdiDevices} />
							</div>
							<h2 class="device-title">{device.name || device.dev_eui || 'Unnamed Device'}</h2>
							<button
								class="device-action-btn"
								onclick={() => {
									/* Add navigation logic here */
								}}
								aria-label="View device details"
							>
								<svg viewBox="0 0 24 24" class="pointer-events-none h-5 w-5">
									<path
										fill="currentColor"
										d="M4,11V13H16L10.5,18.5L11.92,19.92L19.84,12L11.92,4.08L10.5,5.5L16,11H4Z"
									/>
								</svg>
							</button>
						</div>
						<div class="device-content">
							<div class="device-info">
								{#if device.device_id || device.dev_eui}
									<div class="device-info-item">
										<Icon class="text-sm text-gray-500 dark:text-gray-400" path={mdiIdentifier} />
										<span class="device-info-text"
											>ID: {device.device_id || device.dev_eui || 'N/A'}</span
										>
									</div>
								{/if}
								{#if device.location_id}
									<div class="device-info-item">
										<Icon class="text-sm text-gray-500 dark:text-gray-400" path={mdiMapMarker} />
										<span class="device-info-text">Location ID: {device.location_id}</span>
									</div>
								{/if}
								{#if device.cw_device_type?.name}
									<div class="device-info-item">
										<Icon class="text-sm text-gray-500 dark:text-gray-400" path={mdiDevices} />
										<span class="device-info-text">Type: {device.cw_device_type.name}</span>
									</div>
								{/if}
							</div>
						</div>
					</div>
				{/each}
			{:else}
				<div class="no-devices">
					<Icon class="text-4xl text-gray-400" path={mdiAlert} />
					<p class="text-gray-500 dark:text-gray-300">
						{searchTerm ? 'No devices match your search.' : 'No devices found.'}
					</p>
				</div>
			{/if}
		</div>
	{:catch error}
		<div class="error">
			<p class="text-red-500 dark:text-red-400">Error loading devices: {error.message}</p>
		</div>
	{/await}
</div>

<style>
	.search-container {
		min-width: 300px;
	}

	.search-input {
		width: 100%;
		padding: 0.5rem 0.75rem 0.5rem 2.5rem;
		border: 1px solid rgb(209 213 219);
		border-radius: 0.5rem;
		background-color: white;
		color: rgb(17 24 39);
		font-size: 0.875rem;
		transition: all 0.2s ease;
	}

	.search-input:focus {
		outline: none;
		border-color: rgb(59 130 246);
		box-shadow: 0 0 0 3px rgba(59 130 246, 0.1);
	}

	.search-input::placeholder {
		color: rgb(156 163 175);
	}

	:global(.dark) .search-input {
		background-color: rgb(31 41 55);
		border-color: rgb(55 65 81);
		color: white;
	}

	:global(.dark) .search-input:focus {
		border-color: rgb(147 197 253);
		box-shadow: 0 0 0 3px rgba(147 197 253, 0.1);
	}

	:global(.dark) .search-input::placeholder {
		color: rgb(107 114 128);
	}

	.loading,
	.error {
		display: flex;
		justify-content: center;
		align-items: center;
		padding: 2rem;
		font-size: 1rem;
		color: var(--color-text-secondary);
	}

	.error {
		color: var(--color-danger);
	}

	.devices-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: 1.5rem;
		width: 100%;
	}

	.device-card {
		display: flex;
		flex-direction: column;
		overflow: hidden;
		border-radius: 0.75rem;
		border: 1px solid rgb(209 213 219);
		background-color: rgb(229 231 235);
		background-color: rgba(156 163 175 / 0.4);
		color: rgb(17 24 39);
		box-shadow:
			0 10px 15px -3px rgba(0, 0, 0, 0.1),
			0 4px 6px -2px rgba(0, 0, 0, 0.05);
		transition: all 0.2s ease;
		height: 100%;
	}

	.device-card:hover {
		transform: translateY(-2px);
		box-shadow:
			0 20px 25px -5px rgba(0, 0, 0, 0.1),
			0 10px 10px -5px rgba(0, 0, 0, 0.04);
	}

	:global(.dark) .device-card {
		border-color: rgb(55 65 81);
		background-color: #1f2532;
		background-color: rgba(31 41 55 / 0.8);
		color: white;
		box-shadow:
			0 10px 15px -3px rgba(0, 0, 0, 0.2),
			0 4px 6px -2px rgba(0, 0, 0, 0.1);
	}

	.device-header {
		display: flex;
		align-items: center;
		min-height: 60px;
		background-color: rgb(15 118 110);
		color: rgb(253 224 71);
		padding: 0.75rem 0.5rem;
		position: relative;
	}

	:global(.dark) .device-header {
		background-color: #2c3546;
		color: rgb(253 224 71);
	}

	.device-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2.5rem;
		height: 2.5rem;
		border-radius: 50%;
		background-color: rgba(255, 255, 255, 0.2);
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
		flex-shrink: 0;
	}

	:global(.dark) .device-icon {
		background-color: rgba(55 65 81, 1);
	}

	.device-title {
		flex: 1;
		margin-left: 1.25rem;
		font-size: 1.125rem;
		font-weight: 600;
		color: rgb(217 119 6);
		padding-top: 0.25rem;
	}

	:global(.dark) .device-title {
		color: rgb(251 191 36);
	}

	.device-action-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2.25rem;
		height: 2.25rem;
		margin-left: 0.5rem;
		border-radius: 50%;
		border: 1px solid rgb(191 219 254);
		background-color: rgb(239 246 255);
		color: rgb(29 78 216);
		transition: all 0.2s;
		flex-shrink: 0;
	}

	.device-action-btn:hover {
		background-color: rgb(219 234 254);
	}

	:global(.dark) .device-action-btn {
		border-color: rgb(75 85 99);
		background-color: rgb(55 65 81);
		color: rgb(147 197 253);
	}

	:global(.dark) .device-action-btn:hover {
		background-color: rgb(75 85 99);
	}

	.device-content {
		padding: 0.5rem;
		flex: 1;
	}

	.device-info {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.device-info-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.device-info-text {
		font-size: 0.875rem;
		color: rgb(75 85 99);
	}

	:global(.dark) .device-info-text {
		color: rgb(156 163 175);
	}

	.no-devices {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 3rem;
		grid-column: 1 / -1;
		background-color: var(--color-card, rgb(255 255 255));
		border-radius: 0.75rem;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
		gap: 1rem;
	}

	:global(.dark) .no-devices {
		background-color: rgb(31 41 55);
	}

	@media (max-width: 768px) {
		.devices-grid {
			grid-template-columns: 1fr;
		}

		.search-container {
			min-width: 200px;
		}
	}
</style>
