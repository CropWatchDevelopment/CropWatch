<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { formValidation } from '$lib/actions/formValidation';
	import type { Location } from '$lib/models/Location';
	import { PermissionLevel } from '$lib/models/LocationUser.js';
	import Button from '$lib/components/UI/buttons/Button.svelte';
	import Header from '../../Header.svelte';
	import { _ } from 'svelte-i18n';
	import { AndOrButton } from '@revolist/revogrid';

	let { data } = $props();

	const location = $derived(data.location as Location);
	const users = $derived(data.usersInLocation);
	const permissionTypes = data.permissionTypes; // Array<[label, level]>
	const deviceTypes = data.deviceTypes; // Array<{ id: number, name: string }>

	// Selected device type
	let selectedDeviceType = $state<number | undefined>(undefined);

	// Initialize user permissions state
	let userPermissions: Array<{ userId: string; level: number }> = $state([]);
	let userPermissionsData = $state();
	$effect(() => {
		if (users)
			userPermissions = users.map((u) => ({ userId: u.user_id, level: PermissionLevel.Disabled }));
	});

	function updatePermission(index: number, level: number) {
		userPermissions[index].level = level;
	}

	function setAll(level: number) {
		userPermissions = userPermissions.map((p) => ({ ...p, level }));
	}

	$effect(() => {
		userPermissionsData = JSON.stringify(userPermissions);
	});

	let isSubmitting = false;
</script>

<svelte:head>
	<title>{$_('Create a New Device')}</title>
</svelte:head>

<Header {location} basePath={`/app/dashboard/location/${page.params.location_id}`} />

<div class="m-4 flex flex-row gap-2">
	<div class="flex flex-col gap-2">
		<h1 class="text-2xl font-bold">{$_('Create a New Device')}</h1>
		<p class="text-muted-foreground text-sm">
			{$_('Create a new device to be used in the location {location}.', {
				location: location?.name ?? 'err'
			})}
		</p>
	</div>
</div>

<form
	id="create-device-form"
	use:enhance
	use:formValidation
	action="?/createDevice"
	method="POST"
	class="form-container m-4"
>
	<!-- Device information -->
	<div class="flex flex-col gap-2">
		<label for="deviceName" class="text-sm font-medium">{$_('Device Name')}</label>
		<input
			name="deviceName"
			id="deviceName"
			type="text"
			required
			class="rounded-input border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring h-12 border-2 px-3 text-sm"
			placeholder={$_('Device Name')}
		/>
	</div>
	<div class="flex flex-col gap-2">
		<label for="devEui" class="text-sm font-medium">{$_('Dev EUI')}</label>
		<input
			name="devEui"
			id="devEui"
			type="text"
			required
			class="rounded-input border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring h-12 border-2 px-3 text-sm"
			placeholder={$_('Dev EUI')}
		/>
	</div>
	<div class="grid grid-cols-2 gap-4">
		<div class="flex flex-col gap-2">
			<label for="latitude" class="text-sm font-medium">{$_('Latitude')}</label>
			<input
				name="latitude"
				id="latitude"
				type="number"
				step="any"
				class="rounded-input border-input bg-background focus-visible:ring-ring h-12 border-2 px-3 text-sm"
				placeholder={$_('Latitude')}
			/>
		</div>
		<div class="flex flex-col gap-2">
			<label for="longitude" class="text-sm font-medium">{$_('Longitude')}</label>
			<input
				name="longitude"
				id="longitude"
				type="number"
				step="any"
				class="rounded-input border-input bg-background focus-visible:ring-ring h-12 border-2 px-3 text-sm"
				placeholder={$_('Longitude')}
			/>
		</div>
	</div>

	<!-- Device Type selection -->
	<div class="flex flex-col gap-2">
		<label for="deviceType" class="text-sm font-medium">{$_('Device Type')}</label>
		<div class="relative">
			<select
				id="deviceType"
				name="deviceType"
				bind:value={selectedDeviceType}
				class="rounded-input border-input bg-background h-12 w-full cursor-pointer appearance-none border-2 px-3"
			>
				<option value={undefined}>{$_('Select a device type...')}</option>
				{#each deviceTypes as deviceType}
					<option value={deviceType.id}>{deviceType.name}</option>
				{/each}
			</select>
			<div
				class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500"
			>
				<svg
					class="h-4 w-4"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
					xmlns="http://www.w3.org/2000/svg"
				>
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"
					></path>
				</svg>
			</div>
		</div>
	</div>
	<!-- User permissions -->
	<div class="mt-4">
		<h2 class="text-lg font-semibold">{$_('User Permissions')}</h2>
		<div class="my-2 flex gap-2">
			{#each permissionTypes as [label, level]}
				<Button
					type="button"
					class="bg-primary rounded px-6 py-2 text-white"
					onclick={() => setAll(level)}
				>
					{$_(`Set All ${label}`)}
				</Button>
			{/each}
		</div>
		<table class="w-full border-collapse text-sm">
			<thead>
				<tr>
					<th class="p-2 text-left">{$_('User')}</th>
					{#each permissionTypes as [label]}
						<th class="p-2">{label}</th>
					{/each}
				</tr>
			</thead>
			<tbody>
				{#each users as user, i}
					<tr class="border-t">
						<td class="p-2">{user.profile.email}</td>
						{#each permissionTypes as [, level]}
							<td class="p-2 text-center">
								<input
									type="radio"
									name={`perm-${user.user_id}`}
									value={level}
									checked={userPermissions[i]?.level === level}
									onchange={() => updatePermission(i, level)}
								/>
							</td>
						{/each}
					</tr>
				{/each}
			</tbody>
		</table>
		<input type="hidden" name="userPermissionsData" value={userPermissionsData} />
	</div>
	<!-- Submit button -->
	<div class="flex justify-end">
		<Button
			type="submit"
			form="create-device-form"
			disabled={isSubmitting}
			class="bg-primary rounded px-6 py-2 text-white"
		>
			{isSubmitting ? $_('Creating...') : $_('Create Device')}
		</Button>
	</div>
</form>
