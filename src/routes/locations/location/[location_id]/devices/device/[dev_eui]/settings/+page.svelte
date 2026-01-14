<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { getContext, untrack } from 'svelte';
	import type { AppState } from '$lib/Interfaces/appState.interface';
	import type { Device } from '$lib/Interfaces/device.interface';
	import type { Location } from '$lib/Interfaces/location.interface';
	import type { Facility } from '$lib/Interfaces/facility.interface';
	import CWButton from '$lib/components/CWButton.svelte';
	import CWBackButton from '$lib/components/CWBackButton.svelte';
	import CWDialog from '$lib/components/CWDialog.svelte';
	import DOWNLOAD_ICON from '$lib/images/icons/download.svg';
	import SAVE_ICON from '$lib/images/icons/save.svg';
	import CWCopy from '$lib/components/CWCopy.svelte';
	import CWDevicePermissionItem from '$lib/components/CWDevicePermissionItem.svelte';
	import type { PermissionUser } from '$lib/components/CWPermissionRowItem.svelte';
	import type { SupabaseClient } from '@supabase/supabase-js';

	interface Props {
		data: {
			supabase: SupabaseClient;
			deviceOwners: {
				user_id: string;
				permission_level: number;
				profiles: { id: string; full_name: string; email: string; avatar_url?: string | null } | null;
			}[];
			device: Partial<Device> | null;
		};
	}

	let { data }: Props = $props();

	const currentUserId = $derived(page.data?.session?.user?.id ?? '');

	const getAppState = getContext<() => AppState>('appState');
	let appState = $derived(getAppState());

	let device: Device | undefined = $derived(
		appState.devices.find((d: Device) => d.id === page.params.dev_eui) ?? (data.device as Device | undefined)
	);

	let location: Location | undefined = $derived(
		appState.locations.find((l: Location) => l.id === device?.locationId)
	);

	let facility: Facility | undefined = $derived(
		appState.facilities.find((f: Facility) => f.id === device?.facilityId)
	);
	
	let readyToDelete: boolean = $state(false);

	// Form state - track user edits separately from source data
	// Using class-based state for form to allow controlled initialization
	class FormState {
		deviceName = $state('');
		locationId = $state('');
		initialized = false;

		init(name: string, locId: string) {
			if (!this.initialized) {
				this.deviceName = name;
				this.locationId = locId;
				this.initialized = true;
			}
		}
	}
	const form = new FormState();

	// Initialize form when device loads
	$effect(() => {
		if (device) {
			untrack(() => form.init(device!.name ?? '', device!.locationId ?? ''));
		}
	});

	let isSaving = $state(false);
	let showDeleteDialog = $state(false);
	let showTransferDialog = $state(false);

	const deviceInfo = $derived({
		type: 'Device',
		manufacturer: 'CropWatch',
		model: device?.deviceType ?? 'Unknown',
		firmwareVersion: '2.4.1',
		hardwareVersion: '1.2',
		serialNumber: device?.id ?? device?.devEUI ?? 'Unknown',
		batteryLastChanged: '2024-08-15',
		warrantyStart: '2024-01-01',
		warrantyEnd: '2027-01-01',
		purchaseDate: '2023-12-20',
		lastCalibration: '2024-06-01',
		nextCalibration: '2025-06-01'
	});

	const devicePermissionUsers = $derived<PermissionUser[]>(
		(data.deviceOwners || []).map((owner) => ({
			id: owner.user_id,
			user_id: owner.user_id,
			full_name: owner.profiles?.full_name ?? 'Unknown user',
			email: owner.profiles?.email ?? '',
			avatar_url: owner.profiles?.avatar_url ?? null,
			permission_level: (owner.permission_level as 1 | 2 | 3 | 4) ?? 4
		}))
	);

	let permissions = $state<PermissionUser[]>([]);

	$effect(() => {
		permissions = devicePermissionUsers;
	});

	const currentDevicePermissionLevel = $derived(
		permissions.find((p) => p.user_id === currentUserId)?.permission_level ?? 4
	);

	const canEditDevice = $derived(currentDevicePermissionLevel <= 2);
	const canAdminDevice = $derived(currentDevicePermissionLevel === 1);

	async function handleSaveGeneral() {
		isSaving = true;
		// Simulate API call
		await new Promise((resolve) => setTimeout(resolve, 1000));
		isSaving = false;
		// Show success toast here
	}

	async function handlePermissionChange(user: PermissionUser, newLevel: number) {
		if (!canEditDevice) return;
		isSaving = true;
		try {
			const { error } = await data.supabase
				.from('cw_device_owners')
				.update({ permission_level: newLevel })
				.eq('dev_eui', page.params.dev_eui)
				.eq('user_id', user.user_id);

			if (error) {
				console.error('Error updating device permission:', error);
				return;
			}

			permissions = permissions.map((p) =>
				p.user_id === user.user_id ? { ...p, permission_level: newLevel as 1 | 2 | 3 | 4 } : p
			);
		} finally {
			isSaving = false;
		}
	}

	function formatDate(dateString: string) {
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	}

	function isWarrantyActive(endDate: string) {
		return new Date(endDate) > new Date();
	}

	function daysUntilExpiry(endDate: string) {
		const diff = new Date(endDate).getTime() - new Date().getTime();
		return Math.ceil(diff / (1000 * 60 * 60 * 24));
	}

	async function deleteDevice() {
		// Implement device deletion logic here
		showDeleteDialog = false;
		const result = await fetch(`/api/private/devices/${page.params.dev_eui}`, {
			method: 'DELETE'
		});
		
		if (result.ok) {
			// Redirect to location page after successful deletion
			goto(`/locations/location/${device?.locationId}`);
		} else {
			// Handle error - could show a toast notification here
			const error = await result.json();
			console.error('Failed to delete device:', error);
		}
	}
</script>

<div class="flex min-h-screen flex-col gap-6 bg-slate-950 p-6 text-slate-100">
	<!-- Header -->
	<div class="flex flex-wrap items-center justify-between gap-4">
		<div class="flex items-center gap-4">
			<CWBackButton />
			<div>
				<h1 class="text-2xl font-semibold text-white">Device Settings</h1>
				<p class="text-sm text-slate-400">{device?.name ?? 'Unknown Device'} • {device?.id}</p>
			</div>
		</div>
	</div>

	<div class="grid gap-6 lg:grid-cols-3">
		<!-- Left Column - Settings Forms -->
		<div class="flex flex-col gap-6 lg:col-span-2">
			<!-- General Settings -->
			<section class="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg">
				<h2 class="text-lg font-semibold text-white">General Settings</h2>
				<p class="mt-1 text-sm text-slate-400">Update device name and location assignment</p>

				<div class="mt-6 space-y-4">
					<div>
						<label for="deviceName" class="block text-sm font-medium text-slate-300">
							Device Name
						</label>
						<input
							id="deviceName"
							type="text"
							bind:value={form.deviceName}
							disabled={!canEditDevice}
							class="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition-colors focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
							placeholder="Enter device name"
						/>
					</div>

					<div>
						<label for="location" class="block text-sm font-medium text-slate-300">
							Location
						</label>
						<select
							id="location"
							bind:value={form.locationId}
							disabled={!canEditDevice}
							class="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-slate-100 transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
						>
							{#each appState.locations as loc (loc.id)}
								<option value={loc.id}>{loc.name}</option>
							{/each}
						</select>
						<p class="mt-1.5 text-xs text-slate-400">
							Current: {location?.name ?? 'Unknown'} at {facility?.name ?? 'Unknown Facility'}
						</p>
					</div>

					<div class="flex justify-end pt-2">
						{#if canEditDevice}
							<CWButton variant="primary" onclick={handleSaveGeneral} loading={isSaving}>
								<img src={SAVE_ICON} alt="Save" class="h-4 w-4 mr-1" />
								Save Changes
							</CWButton>
						{:else}
							<span class="text-xs text-slate-500">Editor or Admin access required to edit settings</span>
						{/if}
					</div>
				</div>
			</section>

			<!-- User Permissions -->
			<section class="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg">
				<div class="flex items-center justify-between">
					<div>
						<h2 class="text-lg font-semibold text-white">User Permissions</h2>
						<p class="mt-1 text-sm text-slate-400">Manage who can access this device</p>
					</div>
				</div>

				<div class="mt-6 space-y-3">
					<svelte:boundary>
						{#each permissions as user (user.id)}
							<CWDevicePermissionItem
								user={user}
								supabase={data.supabase}
								currentUserId={currentUserId}
								currentUserPermissionLevel={currentDevicePermissionLevel as 1 | 2 | 3 | 4}
								permissionLevels={[
									{ id: 1, name: 'Admin', description: 'Full control for this device.' },
									{ id: 2, name: 'Editor', description: 'Can rename and create alerts/reports.' },
									{ id: 3, name: 'User', description: 'View only.' },
									{ id: 4, name: 'Disabled', description: 'No access.' }
								]}
								onPermissionChange={handlePermissionChange}
							/>
						{/each}
						{#snippet failed(error, reset)}
							<div class="flex flex-col items-center justify-center py-8 text-center">
								<div class="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-900/30">
									<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
										<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
									</svg>
								</div>
								<p class="text-rose-300 font-medium">Failed to load permissions</p>
								<p class="mt-1 text-sm text-slate-400">{(error as Error)?.message || 'An unexpected error occurred'}</p>
								<button onclick={reset} class="mt-4 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-sm transition-colors">
									Try again
								</button>
							</div>
						{/snippet}
					</svelte:boundary>
				</div>
			</section>

			<!-- Reports -->
			<section class="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg">
				<h2 class="text-lg font-semibold text-white">Reports</h2>
				<p class="mt-1 text-sm text-slate-400">Generate and download device reports</p>

				<div class="mt-6 grid gap-4 sm:grid-cols-2">
					<button
						class="group flex items-start gap-4 rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-left transition-all hover:border-sky-500/50 hover:bg-slate-900/60"
					>
						<div class="rounded-lg bg-sky-500/20 p-3 text-sky-400">
							<svg
								class="h-6 w-6"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								stroke-width="2"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
								/>
							</svg>
						</div>
						<div>
							<p class="font-medium text-white group-hover:text-sky-400">Daily Summary</p>
							<p class="mt-1 text-sm text-slate-400">Temperature and humidity averages</p>
						</div>
					</button>

					<button
						class="group flex items-start gap-4 rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-left transition-all hover:border-emerald-500/50 hover:bg-slate-900/60"
					>
						<div class="rounded-lg bg-emerald-500/20 p-3 text-emerald-400">
							<svg
								class="h-6 w-6"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								stroke-width="2"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
								/>
							</svg>
						</div>
						<div>
							<p class="font-medium text-white group-hover:text-emerald-400">Weekly Analytics</p>
							<p class="mt-1 text-sm text-slate-400">Trends and anomaly detection</p>
						</div>
					</button>

					<button
						class="group flex items-start gap-4 rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-left transition-all hover:border-amber-500/50 hover:bg-slate-900/60"
					>
						<div class="rounded-lg bg-amber-500/20 p-3 text-amber-400">
							<svg
								class="h-6 w-6"
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
						<div>
							<p class="font-medium text-white group-hover:text-amber-400">Alert History</p>
							<p class="mt-1 text-sm text-slate-400">All alerts and resolutions</p>
						</div>
					</button>

					<button
						class="group flex items-start gap-4 rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-left transition-all hover:border-purple-500/50 hover:bg-slate-900/60"
					>
						<div class="rounded-lg bg-purple-500/20 p-3 text-purple-400">
							<svg
								class="h-6 w-6"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								stroke-width="2"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
								/>
							</svg>
						</div>
						<div>
							<p class="font-medium text-white group-hover:text-purple-400">Export Data</p>
							<p class="mt-1 text-sm text-slate-400">Download CSV or JSON</p>
						</div>
					</button>
				</div>
			</section>

			<!-- Danger Zone -->
			<section class="rounded-2xl border border-red-900/50 bg-red-950/20 p-6 shadow-lg">
				<h2 class="text-lg font-semibold text-red-400">Danger Zone</h2>
				<p class="mt-1 text-sm text-slate-400">Irreversible actions for this device</p>

				<div class="mt-6 space-y-4">
					<div
						class="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900/40 p-4"
					>
						<div>
							<p class="font-medium text-white">Transfer Ownership</p>
							<p class="text-sm text-slate-400">Transfer this device to another user</p>
						</div>
						<CWButton variant="secondary" size="sm" onclick={() => (showTransferDialog = true)}>
							Transfer
						</CWButton>
					</div>

					<div
						class="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-red-900/30 bg-red-950/30 p-4"
					>
						<div>
							<p class="font-medium text-white">Delete Device</p>
							<p class="text-sm text-slate-400">Permanently remove this device and all its data</p>
						</div>
						<CWButton variant="danger" size="sm" onclick={() => (showDeleteDialog = true)}>
							Delete Device
						</CWButton>
					</div>
				</div>
			</section>
		</div>

		<!-- Right Column - Device Info -->
		<div class="flex flex-col gap-6">
			<!-- Device Information -->
			<section class="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg">
				<h2 class="text-lg font-semibold text-white">Device Information</h2>

				<div class="mt-6 space-y-4">
					<div class="flex items-center justify-between border-b border-slate-800 pb-3">
						<span class="text-sm text-slate-400">Type</span>
						<span class="text-sm font-medium text-white"
							><CWCopy value={deviceInfo.type} size="sm" /></span
						>
					</div>
					<div class="flex items-center justify-between border-b border-slate-800 pb-3">
						<span class="text-sm text-slate-400">Model</span>
						<span class="text-sm font-medium text-white"
							><CWCopy value={deviceInfo.model} size="sm" /></span
						>
					</div>
					<div class="flex items-center justify-between border-b border-slate-800 pb-3">
						<span class="text-sm text-slate-400">Serial Number</span>
						<span class="font-mono text-sm text-white"
							><CWCopy value={deviceInfo.serialNumber} size="sm" /></span
						>
					</div>
					<div class="flex items-center justify-between border-b border-slate-800 pb-3">
						<span class="text-sm text-slate-400">Firmware</span>
						<span class="text-sm font-medium text-white">v{deviceInfo.firmwareVersion}</span>
					</div>
					<div class="flex items-center justify-between">
						<span class="text-sm text-slate-400">Hardware</span>
						<span class="text-sm font-medium text-white">v{deviceInfo.hardwareVersion}</span>
					</div>
				</div>
			</section>

			<!-- Warranty & Maintenance -->
			<section class="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg">
				<h2 class="text-lg font-semibold text-white">Warranty & Maintenance</h2>

				<div class="mt-6 space-y-4">
					<!-- Warranty Status -->
					<div class="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
						<div class="flex items-center justify-between">
							<span class="text-sm text-slate-400">Warranty Status</span>
							{#if isWarrantyActive(deviceInfo.warrantyEnd)}
								<span
									class="rounded-full bg-emerald-500/20 px-2.5 py-1 text-xs font-medium text-emerald-400 ring-1 ring-emerald-500/30"
								>
									Active
								</span>
							{:else}
								<span
									class="rounded-full bg-red-500/20 px-2.5 py-1 text-xs font-medium text-red-400 ring-1 ring-red-500/30"
								>
									Expired
								</span>
							{/if}
						</div>
						<p class="mt-2 text-sm text-white">
							{formatDate(deviceInfo.warrantyStart)} — {formatDate(deviceInfo.warrantyEnd)}
						</p>
						{#if isWarrantyActive(deviceInfo.warrantyEnd)}
							<p class="mt-1 text-xs text-slate-400">
								{daysUntilExpiry(deviceInfo.warrantyEnd)} days remaining
							</p>
						{/if}
					</div>

					<!-- Battery -->
					<div class="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
						<div class="flex items-center justify-between">
							<span class="text-sm text-slate-400">Battery Last Changed</span>
							<span class="text-sm font-medium text-white"
								>{formatDate(deviceInfo.batteryLastChanged)}</span
							>
						</div>
					</div>

					<!-- Calibration -->
					<div class="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
						<div class="flex items-center justify-between">
							<span class="text-sm text-slate-400">Last Calibration</span>
							<span class="text-sm font-medium text-white"
								>{formatDate(deviceInfo.lastCalibration)}</span
							>
						</div>
						<div class="mt-2 flex items-center justify-between">
							<span class="text-sm text-slate-400">Next Calibration</span>
							<span class="text-sm font-medium text-amber-400"
								>{formatDate(deviceInfo.nextCalibration)}</span
							>
						</div>

						<div class="mt-2 flex items-center justify-between">
							<span class="text-sm text-slate-400">Sensor 1</span>
							<span class="text-sm font-medium text-white">xxxxxxx</span>
						</div>

						<div class="mt-2 flex items-center justify-between">
							<span class="text-sm text-slate-400">Sensor 2</span>
							<span class="text-sm font-medium text-white">xxxxxxx</span>
						</div>

						<div class="mt-2 flex items-center justify-between">
							<span class="text-sm text-slate-400">Calibration Report</span>
							<span class="text-sm font-medium text-white">
								<CWButton variant="secondary" size="sm">
									<img src={DOWNLOAD_ICON} alt="Download" class="h-4 w-4 mr-1" />
									Download
								</CWButton>
							</span>
						</div>
					</div>
				</div>
			</section>

			<!-- Order Parts -->
			<section class="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg">
				<h2 class="text-lg font-semibold text-white">Order Parts</h2>
				<p class="mt-1 text-sm text-slate-400">Need replacement parts or accessories?</p>

				<div class="mt-6 space-y-3">
					<a
						href="https://cropwatch.io/parts/batteries"
						target="_blank"
						rel="noopener noreferrer"
						class="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/40 p-4 transition-colors hover:border-sky-500/50 hover:bg-slate-900/60"
					>
						<div class="flex items-center gap-3">
							<div class="rounded-lg bg-emerald-500/20 p-2 text-emerald-400">
								<svg
									class="h-5 w-5"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
									stroke-width="2"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										d="M13 10V3L4 14h7v7l9-11h-7z"
									/>
								</svg>
							</div>
							<span class="text-sm font-medium text-white">Replacement Batteries</span>
						</div>
						<svg
							class="h-4 w-4 text-slate-400"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							stroke-width="2"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
							/>
						</svg>
					</a>

					<a
						href="https://cropwatch.io/parts/sensors"
						target="_blank"
						rel="noopener noreferrer"
						class="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/40 p-4 transition-colors hover:border-sky-500/50 hover:bg-slate-900/60"
					>
						<div class="flex items-center gap-3">
							<div class="rounded-lg bg-sky-500/20 p-2 text-sky-400">
								<svg
									class="h-5 w-5"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
									stroke-width="2"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
									/>
								</svg>
							</div>
							<span class="text-sm font-medium text-white">Sensor Probes</span>
						</div>
						<svg
							class="h-4 w-4 text-slate-400"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							stroke-width="2"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
							/>
						</svg>
					</a>

					<a
						href="https://cropwatch.io/parts/mounts"
						target="_blank"
						rel="noopener noreferrer"
						class="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/40 p-4 transition-colors hover:border-sky-500/50 hover:bg-slate-900/60"
					>
						<div class="flex items-center gap-3">
							<div class="rounded-lg bg-purple-500/20 p-2 text-purple-400">
								<svg
									class="h-5 w-5"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
									stroke-width="2"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
									/>
								</svg>
							</div>
							<span class="text-sm font-medium text-white">Mounting Hardware</span>
						</div>
						<svg
							class="h-4 w-4 text-slate-400"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							stroke-width="2"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
							/>
						</svg>
					</a>

					<a
						href="https://cropwatch.io"
						target="_blank"
						rel="noopener noreferrer"
						class="mt-4 flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-sky-500"
					>
						Visit CropWatch Store
						<svg
							class="h-4 w-4"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							stroke-width="2"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
							/>
						</svg>
					</a>
				</div>
			</section>
		</div>
	</div>
</div>

<!-- Delete Confirmation Dialog -->
<CWDialog bind:open={showDeleteDialog} title="Delete Device">
	<div class="space-y-4">
		<p class="text-slate-300">
			Are you sure you want to delete <strong class="text-white">{device?.name}</strong>? This
			action cannot be undone and all historical data will be permanently removed.
		</p>
		<div class="rounded-lg border border-red-900/50 bg-red-950/30 p-4">
			<p class="text-sm text-red-300">
				⚠️ This will delete all telemetry data, alerts, and reports associated with this device.
			</p>
		</div>

		<input
			type="checkbox"
			bind:checked={readyToDelete}
			id="confirmDelete"
			class="h-4 w-4 rounded border-slate-700 bg-slate-900/50 text-red-600 focus:ring-red-500"
		/>
		<label for="confirmDelete" class="text-sm text-slate-300">
			I understand that this action is irreversible and I want to permanently delete this device.
		</label>

		<div class="flex justify-end gap-3 pt-2">
			<CWButton variant="secondary" onclick={() => (showDeleteDialog = false)}>Cancel</CWButton>
			<CWButton variant="danger" disabled={!readyToDelete} onclick={() => deleteDevice()}>Delete Permanently</CWButton>
		</div>
	</div>
</CWDialog>

<!-- Transfer Ownership Dialog -->
<CWDialog bind:open={showTransferDialog} title="Transfer Ownership">
	<div class="space-y-4">
		<p class="text-slate-300">
			Transfer ownership of <strong class="text-white">{device?.name}</strong> to another user. They
			will become the new owner and you will lose admin access.
		</p>
		<div>
			<label for="transferEmail" class="block text-sm font-medium text-slate-300">
				New Owner Email
			</label>
			<input
				id="transferEmail"
				type="email"
				class="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition-colors focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
				placeholder="email@example.com"
			/>
		</div>
		<div class="flex justify-end gap-3 pt-2">
			<CWButton variant="secondary" onclick={() => (showTransferDialog = false)}>Cancel</CWButton>
			<CWButton variant="primary">Transfer Ownership</CWButton>
		</div>
	</div>
</CWDialog>
