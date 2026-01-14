<script lang="ts">
	import Header from '$lib/core/Header.svelte';
	import Sidebar from '$lib/core/Sidebar.svelte';
	import CWOfflineOverlay from '$lib/components/CWOfflineOverlay.svelte';
	import type { Device } from '$lib/Interfaces/device.interface';
	import type { Facility } from '$lib/Interfaces/facility.interface';
	import type { Location } from '$lib/Interfaces/location.interface';
	import './layout.css';
	import type { AppState } from '$lib/Interfaces/appState.interface';
	import { createAppState, provideAppState, useAppState } from '$lib/data/AppState.svelte';
	import { setContext, type Snippet } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import { CWToastContainer, createToastContext } from '$lib/components/toast';
	import { invalidate } from '$app/navigation';
	import { onMount } from 'svelte';
	import type { SupabaseClient, Session, AuthChangeEvent } from '@supabase/supabase-js';

	interface Props {
		data: {
			supabase: SupabaseClient;
			session: Session | null;
			user: Session['user'] | null;
			profile: {
				id?: string;
				full_name?: string | null;
				avatar_url?: string | null;
				email?: string | null;
			} | null;
			facilities: Facility[];
			locations: Location[];
			devices: Device[];
			alerts: any[];
			isLoggedIn: boolean;
		};
		children: Snippet;
	}

	let { data, children }: Props = $props();

	// Create toast context so all child components can use it
	createToastContext();

	let appState = createAppState({
		facilities: data.facilities,
		locations: data.locations,
		devices: data.devices,
		alerts: data.alerts,
		isLoggedIn: data.isLoggedIn ?? false,
		profile: data.profile ?? null,
		userEmail: data.user?.email ?? null
	});

	$effect(() => {
		appState.facilities = data.facilities;
		appState.locations = data.locations;
		appState.devices = data.devices;
		appState.alerts = data.alerts;
		appState.isLoggedIn = data.isLoggedIn ?? false;
		appState.profile = data.profile ?? null;
		appState.userEmail = data.user?.email ?? null;
	});

	// Listen for auth state changes and invalidate to refresh data
	onMount(() => {
		const { data: { subscription } } = data.supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
			if (session?.expires_at !== data.session?.expires_at) {
				invalidate('supabase:auth');
			}
		});

		return () => subscription.unsubscribe();
	});

	provideAppState(appState);

	let selectedFacilityId = $state<string | 'all'>('all');
	let selectedLocationId = $state<string | 'all'>('all');

	const filterSubscribers = new SvelteSet<
		(payload: { facility: string | 'all'; location: string | 'all' }) => void
	>();

	function notifyFilters() {
		const payload = { facility: selectedFacilityId, location: selectedLocationId };
		filterSubscribers.forEach((run) => run(payload));
	}

	$effect(() => {
		notifyFilters();
	});

	// Share selection with child pages and keep them reactive
	setContext('filters', {
		getFacility: () => selectedFacilityId,
		getLocation: () => selectedLocationId,
		subscribe(run: (payload: { facility: string | 'all'; location: string | 'all' }) => void) {
			filterSubscribers.add(run);
			run({ facility: selectedFacilityId, location: selectedLocationId });
			return () => filterSubscribers.delete(run);
		}
	});

	const locationsForFacility = $derived(
		selectedFacilityId === 'all'
			? appState.locations
			: appState.locations.filter((l: Location) => l.facilityId === selectedFacilityId)
	);

	const total = $derived(appState.devices.length);
	const alerts = $derived(appState.alerts.length);
	const offline = $derived(appState.devices.filter((d: Device) => d.status === 'offline').length);
</script>

<div class="app flex h-screen flex-col overflow-hidden bg-slate-950 text-slate-100">
	<CWOfflineOverlay />
	<CWToastContainer position="top-right" />
	<div class="flex min-h-0 flex-1 flex-row overflow-hidden">
		{#if appState.isLoggedIn}
			<Sidebar
				facilities={appState.facilities}
				devices={appState.devices}
				{locationsForFacility}
				bind:selectedFacilityId
				bind:selectedLocationId
				{total}
				{alerts}
				{offline}
			/>
		{/if}
		<main class="flex min-h-0 flex-1 flex-col overflow-auto">
			{#if appState.isLoggedIn}
				<Header
					isLoggedIn={appState.isLoggedIn}
					profile={appState.profile}
					userEmail={appState.userEmail}
					supabase={data.supabase}
				/>
			{/if}
			<svelte:boundary>
				{@render children()}
				{#snippet failed(error, reset)}
					<div class="flex min-h-[50vh] flex-col items-center justify-center p-8 text-center">
						<div class="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-rose-900/30">
							<svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
								<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
							</svg>
						</div>
						<h2 class="text-xl font-semibold text-rose-300">Something went wrong</h2>
						<p class="mt-2 max-w-md text-slate-400">{(error as Error)?.message || 'An unexpected error occurred while loading this page.'}</p>
						<div class="mt-6 flex gap-3">
							<button onclick={reset} class="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-sm font-medium transition-colors">
								Try again
							</button>
							<a href="/" class="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-sm font-medium transition-colors">
								Go to Dashboard
							</a>
						</div>
					</div>
				{/snippet}
			</svelte:boundary>
		</main>
	</div>
</div>
