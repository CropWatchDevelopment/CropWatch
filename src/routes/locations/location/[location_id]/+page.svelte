<script lang="ts">
	import { page } from '$app/stores';
	import CWButton from '$lib/components/CWButton.svelte';
	import CWBackButton from '$lib/components/CWBackButton.svelte';
	import CWDialog from '$lib/components/CWDialog.svelte';
	import CWCopy from '$lib/components/CWCopy.svelte';
	import CWTable from '$lib/components/CWTable.svelte';
	import { goto, invalidate } from '$app/navigation';
	import { resolve } from '$app/paths';
	import CWLocationPermission from '$lib/components/CWLocationPermission.svelte';

	// Types
	interface LocationDevice {
		dev_eui: string;
		name: string;
		type: string | null;
		battery_level: number | null;
		last_data_updated_at: string | null;
		status: 'online' | 'offline' | 'warning';
	}

	let { data } = $props();
	const location = $derived<Location>(data.location);
	const supabase = $derived(data.supabase);
	const currentUserId = $derived(data.session?.user?.id ?? '');

	// Get location ID from route params
	const locationId = $derived($page.params.location_id);

	// Transform locationPermissions to flatten the profiles array from Supabase join
	// Also deduplicate by user_id to prevent duplicate key errors
	const locationPermissions = $derived.by(() => {
		const mapped = (data.locationPermissions || []).map(
			(p: { user_id: string; permission_level: number; is_active: boolean; profiles: { id: string; email: string; full_name: string }[] | { id: string; email: string; full_name: string } }) => ({
				user_id: p.user_id,
				permission_level: p.permission_level,
				is_active: p.is_active,
				profiles: Array.isArray(p.profiles) ? p.profiles[0] : p.profiles
			})
		);
		// Deduplicate by user_id, keeping the first occurrence
		const seen = new Set<string>();
		return mapped.filter((p) => {
			if (seen.has(p.user_id)) return false;
			seen.add(p.user_id);
			return true;
		});
	});

	const currentLocationPermissionLevel = $derived(
		locationPermissions.find((p) => p.user_id === currentUserId)?.permission_level ?? 4
	);

	const canManageLocationSettings = $derived(currentLocationPermissionLevel <= 2);
	const canAddOrRemoveDevices = $derived(currentLocationPermissionLevel === 1);

	// Mock data - replace with actual data fetching
	let locationName = $state(location.name ?? 'Location name not set');
	let locationDescription = $state(location.description ?? 'No Location Description Set');
	let locationLat = $state(location.lat ?? 40.7128);
	let locationLong = $state(location.long ?? -74.006);

	// Settings state
	let isEditingSettings = $state(false);
	let editName = $state('');
	let editDescription = $state('');
	let savingSettings = $state(false);

	// Devices state
	let devices = $state<LocationDevice[]>([
		{
			dev_eui: 'a1b2c3d4e5f60001',
			name: 'Temperature Sensor 1',
			type: 'temperature',
			battery_level: 85,
			last_data_updated_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
			status: 'online'
		},
		{
			dev_eui: 'a1b2c3d4e5f60002',
			name: 'Humidity Sensor 1',
			type: 'humidity',
			battery_level: 72,
			last_data_updated_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
			status: 'online'
		},
		{
			dev_eui: 'a1b2c3d4e5f60003',
			name: 'CO2 Monitor',
			type: 'co2',
			battery_level: 45,
			last_data_updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
			status: 'warning'
		},
		{
			dev_eui: 'a1b2c3d4e5f60004',
			name: 'Soil Moisture Sensor',
			type: 'soil_moisture',
			battery_level: 0,
			last_data_updated_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
			status: 'offline'
		}
	]);

	// Available devices to add (not in this location)
	let availableDevices = $state<LocationDevice[]>([
		{
			dev_eui: 'a1b2c3d4e5f60010',
			name: 'Spare Temp Sensor',
			type: 'temperature',
			battery_level: 100,
			last_data_updated_at: null,
			status: 'offline'
		},
		{
			dev_eui: 'a1b2c3d4e5f60011',
			name: 'New Humidity Sensor',
			type: 'humidity',
			battery_level: 100,
			last_data_updated_at: null,
			status: 'offline'
		}
	]);

	// Dialog states
	let showAddDeviceDialog = $state(false);
	let showRemoveDeviceDialog = $state(false);

	// Selected items for dialogs
	let selectedDevice = $state<LocationDevice | null>(null);
	let selectedDeviceToAdd = $state<string>('');

	// Loading states
	let removingDevice = $state(false);
	let addingDevice = $state(false);

	// Computed values
	const onlineDevices = $derived(devices.filter((d) => d.status === 'online').length);
	const totalDevices = $derived(devices.length);

	// Functions
	function startEditSettings() {
		if (!canManageLocationSettings) return;
		editName = locationName;
		editDescription = locationDescription;
		isEditingSettings = true;
	}

	function cancelEditSettings() {
		isEditingSettings = false;
	}

	async function saveSettings() {
		savingSettings = true;
		// Simulate API call
		await new Promise((r) => setTimeout(r, 500));
		locationName = editName;
		locationDescription = editDescription;
		savingSettings = false;
		isEditingSettings = false;
	}

	function openRemoveDeviceDialog(device: LocationDevice) {
		selectedDevice = device;
		showRemoveDeviceDialog = true;
	}

	async function addDevice() {
		if (!selectedDeviceToAdd) return;
		addingDevice = true;
		// Simulate API call
		await new Promise((r) => setTimeout(r, 500));
		const device = availableDevices.find((d) => d.dev_eui === selectedDeviceToAdd);
		if (device) {
			devices = [...devices, device];
			availableDevices = availableDevices.filter((d) => d.dev_eui !== selectedDeviceToAdd);
		}
		addingDevice = false;
		showAddDeviceDialog = false;
	}

	async function removeDevice() {
		if (!selectedDevice) return;
		removingDevice = true;
		// Simulate API call
		await new Promise((r) => setTimeout(r, 500));
		availableDevices = [...availableDevices, selectedDevice];
		devices = devices.filter((d) => d.dev_eui !== selectedDevice!.dev_eui);
		removingDevice = false;
		showRemoveDeviceDialog = false;
		selectedDevice = null;
	}

	function formatLastSeen(timestamp: string | null) {
		if (!timestamp) return 'Never';
		const date = new Date(timestamp);
		const now = new Date();
		const diff = now.getTime() - date.getTime();
		const minutes = Math.floor(diff / 60000);
		const hours = Math.floor(diff / 3600000);
		const days = Math.floor(diff / 86400000);

		if (minutes < 1) return 'Just now';
		if (minutes < 60) return `${minutes}m ago`;
		if (hours < 24) return `${hours}h ago`;
		return `${days}d ago`;
	}

	const currentPath = $derived($page.url.pathname);

	const deviceTableItems = $derived(
		devices.map((device) => ({
			...device,
			type_label: device.type?.replace('_', ' ') ?? 'Unknown',
			battery_display: device.battery_level === null ? 'N/A' : `${device.battery_level}%`,
			last_seen: formatLastSeen(device.last_data_updated_at)
		}))
	);

	const deviceStatusBadges = {
		online: {
			label: 'Online',
			dotClass: 'bg-emerald-400',
			badgeClass: 'bg-emerald-500/15 text-emerald-200'
		},
		warning: {
			label: 'Warning',
			dotClass: 'bg-amber-400',
			badgeClass: 'bg-amber-500/15 text-amber-200'
		},
		offline: {
			label: 'Offline',
			dotClass: 'bg-rose-400',
			badgeClass: 'bg-rose-500/15 text-rose-200'
		}
	};

	const deviceColumns = [
		{
			key: 'name',
			label: 'Device',
			type: 'stacked',
			secondaryKey: 'dev_eui',
			sortable: true,
			href: (item: LocationDevice) =>
				resolve(
					`/locations/location/${locationId}/devices/device/${item.dev_eui}?prev=${currentPath}`
				)
		},
		{
			key: 'type_label',
			label: 'Type',
			value: 'type_label',
			sortable: true
		},
		{
			key: 'status',
			label: 'Status',
			type: 'badge',
			badges: deviceStatusBadges
		},
		{
			key: 'battery_display',
			label: 'Battery',
			value: 'battery_display',
			align: 'right',
			sortable: true
		},
		{
			key: 'last_seen',
			label: 'Last Seen',
			value: 'last_seen',
			sortable: true
		},
		{
			key: 'actions',
			label: 'Actions',
			type: 'buttons',
			align: 'right',
			buttons: [
				{
					label: 'View',
					variant: 'ghost',
					onClick: (row: unknown) =>
						goto(
							resolve(
								`/locations/location/${locationId}/devices/device/${
									(row as LocationDevice).dev_eui
								}?prev=${currentPath}`
							)
						)
				}
			]
		}
	];
</script>

<svelte:head>
	<title>{locationName} - CropWatch Temp</title>
</svelte:head>

<div class="min-h-screen p-6">
	<div class="space-y-6">
		<!-- Header -->
		<div class="flex items-start justify-between">
			<div>
				<div class="flex items-center gap-3">
					<CWBackButton fallback="/locations" />
					<div>
						<h1 class="text-2xl font-bold text-slate-100">{locationName} Location Detail</h1>
						<p class="mt-1 text-sm text-slate-400">{locationDescription}</p>
					</div>
				</div>
			</div>
			<div class="flex items-center gap-2">
				<div
					class="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/50 px-3 py-1.5"
				>
					<span class="text-sm text-slate-400">ID:</span>
					<code class="text-sm text-slate-300">{locationId}</code>
					<CWCopy value={locationId ?? ''} size="sm" showValue={false} />
				</div>
			</div>
		</div>

		<!-- Stats Row -->
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
			<div class="rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-lg">
				<div class="flex items-center gap-3">
					<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/20">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-5 w-5 text-sky-400"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							stroke-width="2"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2z"
							/>
						</svg>
					</div>
					<div>
						<p class="text-sm text-slate-400">Total Devices</p>
						<p class="text-xl font-semibold text-slate-100">{totalDevices}</p>
					</div>
				</div>
			</div>
			<div class="rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-lg">
				<div class="flex items-center gap-3">
					<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-5 w-5 text-emerald-400"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							stroke-width="2"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z"
							/>
						</svg>
					</div>
					<div>
						<p class="text-sm text-slate-400">Online</p>
						<p class="text-xl font-semibold text-emerald-400">{onlineDevices}</p>
					</div>
				</div>
			</div>
			<div class="rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-lg">
				<div class="flex items-center gap-3">
					<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/20">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-5 w-5 text-purple-400"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							stroke-width="2"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
							/>
						</svg>
					</div>
					<div>
						<p class="text-sm text-slate-400">Users</p>
						<p class="text-xl font-semibold text-slate-100">{locationPermissions.length}</p>
					</div>
				</div>
			</div>
			<div class="rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-lg">
				<div class="flex items-center gap-3">
					<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-5 w-5 text-amber-400"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							stroke-width="2"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
							/>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
							/>
						</svg>
					</div>
					<div>
						<p class="text-sm text-slate-400">Coordinates</p>
						<p class="text-sm font-medium text-slate-300">
							{locationLat.toFixed(4)}, {locationLong.toFixed(4)}
						</p>
					</div>
				</div>
			</div>
		</div>

		<!-- Location Settings Section -->
		<div class="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg">
			<div class="mb-4 flex items-center justify-between">
				<h2 class="text-lg font-semibold text-slate-100">Location Settings</h2>
				{#if !isEditingSettings && canManageLocationSettings}
					<CWButton variant="ghost" size="sm" onclick={startEditSettings}>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-4 w-4"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							stroke-width="2"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
							/>
						</svg>
						Edit
					</CWButton>
				{/if}
			</div>

			{#if isEditingSettings}
				<div class="space-y-4">
					<div>
						<label for="edit-name" class="mb-1 block text-sm font-medium text-slate-300"
							>Location Name</label
						>
						<input
							id="edit-name"
							type="text"
							bind:value={editName}
							class="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 placeholder-slate-500 transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
						/>
					</div>
					<div>
						<label for="edit-desc" class="mb-1 block text-sm font-medium text-slate-300"
							>Description</label
						>
						<textarea
							id="edit-desc"
							bind:value={editDescription}
							rows="3"
							class="w-full resize-none rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 placeholder-slate-500 transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
						></textarea>
					</div>
					<div class="flex justify-end gap-2">
						<CWButton variant="ghost" onclick={cancelEditSettings}>Cancel</CWButton>
						<CWButton variant="primary" loading={savingSettings} onclick={saveSettings}
							>Save Changes</CWButton
						>
					</div>
				</div>
			{:else}
				<div class="grid gap-4 sm:grid-cols-2">
					<div>
						<p class="text-sm text-slate-400">Name</p>
						<p class="font-medium text-slate-200">{locationName}</p>
					</div>
					<div>
						<p class="text-sm text-slate-400">Description</p>
						<p class="font-medium text-slate-200">{locationDescription || 'No description'}</p>
					</div>
					<div>
						<p class="text-sm text-slate-400">Latitude</p>
						<p class="font-medium text-slate-200">{locationLat}</p>
					</div>
					<div>
						<p class="text-sm text-slate-400">Longitude</p>
						<p class="font-medium text-slate-200">{locationLong}</p>
					</div>
				</div>
			{/if}
		</div>

		<!-- Devices Section -->
		<div class="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg">
			<div class="mb-4 flex items-center justify-between">
				<h2 class="text-lg font-semibold text-slate-100">Devices</h2>
				{#if canAddOrRemoveDevices}
					<CWButton
						variant="primary"
						size="sm"
						onclick={() => goto(resolve(`/locations/location/${locationId}/create-device`))}
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-4 w-4"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							stroke-width="2"
						>
							<path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
						</svg>
						Add Device
					</CWButton>
				{:else}
					<span class="text-xs text-slate-500">Admin access required to add devices</span>
				{/if}
			</div>

			<svelte:boundary>
				<CWTable
					items={deviceTableItems}
					columns={deviceColumns}
					storageKey={`location-${locationId}-devices`}
					pageSize={8}
					class="text-sm"
					virtual={deviceTableItems.length > 30}
				>
					{#snippet empty()}
						<div class="flex flex-col items-center justify-center py-12 text-center">
							<div
								class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-800"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									class="h-8 w-8 text-slate-400"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
									stroke-width="2"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2z"
									/>
								</svg>
							</div>
							<p class="text-slate-400">No devices in this location</p>
							<p class="mt-1 text-sm text-slate-400">Add a device to get started</p>
						</div>
					{/snippet}
				</CWTable>
				{#snippet failed(error, reset)}
					<div class="flex flex-col items-center justify-center py-12 text-center">
						<div
							class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-rose-900/30"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="h-8 w-8 text-rose-400"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								stroke-width="2"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
								/>
							</svg>
						</div>
						<p class="text-rose-300 font-medium">Failed to load devices</p>
						<p class="mt-1 text-sm text-slate-400">
							{(error as Error)?.message || 'An unexpected error occurred'}
						</p>
						<button
							onclick={reset}
							class="mt-4 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-sm transition-colors"
						>
							Try again
						</button>
					</div>
				{/snippet}
			</svelte:boundary>
		</div>

		<!-- Permissions Section -->
		<div class="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg">
			<CWLocationPermission
				{supabase}
				locationId={parseInt(locationId ?? '0')}
				permissions={locationPermissions}
				currentUserId={currentUserId}
				currentUserPermissionLevel={currentLocationPermissionLevel}
				canEdit={canManageLocationSettings}
				canRemove={canAddOrRemoveDevices}
				onPermissionsChange={async () => {
					await invalidate('location:permissions');
				}}
			/>
		</div>
	</div>
</div>

<!-- Add Device Dialog -->
<CWDialog bind:open={showAddDeviceDialog} title="Add Device to Location">
	<div class="space-y-4">
		<p class="text-sm text-slate-400">Select a device to add to this location.</p>

		{#if availableDevices.length > 0}
			<div>
				<label for="select-device" class="mb-1 block text-sm font-medium text-slate-300"
					>Available Devices</label
				>
				<select
					id="select-device"
					bind:value={selectedDeviceToAdd}
					class="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
				>
					{#each availableDevices as device (device.dev_eui)}
						<option value={device.dev_eui}>{device.name} ({device.dev_eui})</option>
					{/each}
				</select>
			</div>
		{:else}
			<p class="text-center text-slate-400">No available devices to add.</p>
		{/if}

		<div class="flex justify-end gap-2 pt-2">
			<CWButton variant="ghost" onclick={() => (showAddDeviceDialog = false)}>Cancel</CWButton>
			<CWButton
				variant="primary"
				loading={addingDevice}
				onclick={addDevice}
				disabled={!selectedDeviceToAdd}
			>
				Add Device
			</CWButton>
		</div>
	</div>
</CWDialog>
