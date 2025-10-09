<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { formValidation } from '$lib/actions/formValidation';
	import Button from '$lib/components/UI/buttons/Button.svelte';
	import Select from '$lib/components/UI/form/Select.svelte';
	import TextInput from '$lib/components/UI/form/TextInput.svelte';
	import Dialog from '$lib/components/UI/overlay/Dialog.svelte';
	import { error, success } from '$lib/stores/toast.svelte.js';
	import { formatDateOnly } from '$lib/utilities/helpers.js';
	import { _ } from 'svelte-i18n';

	let { data } = $props();
	const device = $derived(data.device);
	const ownerId = $derived(data.ownerId);
	const isOwner = $derived(device?.user_id === ownerId);

	// @todo Use a proper sensor datasheet link when wiki pages are created
	const deviceLinkId = $derived(
		device?.cw_device_type?.data_table_v2 === 'cw_soil_data' ? 'soil_sensors' : 'co2_sensors'
	);

	let showDeleteDialog = $state(false);
	let devEui = page.params.devEui;

	async function deleteDevice() {
		const res = await fetch(`/api/devices/${devEui}`, {
			method: 'DELETE',
			headers: {
				'Content-Type': 'application/json'
			}
		});
		if (res.ok) {
			goto('/app/dashboard');
		} else {
			alert('Failed to delete device');
		}
	}

	function showSuccessToast() {
		success('Success! Operation completed successfully.');
	}

	function showErrorToast() {
		error('Error! Something went wrong.');
	}
</script>

<svelte:head>
	<title>{$_('Device Settings')} - CropWatch</title>
</svelte:head>

<section class="flex h-full flex-col gap-4">
	<header class="flex flex-row items-center justify-between gap-4">
		<div>
			<h2 class="mb-1 text-2xl font-semibold">{$_('General')}</h2>
			<p class="text-sm text-neutral-100">{$_('Manage the device information.')}</p>
		</div>
	</header>
	<form
		class="form-container !grid grid-cols-1 gap-4 md:grid-cols-2"
		id="deviceSettingsForm"
		method="POST"
		action="?/updateGeneralSettings"
		use:enhance={({ formElement, formData, action, cancel, submitter }) => {
			return async ({ result, update }) => {
				if (result.data.success) {
					success('Settings updated successfully!');
					update();
				} else {
					error('Failed to update settings');
				}
			};
		}}
		use:formValidation
	>
		<div class="flex flex-1 flex-col gap-1">
			<span class="text-sm font-medium text-neutral-50">
				{$_('Device Type')}
			</span>
			{#if device?.cw_device_type?.name}
				<a
					href="https://kb.cropwatch.io/doku.php?id={deviceLinkId}"
					target="_blank"
					class="text-gray-500/80 dark:text-gray-300/80"
				>
					{device.cw_device_type.name}
				</a>
			{:else}
				{$_('Unknown')}
			{/if}
		</div>
		<div class="flex flex-1 flex-col gap-1">
			<span class="text-sm font-medium text-neutral-50">
				{$_('EUI')}
			</span>
			{device?.dev_eui || $_('Unknown')}
		</div>
		<div class="flex flex-1 flex-col gap-1">
			<span class="text-sm font-medium text-neutral-50">
				{$_('Installed Date')}
			</span>
			{device?.installed_at ? formatDateOnly(device.installed_at) : $_('Unknown')}
		</div>
		<div class="flex flex-1 flex-col gap-1">
			<span class="text-sm font-medium text-neutral-50">
				{$_('Coordinates')}
			</span>
			{#if device?.lat && device?.long}
				<!-- @todo Make the coordinates editable -->
				{device.lat}, {device.long}
			{:else}
				{$_('Unknown')}
			{/if}
		</div>
		<div class="flex flex-1 flex-col gap-1">
			<label for="deviceName" class="text-sm font-medium text-neutral-50">
				{$_('Device Name')}
			</label>
			{#if isOwner}
				<TextInput
					id="deviceName"
					name="name"
					placeholder="Enter device name"
					value={device?.name}
				/>
			{:else}
				{device?.name}
			{/if}
		</div>
		<div class="flex flex-1 flex-col gap-1">
			<label for="deviceName" class="text-sm font-medium text-neutral-50">
				{$_('Device Location')}
			</label>
			{#await data.locations}
				{$_('Loading...')}
			{:then locations}
				{#if isOwner}
					<Select id="deviceLocation" name="location_id">
						{#each locations as loc}
							<option value={loc.location_id} selected={loc.location_id === device?.location_id}>
								{loc.name} ({loc.location_id})
							</option>
						{/each}
					</Select>
				{:else}
					{locations.find((loc) => loc.location_id === device?.location_id)?.name ||
						'Unknown Location'}
					{#if device?.location_id}
						({device.location_id})
					{/if}
				{/if}
			{/await}
		</div>
		<div class="col-span-1 flex flex-1 flex-col items-end gap-1 md:col-span-2">
			{#if isOwner}
				<Button variant="primary" type="submit">{$_('Update')}</Button>
			{/if}
		</div>
	</form>

	{#if isOwner}
		<span class="flex flex-1"></span>
		<section class="border-danger/50 mt-6 flex flex-col gap-2 rounded-lg border p-4">
			<h2 class="text-danger text-lg font-semibold">{$_('Dangerous Zone')}</h2>
			<div>
				<Button
					variant="danger"
					onclick={() => {
						showDeleteDialog = true;
					}}
				>
					{$_('Delete Device & Associated Data')}
				</Button>
			</div>
			<Dialog bind:open={showDeleteDialog} size="sm">
				{#snippet title()}
					{$_('Delete Device & Associated Data')}
				{/snippet}
				{#snippet body()}
					{$_('delete_device_warning')}
				{/snippet}
				{#snippet footer()}
					<Button
						variant="secondary"
						onclick={() => {
							showDeleteDialog = false;
						}}
					>
						{$_('Cancel')}
					</Button>
					<Button
						variant="danger"
						onclick={() => {
							showDeleteDialog = false;
							deleteDevice();
						}}
					>
						{$_('Delete')}
					</Button>
				{/snippet}
			</Dialog>
		</section>
	{/if}
</section>
