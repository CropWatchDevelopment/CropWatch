<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import type { Device } from '$lib/Interfaces/device.interface';
	import type { Facility } from '$lib/Interfaces/facility.interface';
	import type { Location } from '$lib/Interfaces/location.interface';
	import LOCATION_ICON from '$lib/images/icons/location.svg';
	import GLOBE_LOCATION_PIN_ICON from '$lib/images/icons/globe_location_pin.svg';
	import SETTINGS_ICON from '$lib/images/icons/settings.svg';
	import EYE_ICON from '$lib/images/icons/eye.svg';
	import { goto } from '$app/navigation';

	let {
		facilities,
		locationsForFacility,
		devices,
		selectedFacilityId = $bindable(),
		selectedLocationId = $bindable(),
		total,
		offline,
		alerts
	} = $props<{
		facilities: Facility[];
		locationsForFacility: Location[];
		devices: Device[];
		selectedLocationId: string | 'all';
		selectedFacilityId: string | 'all';
		total: number;
		offline: number;
		alerts: number;
	}>();

	let search: string = $state('');
	let viewportWidth = $state(1280);
	let isDrawerOpen = $state(false);

	// Desktop: always visible, no drawer
	// Tablet & Mobile: use drawer that slides in
	const isDesktop = $derived(viewportWidth >= 1280);
	const useDrawer = $derived(!isDesktop);
	const sidebarWidth = 320;

	// Normalize search term for case-insensitive matching
	const searchTerm = $derived(search.trim().toLowerCase());

	// Filter facilities based on search term
	const filteredFacilities = $derived(
		searchTerm
			? facilities.filter((f: Facility) => {
					// Match facility name or code
					const facilityMatches =
						f.name.toLowerCase().includes(searchTerm) ||
						f.code.toLowerCase().includes(searchTerm);
					// Also include if any device in this facility matches
					const hasMatchingDevice = devices.some(
						(d: Device) =>
							d.facilityId === f.id &&
							d.name.toLowerCase().includes(searchTerm)
					);
					// Also include if any location in this facility matches
					const hasMatchingLocation = locationsForFacility.some(
						(loc: Location) =>
							loc.facilityId === f.id && loc.name.toLowerCase().includes(searchTerm)
					);
					return facilityMatches || hasMatchingDevice || hasMatchingLocation;
				})
			: facilities
	);

	// Filter locations based on search term
	const filteredLocations = $derived(
		searchTerm
			? locationsForFacility.filter((loc: Location) => {
					// Match location name
					const locationMatches = loc.name.toLowerCase().includes(searchTerm);
					// Also include if any device in this location matches
					const hasMatchingDevice = devices.some(
						(d: Device) =>
							d.locationId === loc.id &&
							d.name.toLowerCase().includes(searchTerm)
					);
					// Also include if parent facility matches
					const parentFacility = facilities.find((f: Facility) => f.id === loc.facilityId);
					const facilityMatches = parentFacility
						? parentFacility.name.toLowerCase().includes(searchTerm) ||
							parentFacility.code.toLowerCase().includes(searchTerm)
						: false;
					return locationMatches || hasMatchingDevice || facilityMatches;
				})
			: locationsForFacility
	);

	function closeDrawer() {
		isDrawerOpen = false;
	}

	function toggleDrawer() {
		isDrawerOpen = !isDrawerOpen;
	}

	function handleResize(width: number) {
		viewportWidth = width;
		// Close drawer when switching to desktop
		if (width >= 1280) {
			isDrawerOpen = false;
		}
	}

	onMount(() => {
		if (typeof window === 'undefined') return;
		handleResize(window.innerWidth);

		const resizeHandler = () => handleResize(window.innerWidth);
		const globalToggle = () => {
			if (useDrawer) {
				toggleDrawer();
			}
		};
		const escHandler = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				closeDrawer();
			}
		};

		window.addEventListener('resize', resizeHandler, { passive: true });
		window.addEventListener('sidebar:toggle', globalToggle);
		window.addEventListener('keydown', escHandler);

		return () => {
			window.removeEventListener('resize', resizeHandler);
			window.removeEventListener('sidebar:toggle', globalToggle);
			window.removeEventListener('keydown', escHandler);
		};
	});

	onDestroy(() => {
		closeDrawer();
	});
</script>

<!-- Responsive sidebar -->
<div class="relative h-full">
	<!-- Backdrop overlay for drawer mode -->
	{#if useDrawer && isDrawerOpen}
		<button
			type="button"
			class="fixed inset-0 z-30 bg-slate-950/70 backdrop-blur-sm"
			onclick={closeDrawer}
			aria-label="Close sidebar overlay"
		></button>
	{/if}

	<aside
		class={`flex flex-col gap-4 border-r h-full border-slate-800 bg-slate-900 p-4 transition-all duration-200 ease-in-out ${
			useDrawer
				? `fixed inset-y-0 left-0 z-40 transform shadow-2xl shadow-black/40 ${
						isDrawerOpen ? 'translate-x-0' : '-translate-x-full'
					}`
				: 'relative'
		}`}
		style={`width:${sidebarWidth}px;`}
	>
		<!-- Header with close button (only in drawer mode when open) -->
		<div class="flex items-center justify-between gap-2">
			{#if useDrawer && isDrawerOpen}
				<button
					onclick={closeDrawer}
					class="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-700 text-slate-200 transition hover:bg-slate-800"
					aria-label="Close sidebar"
				>
					<svg
						class="h-4 w-4"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						stroke-width="2"
					>
						<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			{/if}
		</div>

		<!-- Search -->
		<div>
			<h2 class="text-xs font-semibold uppercase tracking-wide text-slate-400">Global search</h2>
			<div
				class="mt-2 flex items-center gap-2 rounded-xl bg-slate-800/50 px-3 py-2 ring-1 ring-slate-700/70"
			>
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
						d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
					/>
				</svg>
				<input
					bind:value={search}
					class="flex-1 border-none bg-transparent text-sm outline-none placeholder:text-slate-400"
					placeholder="Search group, location, device…"
				/>
				{#if search}
					<button
						type="button"
						onclick={() => (search = '')}
						class="flex h-5 w-5 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-700 hover:text-slate-200"
						aria-label="Clear search"
					>
						<svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				{/if}
			</div>
		</div>

		<!-- Groups & Locations -->
		<div class="flex flex-1 min-h-0 flex-col gap-3">
			<!-- Groups -->
			<div class="flex flex-1 min-h-0 flex-col">
				<h2 class="text-xs font-semibold uppercase tracking-wide text-slate-400">Groups</h2>
				<div class="mt-2 flex-1 space-y-1 overflow-y-auto pr-1 text-sm">
					<button
						onclick={() => {
							selectedFacilityId = 'all';
							selectedLocationId = 'all';
						}}
						class={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left transition hover:bg-slate-800/70 ${
							selectedFacilityId === 'all' ? 'bg-slate-800' : ''
						}`}
					>
						<span class="flex items-center gap-2">
							<span
								class="inline-flex h-5 w-5 items-center justify-center rounded-md bg-slate-800 text-[10px] text-slate-300 ring-1 ring-slate-700/60"
							>
								all
							</span>
							<span>All groups</span>
						</span>
						<span class="text-xs text-slate-400">{devices?.length}</span>
					</button>

					{#each filteredFacilities as f (f.id)}
						{@const count = devices.filter((d: Device) => d.facilityId === f.id).length}
						{@const hasAlert = devices.some((d: Device) => d.facilityId === f.id && d.hasAlert)}
						<button
							onclick={() => {
								selectedFacilityId = f.id;
								selectedLocationId = 'all';
							}}
							class={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left transition hover:bg-slate-800/70 ${
								selectedFacilityId === f.id ? 'bg-slate-800' : ''
							}`}
						>
							<span class="flex items-center gap-2">
								<span
									class="inline-flex h-5 w-8 items-center justify-center rounded-md bg-slate-900 text-[10px] font-semibold tracking-tight text-slate-200 ring-1 ring-slate-700/70"
								>
									{f.code}
								</span>
								<span class="truncate" title={f.name}>{f.name}</span>
							</span>
							<span class="flex items-center gap-1 text-xs text-slate-400">
								{#if hasAlert}
									<span class="inline-flex h-2 w-2 rounded-full bg-amber-400"></span>
								{/if}
								<span>{count}</span>
							</span>
						</button>
					{:else}
						{#if searchTerm}
							<p class="px-2 py-3 text-center text-xs text-slate-500">No groups match "{search}"</p>
						{/if}
					{/each}
				</div>
			</div>

			<!-- Locations -->
			<div class="flex flex-1 min-h-0 flex-col border-t border-slate-800 pt-3">
				<h2 class="text-xs font-semibold uppercase tracking-wide text-slate-400">Locations</h2>
				<div class="mt-2 flex-1 space-y-1 overflow-y-auto pr-1 text-sm">
					<span class="flex flex-row items-center group">
						<button
							onclick={() => (selectedLocationId = 'all')}
							class={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left transition hover:bg-slate-800/70 ${
								selectedLocationId === 'all' ? 'bg-slate-800' : ''
							}`}
						>
							<span>
								<img
									src={GLOBE_LOCATION_PIN_ICON}
									alt="Globe location pin icon"
									class="inline-block h-4 w-4 mr-1"
								/>
								All locations
							</span>
							<span class="text-xs text-slate-400">{devices?.length}</span>
						</button>
						<button
							class="hidden group-hover:flex px-1 text-slate-400 hover:text-slate-200"
							onclick={() => goto('/locations')}
						>
							<img src={EYE_ICON} alt="View all locations" class="h-4 w-4" />
						</button>
					</span>
					{#each filteredLocations as loc (loc.id)}
						{@const locDevices = devices.filter((d: Device) => d.locationId === loc.id)}
						{@const hasAlert = locDevices.some((d: Device) => d.hasAlert)}
						<span class="flex flex-row items-center group">
							<button
								onclick={() => (selectedLocationId = loc.id)}
								class={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left transition hover:bg-slate-800/70 ${
									selectedLocationId === loc.id ? 'bg-slate-800' : ''
								}`}
							>
								<span class="truncate" title={loc.name}>
									<img src={LOCATION_ICON} alt="Location icon" class="inline-block h-4 w-4 mr-1" />
									{loc.name}
								</span>
								<span class="flex items-center gap-1 text-xs text-slate-400">
									{#if hasAlert}
										<span class="inline-flex h-2 w-2 rounded-full bg-amber-400"></span>
									{/if}
									<span>{locDevices.length}</span>
								</span>
							</button>
							<button
								class="hidden group-hover:flex bg-blue-800 p-2 text-slate-400 hover:text-slate-200"
								onclick={() => goto(`/locations/location/${loc.id}`)}
							>
								<img src={SETTINGS_ICON} alt="More options icon" class="h-4 w-4" />
							</button>
						</span>
					{:else}
						{#if searchTerm}
							<p class="px-2 py-3 text-center text-xs text-slate-500">No locations match "{search}"</p>
						{/if}
					{/each}
				</div>
			</div>
		</div>

		<!-- Stats Footer -->
		<div class="mt-auto space-y-2 border-t border-slate-800 pt-3 text-xs text-slate-400">
			<p>All Locations:</p>
			<div class="flex items-center justify-between">
				<span>Total in view</span>
				<span class="font-mono text-slate-200">{total}</span>
			</div>
			<div class="flex items-center justify-between">
				<span>Alerts</span>
				<span class="font-mono text-amber-300">{alerts}</span>
			</div>
			<div class="flex items-center justify-between">
				<span>Offline</span>
				<span class="font-mono text-rose-300">{offline}</span>
			</div>
		</div>
	</aside>
</div>
