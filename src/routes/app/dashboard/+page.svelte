<script lang="ts">
	import Spinner from '$lib/components/Spinner.svelte';
	import AllLocations from '$lib/components/UI/dashboard/AllLocations.svelte';
	import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
	import { onDestroy, onMount } from 'svelte';
	import type { Database } from '../../../../database.types.js';
	import { convertObject } from '$lib/utilities/ConvertSensorDataObject.js';
	import { error, success, warning } from '$lib/stores/toast.svelte.js';
	import Icon from '$lib/components/ui/base/Icon.svelte';
	import { mdiClose, mdiMagnify } from '@mdi/js';
	import { invalidateAll } from '$app/navigation';
	import { throttle } from './dashboardThrottle.js';

	type cw_device = Database['public']['Tables']['cw_devices']['Row'];
	type cw_locations = Database['public']['Tables']['cw_locations']['Row'] & {
		cw_devices: (cw_device & { cw_device_type: { name: string; data_table_v2: string | null } })[];
	};

	let { data } = $props();
	let locations = $state(data.locations);
	let locationsAfterFilter = $state(data.locations);
	let supabase: SupabaseClient = data.supabase;
	let realtime: RealtimeChannel | null = null;
	let searchTerm: string = $state('');
	const MIN_INTERVAL_MS = 60_000; // throttle window
	const STALE_AFTER_MS = 30_000; // only refresh if older than this

	let lastFetchAt = 0; // update this after each successful refresh
	let inFlight = false; // avoid overlap

	async function refreshLocations() {
		// skip if data is fresh enough
		const now = Date.now();
		if (now - lastFetchAt < STALE_AFTER_MS) return;
		if (inFlight) return;

		inFlight = true;
		try {
			await invalidateAll(); // re-run +page.(server)load / +page.load
			lastFetchAt = Date.now();
		} finally {
			inFlight = false;
		}
	}

	function teardownRealtime() {
		if (realtime) {
			supabase.removeChannel(realtime);
			realtime = null;
			console.log('Realtime channel removed due to tab change.');
		}
	}

	function handleBlur() {
		// user moved to another window
		teardownRealtime();
	}

	const throttledRefresh = throttle(
		() => {
			if (document.visibilityState === 'visible') {
				void refreshLocations();
			}
		},
		MIN_INTERVAL_MS,
		{ trailing: true }
	);
	const applyQueuedUpdates = throttle(
		() => {
			// flush any queued records into your locations structure, then:
			locations = [...locations];
		},
		500,
		{ trailing: true }
	);
	function onRealtimeRecord(rec: any) {
		// push to a queue you manage, then:
		applyQueuedUpdates();
	}

	function handleVisibility() {
		if (document.visibilityState === 'visible') throttledRefresh();
		if (document.visibilityState === 'hidden') {
			console.log('Tab is hidden, tearing down realtime connection.');
			teardownRealtime();
		}
	}

	function handleFocus() {
		throttledRefresh();
	}

	// For back/forward cache restores (Safari/iOS especially)
	function handlePageShow(e: PageTransitionEvent) {
		if (e.persisted) throttledRefresh();
	}

	const dataUpdate = (payload: any) => {
		console.log('Data change received!', payload);
		const devEui = payload.dev_eui || null;
		if (devEui == null) return;
		if (locations) {
			const locationIndex: number = locations.findIndex((loc: cw_locations) =>
				loc.cw_devices.some((dev: cw_device) => dev.dev_eui == devEui)
			);
			if (locationIndex === -1) return;
			const deviceIndex: number = locations[locationIndex].cw_devices.findIndex(
				(dev: cw_device) => dev.dev_eui == devEui
			);
			if (deviceIndex === -1) return;
			// Merge the existing latestData with the new payload
			const latestData = {
				...locations[locationIndex].cw_devices[deviceIndex].latestData,
				...payload.new
			};

			const deviceType = locations[locationIndex].cw_devices[deviceIndex].cw_device_type;
			let primaryDataKey = deviceType.primary_data_v2;
			let secondaryDataKey = deviceType.secondary_data_v2;
			let primaryValue = payload?.[primaryDataKey];
			let secondaryValue = payload?.[secondaryDataKey];
			let primaryNotation = deviceType.primary_data_notation || '°C';
			let secondaryNotation = deviceType.secondary_data_notation || '%';

			const convertedSensorData = convertObject(latestData);
			console.log('Converted Sensor Data:', convertedSensorData);
			locations[locationIndex].cw_devices[deviceIndex] = {
				...locations[locationIndex].cw_devices[deviceIndex],
				latestData,
				primaryValue,
				secondaryValue,
				primaryNotation,
				secondaryNotation,
				last_data_updated_at: new Date(payload.created_at)
			};

			locations = [...locations];
		}
	};

	onMount(async () => {
		// subscribe to broadcast events on cw_air_data
		realtime = supabase
			.channel('cw_air_data', { config: { private: true } })
			.on('broadcast', { event: 'INSERT' }, (payload) => dataUpdate(payload.payload.record))
			.on('broadcast', { event: 'UPDATE' }, (payload) => dataUpdate(payload.payload.record))
			.subscribe((status, err) => {
				if (status === 'SUBSCRIBED') {
					console.log('Connected!');
					success('Connected to realtime updates!');
				}
				if (status === 'CHANNEL_ERROR') {
					console.log(`There was an error subscribing to channel`, err);
					error(`There was an error subscribing to updates`);
				}
				if (status === 'TIMED_OUT') {
					console.log('Realtime server did not respond in time.');
					error('Realtime server did not respond in time.');
				}
				if (status === 'CLOSED') {
					console.log('Realtime channel was unexpectedly closed.');
					warning('Realtime channel was unexpectedly closed.');
				}
			});

		lastFetchAt = Date.now();

		document.addEventListener('visibilitychange', handleVisibility);
		window.addEventListener('focus', handleFocus);
		window.addEventListener('blur', handleBlur);
		window.addEventListener('pageshow', handlePageShow as any);
	});

	onDestroy(() => {
		if (realtime) {
			supabase.removeChannel(realtime);
		}
		document.removeEventListener('visibilitychange', handleVisibility);
		window.removeEventListener('focus', handleFocus);
		window.removeEventListener('blur', handleBlur);
		window.removeEventListener('pageshow', handlePageShow as any);
	});

	$effect(() => {
		if (searchTerm.trim() === '') {
			locationsAfterFilter = locations;
		} else {
			const lowerSearchTerm = searchTerm.toLowerCase();
			locationsAfterFilter = locations.filter(
				(loc) =>
					(loc.name && loc.name.toLowerCase().includes(lowerSearchTerm)) ||
					(loc.description && loc.description.toLowerCase().includes(lowerSearchTerm)) ||
					(loc.cw_devices &&
						loc.cw_devices.some(
							(dev) =>
								(dev.name && dev.name.toLowerCase().includes(lowerSearchTerm)) ||
								(dev.dev_eui && dev.dev_eui.toLowerCase().includes(lowerSearchTerm))
						))
			);
		}
	});
</script>

<svelte:head>
	<title>IoT Dashboard</title>
</svelte:head>

<!-- Search Box for Locations -->
<div class="dashboard-filter mt-4 ml-3">
	<label for="dashboard-search-input" class="sr-only">Search locations or devices</label>
	<div class="relative" title="Search (Press / to focus, Esc to clear)">
		<Icon
			className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 transform text-gray-400"
			path={mdiMagnify}
			size="20"
		/>
		<input
			id="dashboard-search-input"
			type="text"
			placeholder="Search location, sensor, or DevEUI..."
			bind:value={searchTerm}
			autocomplete="off"
			class="search-input pr-10"
		/>
		{#if searchTerm}
			<button
				type="button"
				class="clear-btn"
				aria-label="Clear search"
				onclick={() => (searchTerm = '')}
			>
				<Icon
					path={mdiClose}
					size="16"
					className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
				/>
			</button>
		{/if}
	</div>
</div>

<div class="dashboard-container">
	{#if locations === null}
		<Spinner />
	{:else if locations}
		<AllLocations {supabase} locations={locationsAfterFilter} />
	{:else}
		<p>No locations found.</p>
	{/if}
</div>

<style>
	.dashboard-filter {
		width: 100%;
		max-width: 28rem;
	}

	.search-input {
		width: 100%;
		padding: 0.625rem 0.75rem 0.625rem 2.5rem;
		font-size: 0.95rem;
		border: 1px solid #d1d5db;
		border-radius: 0.5rem;
		background: #fff;
		color: #111827;
		transition:
			border-color 0.15s,
			box-shadow 0.15s;
	}

	.search-input:focus {
		outline: none;
		border-color: #2563eb;
		box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.3);
	}

	.search-input::placeholder {
		color: #9ca3af;
	}

	:global(.dark) .search-input {
		background: #1f2937;
		border-color: #374151;
		color: #f3f4f6;
	}
	:global(.dark) .search-input:focus {
		border-color: #3b82f6;
	}
	:global(.dark) .search-input::placeholder {
		color: #6b7280;
	}

	.clear-btn {
		position: absolute;
		top: 50%;
		right: 0.5rem;
		transform: translateY(-50%);
		background: transparent;
		border: none;
		color: #6b7280;
		padding: 0.25rem;
		border-radius: 0.25rem;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.clear-btn:hover {
		color: #111827;
	}
	:global(.dark) .clear-btn:hover {
		color: #f3f4f6;
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}
</style>
