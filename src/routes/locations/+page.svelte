<script lang="ts">
	import CWTable from '$lib/components/CWTable.svelte';
	import CWButton from '$lib/components/CWButton.svelte';
	import CWBackButton from '$lib/components/CWBackButton.svelte';
	import { goto } from '$app/navigation';

	interface LocationItem {
		location_id: number;
		name: string;
		description: string | null;
		lat: number | null;
		long: number | null;
		group: string;
		created_at: string;
		owner_id: string | null;
		owner_name: string | null;
		owner_email: string | null;
		device_count: number;
		is_owner: boolean;
		permission_level: number | null;
	}

	interface Props {
		data: {
			locations: LocationItem[];
		};
	}

	let { data }: Props = $props();

	// Column configuration for CWTable
	const columns = [
		{
			key: 'name',
			label: 'Location',
			type: 'stacked' as const,
			secondaryKey: 'description'
		},
		{
			key: 'group',
			label: 'Group',
			type: 'text' as const,
			tdClass: 'text-slate-300'
		},
		{
			key: 'owner_name',
			label: 'Owner',
			type: 'stacked' as const,
			secondaryKey: 'owner_email'
		},
		{
			key: 'device_count',
			label: 'Devices',
			type: 'number' as const
		},
		{
			key: 'is_owner',
			label: 'Role',
			type: 'badge' as const,
			badges: {
				'true': {
					label: 'Owner',
					badgeClass: 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
				},
				'false': {
					label: 'Shared',
					badgeClass: 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
				}
			}
		},
		{
			key: 'created_at',
			label: 'Created',
			type: 'datetime' as const
		},
		{
			key: 'actions',
			label: '',
			type: 'buttons' as const,
			buttons: [
				{
					label: 'View',
					variant: 'ghost' as const,
					onClick: (item: LocationItem) => {
						goto(`/locations/location/${item.location_id}`);
					}
				}
			]
		}
	];

	function getRowId(item: unknown): string {
		return String((item as LocationItem).location_id);
	}

	// Stats
	const totalLocations = $derived(data.locations.length);
	const ownedLocations = $derived(data.locations.filter((l) => l.is_owner).length);
	const sharedLocations = $derived(data.locations.filter((l) => !l.is_owner).length);
	const totalDevices = $derived(data.locations.reduce((sum, l) => sum + l.device_count, 0));
</script>

<svelte:head>
	<title>Locations - CropWatch Temp</title>
</svelte:head>

<div class="min-h-screen p-6">
	<div class=" space-y-6">
		<!-- Header -->
		<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
			<div>
				<CWBackButton fallback="/" label="Back to Dashboard" class="mb-2" />
				<h1 class="text-2xl font-bold text-slate-100">All Locations</h1>
				<p class="mt-1 text-sm text-slate-400">View all locations & Create new locations</p>
			</div>
			<CWButton variant="primary" onclick={() => goto('/locations/create-location')}>
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
				Create Location
			</CWButton>
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
						<p class="text-sm text-slate-400">Total Locations</p>
						<p class="text-xl font-semibold text-slate-100">{totalLocations}</p>
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
								d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
							/>
						</svg>
					</div>
					<div>
						<p class="text-sm text-slate-400">Owned by You</p>
						<p class="text-xl font-semibold text-purple-400">{ownedLocations}</p>
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
								d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
							/>
						</svg>
					</div>
					<div>
						<p class="text-sm text-slate-400">Shared with You</p>
						<p class="text-xl font-semibold text-emerald-400">{sharedLocations}</p>
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
								d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2z"
							/>
						</svg>
					</div>
					<div>
						<p class="text-sm text-slate-400">Total Devices</p>
						<p class="text-xl font-semibold text-amber-400">{totalDevices}</p>
					</div>
				</div>
			</div>
		</div>

		<!-- Locations Table -->
		<div class="rounded-2xl border border-slate-800 bg-slate-900 shadow-lg">
			<svelte:boundary>
				<CWTable
					items={data.locations}
					{columns}
					{getRowId}
					storageKey="locations-table"
					pageSize={10}
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
										d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
									/>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
									/>
								</svg>
							</div>
							<p class="text-slate-400">No locations found</p>
							<p class="mt-1 text-sm text-slate-400">
								Create a location to start monitoring your devices
							</p>
							<CWButton
								variant="primary"
								class="mt-4"
								onclick={() => goto('/locations/create-location')}
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
								Create Your First Location
							</CWButton>
						</div>
					{/snippet}
				</CWTable>

				{#snippet failed(error, reset)}
					<div class="flex flex-col items-center justify-center py-12 text-center">
						<div class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-rose-900/30">
							<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
								<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
							</svg>
						</div>
						<p class="text-rose-300 font-medium">Failed to load locations table</p>
						<p class="mt-1 text-sm text-slate-400">{(error as Error)?.message || 'An unexpected error occurred'}</p>
						<button onclick={reset} class="mt-4 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-sm transition-colors">
							Try again
						</button>
					</div>
				{/snippet}
			</svelte:boundary>
		</div>
	</div>
</div>
