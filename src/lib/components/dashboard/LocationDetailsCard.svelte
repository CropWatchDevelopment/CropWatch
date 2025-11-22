<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { formValidation } from '$lib/actions/formValidation';
	import Button from '$lib/components/UI/buttons/Button.svelte';
	import TextInput from '$lib/components/UI/form/TextInput.svelte';
	import { error as errorToast, success as successToast } from '$lib/stores/toast.svelte';
	import type { ActionResult } from '@sveltejs/kit';
	import { _ } from 'svelte-i18n';

	type LocationFormDataProps = {
		name: string;
		description: string;
		lat: number | undefined;
		long: number | undefined;
	};

	const locationFormDataPlaceholder: LocationFormDataProps = {
		name: '',
		description: '',
		lat: undefined,
		long: undefined
	};

	let { location } = $props();

	let locationFormData: LocationFormDataProps = $state({ ...locationFormDataPlaceholder });
	let updatingLocation: boolean = $state(false);
	let editingLocation: boolean = $state(false);

	const startEditLocation = () => {
		editingLocation = true;
		locationFormData = {
			name: location.name ?? '',
			description: location.description ?? '',
			lat: location.lat ?? undefined,
			long: location.long ?? undefined
		};
	};

	const cancelEditLocation = () => {
		editingLocation = false;
		locationFormData = { ...locationFormDataPlaceholder };
	};

	const handleLocationUpdateSuccess = async (result: ActionResult) => {
		if (result.type === 'success') {
			if (result.data?.success) {
				// Refresh the page data to show updated location details
				await invalidateAll();
				editingLocation = false;
				successToast('Location details updated successfully');
			} else {
				errorToast((result.data?.error as string) || 'Failed to update location details');
			}
		} else {
			errorToast('An error occurred');
		}

		updatingLocation = false;
	};
</script>

<section class="bg-card rounded-lg p-6 shadow-lg">
	<div class="mb-4 flex items-center justify-between">
		<h2 class="text-xl font-bold">{$_('Location Details')}</h2>
		{#if !editingLocation}
			<Button variant="secondary" onclick={startEditLocation}>{$_('Edit Details')}</Button>
		{/if}
	</div>

	{#if editingLocation}
		<form
			method="POST"
			action="?/updateLocation"
			class="grid !w-full grid-cols-1 gap-4"
			use:enhance={() => {
				updatingLocation = true;

				return ({ result }) => {
					handleLocationUpdateSuccess(result);
				};
			}}
			use:formValidation
		>
			<div>
				<label for="locationName" class="mb-1 block font-medium">{$_('Location Name')}</label>
				<TextInput
					id="locationName"
					name="name"
					required
					placeholder={$_('Location Name')}
					class="w-full"
					bind:value={locationFormData.name}
				/>
			</div>

			<div>
				<label for="locationDescription" class="mb-1 block font-medium">{$_('Description')}</label>
				<TextInput
					id="locationDescription"
					name="description"
					required
					placeholder={$_('Description')}
					class="w-full"
					bind:value={locationFormData.description}
				/>
			</div>

			<div>
				<label for="locationLatitude" class="mb-1 block font-medium">Latitude</label>
				<TextInput
					type="number"
					id="locationLatitude"
					name="lat"
					step="any"
					placeholder="Latitude (e.g. 51.5074)"
					class="w-full"
					bind:value={locationFormData.lat}
				/>
				<p class="mt-1 text-sm text-gray-500">Decimal format (e.g. 51.5074)</p>
			</div>

			<div>
				<label for="locationLongitude" class="mb-1 block font-medium">Longitude</label>
				<TextInput
					type="number"
					id="locationLongitude"
					name="long"
					step="any"
					placeholder="Longitude (e.g. -0.1278)"
					class="w-full"
					bind:value={locationFormData.long}
				/>
				<p class="mt-1 text-sm text-gray-500">Decimal format (e.g. -0.1278)</p>
			</div>

			<div class="flex gap-2">
				<Button
					type="submit"
					variant="primary"
					disabled={updatingLocation || !locationFormData.name}
				>
					{updatingLocation ? $_('Updating...') : $_('Update Location')}
				</Button>
				<Button variant="secondary" onclick={() => cancelEditLocation()}>{$_('Cancel')}</Button>
			</div>
		</form>
	{:else}
		<div class="grid grid-cols-1 gap-4">
			<div>
				<h3 class="text-sm font-medium text-gray-500">{$_('Name')}</h3>
				<p>{location.name || $_('No name set')}</p>
			</div>
			<div>
				<h3 class="text-sm font-medium text-gray-500">{$_('Description')}</h3>
				<p>{location.description}</p>
			</div>
			<div>
				<h3 class="text-sm font-medium text-gray-500">{$_('Coordinates')}</h3>
				<p>
					{#if location.lat && location.long}
						{location.lat.toFixed(6)}, {location.long.toFixed(6)}
					{:else}
						{$_('Not set')}
					{/if}
				</p>
			</div>
		</div>
	{/if}
</section>
>
