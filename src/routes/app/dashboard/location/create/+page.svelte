<script lang="ts">
	import { browser } from '$app/environment';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { formValidation } from '$lib/actions/formValidation';
	import LeafletMap from '$lib/components/maps/leaflet/LeafletMap.svelte';
	import Button from '$lib/components/UI/buttons/Button.svelte';
	import { error as errorToast, success as successToast } from '$lib/stores/toast.svelte';
	import { onMount } from 'svelte';
	import { _ } from 'svelte-i18n';

	const DEFAULT_COORDINATES = { lat: 35.6804, lon: 139.769 }; // Tokyo Station
	const geolocationAvailable =
		browser && typeof navigator !== 'undefined' && 'geolocation' in navigator;

	let name = $state('');
	let description = $state('');
	let latitude = $state(DEFAULT_COORDINATES.lat);
	let longitude = $state(DEFAULT_COORDINATES.lon);
	let locating = $state(false);

	const canSubmit = $derived.by(
		() => Boolean(name.trim()) && Number.isFinite(latitude) && Number.isFinite(longitude)
	);

	function setCoordinates(lat: number, lon: number) {
		latitude = Number(lat.toFixed(6));
		longitude = Number(lon.toFixed(6));
	}

	function requestCurrentLocation(initial = false) {
		if (!geolocationAvailable) return;
		if (!initial) {
			locating = true;
		}
		navigator.geolocation.getCurrentPosition(
			(pos) => {
				setCoordinates(pos.coords.latitude, pos.coords.longitude);
				locating = false;
			},
			() => {
				locating = false;
			},
			{ enableHighAccuracy: true, timeout: 10000 }
		);
	}

	function handleMapClick(lat: number, lon: number) {
		setCoordinates(lat, lon);
	}

	onMount(() => {
		requestCurrentLocation(true);
	});
</script>

<section class="mx-auto flex max-w-6xl flex-col gap-8 p-4">
	<header class="space-y-2">
		<h1 class="text-3xl font-bold text-neutral-900 dark:text-neutral-100">
			{$_('Create Location')}
		</h1>
		<p class="max-w-2xl text-sm text-neutral-600 dark:text-neutral-400">
			{$_('Add a new location to your account.')}
		</p>
	</header>

	<form
		method="post"
		action="?/createLocation"
		class="flex flex-col gap-6"
		use:formValidation
		use:enhance={() => {
			return async ({ result, update }) => {
				if (result.type === 'success' && result.data?.success) {
					successToast($_('Location created successfully'));
					if (result.data.data?.id) {
						await goto(`/app/dashboard/location/${result.data.data.id}`);
					}
				} else {
					let errorMessage = $_('Failed to create location');
					if (result.type === 'success' || result.type === 'failure') {
						if (result.data?.error) errorMessage = result.data.error;
					} else if (result.type === 'error') {
						if (result.error?.message) errorMessage = result.error.message;
					}
					errorToast(errorMessage);
					await update({ reset: false });
				}
			};
		}}
	>
		<div class="grid gap-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
			<div
				class="space-y-6 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-700 dark:bg-neutral-900"
			>
				<div class="space-y-2">
					<label for="name" class="text-sm font-semibold text-neutral-700 dark:text-neutral-200">
						{$_('Location Name')}
					</label>
					<input
						type="text"
						id="name"
						name="name"
						bind:value={name}
						required
						placeholder={$_('Location Name')}
						class="focus:border-accent-500 focus:ring-accent-500/20 h-11 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm text-neutral-900 shadow-sm transition focus:ring-2 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50"
					/>
				</div>

				<div class="space-y-2">
					<label
						for="description"
						class="text-sm font-semibold text-neutral-700 dark:text-neutral-200"
					>
						{$_('Location Description')}
					</label>
					<textarea
						id="description"
						name="description"
						bind:value={description}
						rows={4}
						placeholder={$_('Describe the location (optional)')}
						class="focus:border-accent-500 focus:ring-accent-500/20 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm transition focus:ring-2 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50"
					></textarea>
					<p class="text-xs text-neutral-500 dark:text-neutral-400">
						{$_('Pick a point on the map or adjust the values manually.')}
					</p>
				</div>

				<div class="space-y-3">
					<div class="grid gap-4 sm:grid-cols-2">
						<div class="space-y-2">
							<label
								for="latitude"
								class="text-sm font-semibold text-neutral-700 dark:text-neutral-200"
							>
								{$_('Latitude')}
							</label>
							<input
								type="number"
								step="any"
								id="latitude"
								name="lat"
								bind:value={latitude}
								required
								class="focus:border-accent-500 focus:ring-accent-500/20 h-11 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm text-neutral-900 shadow-sm transition focus:ring-2 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50"
							/>
						</div>
						<div class="space-y-2">
							<label
								for="longitude"
								class="text-sm font-semibold text-neutral-700 dark:text-neutral-200"
							>
								{$_('Longitude')}
							</label>
							<input
								type="number"
								step="any"
								id="longitude"
								name="long"
								bind:value={longitude}
								required
								class="focus:border-accent-500 focus:ring-accent-500/20 h-11 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm text-neutral-900 shadow-sm transition focus:ring-2 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50"
							/>
						</div>
					</div>

					{#if geolocationAvailable}
						<div class="flex items-center gap-3">
							<Button
								type="button"
								variant="secondary"
								size="sm"
								class="rounded-lg bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
								disabled={locating}
								onclick={() => requestCurrentLocation()}
							>
								{locating ? $_('Locating...') : $_('Use Current Location')}
							</Button>
							<p class="text-xs text-neutral-500 dark:text-neutral-400">
								{$_('We use your browser location to prefill coordinates.')}
							</p>
						</div>
					{:else}
						<p class="text-xs text-neutral-500 dark:text-neutral-400">
							{$_('Browser location is unavailable; enter coordinates manually.')}
						</p>
					{/if}
				</div>
			</div>

			<div
				class="space-y-4 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-900"
			>
				<header class="flex items-center justify-between">
					<h2 class="text-lg font-semibold text-neutral-800 dark:text-neutral-100">
						{$_('Location Preview')}
					</h2>
				</header>
				<p class="text-xs text-neutral-500 dark:text-neutral-400">
					{$_('Click the map to fine-tune the coordinates.')}
				</p>
				<div class="h-[420px] overflow-hidden rounded-lg">
					{#if browser}
						<LeafletMap
							bind:lat={latitude}
							bind:lon={longitude}
							zoom={10}
							markers={[]}
							onclick={handleMapClick}
							showClickMarker={true}
						/>
					{/if}
				</div>
			</div>
		</div>

		<div class="flex justify-end">
			<Button type="submit" variant="primary" size="md" disabled={!canSubmit} class="px-6 py-2">
				{$_('Create Location')}
			</Button>
		</div>
	</form>
</section>
