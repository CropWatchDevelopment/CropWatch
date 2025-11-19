<script lang="ts">
	import Icon from '$lib/components/ui/base/Icon.svelte';
	import { mdiDevices, mdiAlert, mdiMagnify } from '$lib/icons/mdi';
	import ConnectedGatewaysModal from '$lib/components/devices/ConnectedGatewaysModal.svelte';
	import type { DeviceGatewayWithDevice } from '$lib/models/DeviceGateway';

	let { data } = $props();

	let allDevicesPromise = $derived(data.allDevicesPromise);
	const deviceGatewayMap = $derived<Record<string, DeviceGatewayWithDevice[]>>(
		data.deviceGatewayMap ?? {}
	);
	let searchTerm = $state('');
	let gatewayModalOpen = $state(false);
	let selectedGateways = $state<DeviceGatewayWithDevice[]>([]);
	let selectedDeviceLabel = $state('');

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

	function openGatewayModal(device: any) {
		if (!device?.dev_eui) return;
		selectedGateways = deviceGatewayMap[device.dev_eui] ?? [];
		selectedDeviceLabel = device.name || device.dev_eui || 'Device';
		gatewayModalOpen = true;
	}
</script>

<div class="space-y-6 px-4 py-6 sm:px-6">
	<div class="devices-header">
		<div class="devices-header__info">
			<h1 class="text-3xl font-bold text-gray-900 dark:text-white">All Devices</h1>
			<p class="mt-1 text-gray-600 dark:text-gray-400">
				Manage and view all your monitoring locations
			</p>
		</div>
		<div class="devices-header__actions">
			<div class="search-container">
				<div class="search-wrapper">
					<Icon
						class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400 dark:text-slate-400/80"
						path={mdiMagnify}
						size="18"
					/>
					<input
						type="text"
						bind:value={searchTerm}
						placeholder="Search devices..."
						class="search-input"
						aria-label="Search devices"
					/>
				</div>
			</div>
		</div>
	</div>

	{#await allDevicesPromise}
		<div class="loading">
			<p class="text-gray-500 dark:text-gray-300">Loading devices...</p>
		</div>
	{:then devices}
		{@const filteredDevices = filterDevices(devices)}
		{#if filteredDevices.length > 0}
			<div class="hidden md:block">
				<div class="table-wrapper">
					<table class="devices-table">
						<thead>
							<tr>
								<th scope="col" class="w-[32%]">Device</th>
								<th scope="col" class="w-[18%]">Device ID</th>
								<th scope="col" class="w-[26%]">Location</th>
								<th scope="col" class="w-[16%]">Type</th>
								<th scope="col" class="w-[14%] text-center">Gateways</th>
								<th scope="col" class="w-[8%] text-center">Details</th>
							</tr>
						</thead>
						<tbody>
							{#each filteredDevices as device, index (device.device_id || device.dev_eui || device.name || index)}
								<tr>
									<td>
										<div class="device-name-cell">
											<Icon
												class="shrink-0 text-sky-600 dark:text-sky-300"
												path={mdiDevices}
												size="20"
											/>
											<div class="device-name-text">
												<p class="font-semibold text-slate-900 dark:text-slate-50">
													{device.name || device.dev_eui || 'Unnamed Device'}
												</p>
												<p class="text-xs text-slate-500 dark:text-slate-400">
													{device.dev_eui ?? 'N/A'}
												</p>
											</div>
										</div>
									</td>
									<td class="text-sm text-slate-700 dark:text-slate-200">
										{device.device_id || device.dev_eui || 'N/A'}
									</td>
									<td class="text-sm text-slate-700 dark:text-slate-200">
										{device.location_id ?? 'N/A'}
									</td>
									<td class="text-sm text-slate-700 dark:text-slate-200">
										{device.cw_device_type?.name ?? 'N/A'}
									</td>
									<td class="text-center">
										<button
											type="button"
											class="gateways-button"
											disabled={!device.dev_eui}
											onclick={() => openGatewayModal(device)}
										>
											Connected Gateways
										</button>
									</td>
									<td class="table-actions">
										{#if device.location_id && device.dev_eui}
											<a
												href={`/app/dashboard/location/${device.location_id}/devices/${device.dev_eui}`}
												class="details-link"
											>
												View
											</a>
										{:else}
											<span class="details-link disabled">View</span>
										{/if}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
			<div class="space-y-4 md:hidden">
				{#each filteredDevices as device, index (device.device_id || device.dev_eui || device.name || index)}
					<article class="device-card">
						<div class="device-card-header">
							<div>
								<p class="text-base font-semibold text-slate-900 dark:text-slate-50">
									{device.name || device.dev_eui || 'Unnamed Device'}
								</p>
								<p class="text-sm text-slate-500 dark:text-slate-400">
									ID: {device.device_id || device.dev_eui || 'N/A'}
								</p>
							</div>
							{#if device.location_id && device.dev_eui}
								<a
									href={`/app/dashboard/location/${device.location_id}/devices/${device.dev_eui}`}
									class="details-link"
								>
									View
								</a>
							{:else}
								<span class="details-link disabled">View</span>
							{/if}
						</div>
						<div class="device-card-body">
							<div class="device-card-row">
								<span class="device-card-label">Location</span>
								<span>{device.location_id ?? 'N/A'}</span>
							</div>
							<div class="device-card-row">
								<span class="device-card-label">Type</span>
								<span>{device.cw_device_type?.name ?? 'N/A'}</span>
							</div>
							{#if device.dev_eui}
								<div class="device-card-row">
									<span class="device-card-label">DevEUI</span>
									<span>{device.dev_eui}</span>
								</div>
							{/if}
						</div>
						<button
							type="button"
							class="gateways-button gateways-button--mobile"
							disabled={!device.dev_eui}
							onclick={() => openGatewayModal(device)}
						>
							Connected Gateways
						</button>
					</article>
				{/each}
			</div>
		{:else}
			<div class="no-devices">
				<Icon class="text-4xl text-gray-400" path={mdiAlert} />
				<p class="text-gray-500 dark:text-gray-300">
					{searchTerm ? 'No devices match your search.' : 'No devices found.'}
				</p>
			</div>
		{/if}
	{:catch error}
		<div class="error">
			<p class="text-red-500 dark:text-red-400">Error loading devices: {error.message}</p>
		</div>
	{/await}
</div>

<ConnectedGatewaysModal
	bind:open={gatewayModalOpen}
	deviceLabel={selectedDeviceLabel}
	gateways={selectedGateways}
/>

<style>
	.devices-header {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	@media (min-width: 768px) {
		.devices-header {
			flex-direction: row;
			align-items: flex-end;
			justify-content: space-between;
			gap: 2rem;
		}
	}

	.devices-header__info {
		flex: 1 1 auto;
		min-width: 0;
	}

	.devices-header__actions {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		width: 100%;
	}

	@media (min-width: 768px) {
		.devices-header__actions {
			flex-direction: row;
			align-items: center;
			justify-content: flex-end;
			max-width: 24rem;
			margin-left: auto;
		}
	}

	.search-container {
		min-width: 260px;
		width: 100%;
	}

	@media (min-width: 768px) {
		.search-container {
			min-width: 18rem;
		}
	}

	.search-wrapper {
		position: relative;
		display: flex;
		align-items: center;
	}

	.search-input {
		width: 100%;
		padding: 0.5rem 0.75rem 0.5rem 2.5rem;
		height: 2.75rem;
		border: 1px solid rgb(209 213 219);
		border-radius: 0.5rem;
		background-color: white;
		color: rgb(17 24 39);
		font-size: 0.9rem;
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
		color: rgb(100 116 139);
	}

	.error {
		color: rgb(239 68 68);
	}

	.table-wrapper {
		overflow: hidden;
		border-radius: 0.75rem;
		border: 1px solid rgb(229 231 235);
		background-color: white;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
	}

	:global(.dark) .table-wrapper {
		border-color: rgb(55 65 81);
		background-color: rgb(17 24 39);
	}

	.devices-table {
		width: 100%;
		border-collapse: separate;
		border-spacing: 0;
	}

	.devices-table th,
	.devices-table td {
		padding: 0.85rem 1rem;
		text-align: left;
		border-bottom: 1px solid rgb(229 231 235);
		font-size: 0.95rem;
		color: rgb(31 41 55);
	}

	:global(.dark) .devices-table th,
	:global(.dark) .devices-table td {
		border-color: rgba(75, 85, 99, 0.7);
		color: rgb(229 231 235);
	}

	.devices-table th {
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		font-size: 0.75rem;
		color: rgb(71 85 105);
	}

	:global(.dark) .devices-table th {
		color: rgb(191 219 254);
	}

	.devices-table tbody tr:nth-child(even) {
		background-color: rgba(59, 130, 246, 0.04);
	}

	:global(.dark) .devices-table tbody tr:nth-child(even) {
		background-color: rgba(59, 130, 246, 0.12);
	}

	.devices-table tbody tr:hover {
		background-color: rgba(59, 130, 246, 0.12);
	}

	:global(.dark) .devices-table tbody tr:hover {
		background-color: rgba(59, 130, 246, 0.2);
	}

	.device-name-cell {
		display: flex;
		align-items: center;
		gap: 0.65rem;
	}

	.device-name-text {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}

	.table-actions {
		text-align: center;
		white-space: nowrap;
	}

	.details-link {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.35rem 0.9rem;
		border-radius: 9999px;
		background-color: rgb(37 99 235);
		color: white;
		font-size: 0.8rem;
		font-weight: 600;
		transition: background-color 0.2s ease;
	}

	.details-link:hover {
		background-color: rgb(29 78 216);
	}

	.details-link.disabled {
		background-color: rgb(203 213 225);
		color: rgb(100 116 139);
		cursor: not-allowed;
	}

	.gateways-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.35rem 0.9rem;
		border-radius: 9999px;
		border: 1px solid rgb(59 130 246);
		color: rgb(59 130 246);
		font-size: 0.8rem;
		font-weight: 600;
		background-color: transparent;
		transition:
			background 0.2s ease,
			color 0.2s ease;
	}

	.gateways-button:hover:not(:disabled) {
		background-color: rgba(59, 130, 246, 0.1);
	}

	.gateways-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.gateways-button--mobile {
		width: 100%;
		margin-top: 0.75rem;
	}

	.device-card {
		border: 1px solid rgb(229 231 235);
		border-radius: 1rem;
		padding: 1rem;
		background-color: white;
		box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05);
	}

	:global(.dark) .device-card {
		border-color: rgb(55 65 81);
		background-color: rgb(15 23 42);
		color: rgb(226 232 240);
	}

	.device-card-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.device-card-body {
		margin-top: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		font-size: 0.9rem;
		color: rgb(71 85 105);
	}

	:global(.dark) .device-card-body {
		color: rgb(203 213 225);
	}

	.device-card-row {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
	}

	.device-card-label {
		font-weight: 600;
		color: rgb(100 116 139);
	}

	:global(.dark) .device-card-label {
		color: rgb(148 163 184);
	}

	.no-devices {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 3rem;
		border-radius: 0.75rem;
		background-color: var(--color-card, rgb(255 255 255));
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
		gap: 1rem;
	}

	:global(.dark) .no-devices {
		background-color: rgb(31 41 55);
	}

	@media (max-width: 768px) {
		.search-container {
			min-width: 100%;
		}
	}
</style>
