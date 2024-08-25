<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import DarkCard from '$lib/components/ui/Cards/DarkCard.svelte';
	import { permissionNumberToRole } from '$lib/components/ui/utilities/permissionNumberToRole';
	import { notificationStore } from '$lib/stores/notificationStore';
	import type { Tables } from '$lib/types/supabaseSchema';
	import {
		mdiAccount,
		mdiCheckCircle,
		mdiCloseBox,
		mdiCloseCircle,
		mdiFloppy,
		mdiMapMarker,
		mdiPlus,
		mdiTrashCan
	} from '@mdi/js';
	import { onMount } from 'svelte';
	import { Button, Dialog, Icon, ListItem, TextField, Toggle } from 'svelte-ux';
	import { _ } from 'svelte-i18n';

	type locationType = Tables<'cw_locations'>;

	let location: locationType = {
		created_at: new Date().toDateString(),
		description: '',
		lat: -1,
		location_id: -1,
		long: -1,
		name: '',
		owner_id: ''
	};
	let locationPermissions = [];
	let permissionLevel: string = '';
	let email: string = '';
	let disableUserAdd: boolean = false;

	const permissionLevelOptions = [
		{ label: $_('Administrator'), value: '1' },
		{ label: $_('User'), value: '2' },
		{ label: $_('Viewer'), value: '3' }
	];

	onMount(async () => {
		const locationPromise = await fetch(`/api/v1/locations/${$page.params.location_id}`);
		const locationData = await locationPromise.json();
		location = locationData;

		const locationPermissionPromise = await fetch(
			`/api/v1/locations/${$page.params.location_id}/permissions`
		);
		locationPermissions = await locationPermissionPromise.json();
	});

	// Get current location using Geolocation API
	function getCurrentLocation() {
		if (navigator.geolocation) {
			navigator.geolocation.getCurrentPosition(
				(position) => {
					location.lat = position.coords.latitude.toString();
					location.long = position.coords.longitude.toString();
				},
				(error) => {
					console.error('Error getting location:', error);
					alert('Failed to get current location.');
				}
			);
		} else {
			alert('Geolocation is not supported by this browser.');
		}
	}

	let deletePermission = async (id: number) => {
		const deletePermissionRequest = await fetch(
			`/api/v1/locations/${$page.params.location_id}/permissions?id=${id}`,
			{
				method: 'DELETE',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ id }) // Pass the id in the body
			}
		);

		const deletePermissionResult = await deletePermissionRequest.json();

		if (deletePermissionResult) {
			// Remove the deleted permission from the list
			locationPermissions = locationPermissions.filter((permission) => permission.id !== id);

			notificationStore.NotificationTimedOpen({
				title: 'Permission Deleted',
				description: 'Permission Successfully deleted.',
				timeout: 2000,
				icon: '✅',
				buttonText: 'OK'
			});
		} else {
			notificationStore.NotificationTimedOpen({
				title: 'Failed to Delete Permission',
				description: deletePermissionResult.error || 'An error occurred.',
				timeout: 2000,
				icon: '❌',
				buttonText: 'OK'
			});
		}
	};
</script>

<div class="my-3 flex flex-row">
	<!-- TITLE -->
	<h2 class="text-surface ml-1 mt-4 text-2xl font-light">
		<Icon data={mdiMapMarker} class="h-6 w-6" />
		{$_('location.name')}: {location?.name}
	</h2>
</div>

<div class="divide-y divide-white/5">
	<!-- Device Basic Info -->
	<div
		class="grid max-w-7xl grid-cols-1 gap-x-8 gap-y-10 px-4 py-16 sm:px-6 md:grid-cols-3 lg:px-8"
	>
		<div>
			<h2 class="text-base font-semibold leading-7 text-white">
				{$_('location.settings.basicInfo')}
			</h2>
			<p class="mt-1 text-sm leading-6 text-gray-400">
				{$_('location.settings.basicInfoSubtitle')}
			</p>
		</div>

		<form
			action="?/updateLocationInfo"
			method="POST"
			class="md:col-span-2"
			use:enhance={({ formElement, formData, action, cancel, submitter }) => {
				return async ({ result, update }) => {
					if (result.type === 'success') {
						notificationStore.NotificationTimedOpen({
							title: $_('location.settings.updated'),
							description: $_('location.settings.locationUpdatedSuccessfully'),
							timeout: 2000,
							icon: mdiCheckCircle,
							buttonText: 'OK'
						});
					} else {
						notificationStore.NotificationTimedOpen({
							title: $_('location.settings.locationUpdatedFailed'),
							description: $_('location.settings.ContactSupport'),
							timeout: 2000,
							icon: mdiCloseBox,
							buttonText: 'OK'
						});
					}
				};
			}}
		>
			<div class="mb-2 grid grid-cols-1 gap-x-6 gap-y-8 sm:max-w-xl sm:grid-cols-6">
				<!-- Device Name -->
				<div class="col-span-full flex flex-col gap-2">
					<TextField
						id="device-name"
						name="name"
						label={$_('location.settings.locationName')}
						labelPlacement="top"
						bind:value={location.name}
					/>
					<div class="flex flex-row gap-2">
						<TextField
							id="device-name"
							name="lat"
							label={$_('location.settings.locationLatitude')}
							bind:value={location.lat}
						/>
						<TextField
							id="device-name"
							name="long"
							label={$_('location.settings.locationLongitude')}
							bind:value={location.long}
						/>
						<Button
							type="button"
							on:click={getCurrentLocation}
							class="rounded bg-blue-500 px-4 py-2 font-semibold text-white hover:bg-blue-400"
						>
							{$_('location.settings.useCurrentLocation')}
						</Button>
					</div>
				</div>
			</div>
			<Button type="submit" icon={mdiFloppy} variant="fill" color="success"
				>{$_('location.settings.save')}</Button
			>
		</form>
	</div>

	<div
		class="grid max-w-7xl grid-cols-1 gap-x-8 gap-y-10 px-4 py-16 sm:px-6 md:grid-cols-3 lg:px-8"
	>
		<div>
			<h2 class="text-base font-semibold leading-7 text-white">
				{$_('location.settings.locationPermissionTitle')}:
			</h2>
			<p class="mt-1 text-sm leading-6 text-gray-400">
				{$_('location.settings.locationPermissionSubtitle')}
			</p>
			<p class="mt-1 text-sm leading-6 text-gray-400">
				{$_('location.settings.locationPermissionSubtitle2')}
			</p>
		</div>

		<form
			action="?/addLocationPermissions"
			method="POST"
			class="md:col-span-2"
			use:enhance={({ formElement, formData, action, cancel, submitter }) => {
				return async ({ result, update }) => {
					if (result.type === 'success') {
						result.data;
						locationPermissions.push(result.data);
						locationPermissions = locationPermissions;
						notificationStore.NotificationTimedOpen({
							title: $_('location.settings.locationUpdated'),
							description: $_('location.settings.locationUpdatedSuccessfully'),
							timeout: 2000,
							icon: mdiCheckCircle,
							buttonText: 'OK'
						});
					} else {
						notificationStore.NotificationTimedOpen({
							title: $_('location.settings.locationUpdateFailed'),
							description: $_('location.settings.contactSupport'),
							timeout: 2000,
							icon: mdiCloseBox,
							buttonText: 'OK'
						});
					}
				};
			}}
		>
			<DarkCard title={$_('location.settings.addNewLocationPermission')}>
				<div class="flex flex-row gap-2">
					<TextField
						label={$_('location.settings.userEmailToGrantAccess')}
						operators={permissionLevelOptions}
						on:change={(e) => {
							console.log(e);
							const dups = locationPermissions.find((m) => m.profile.email == e.detail.inputValue);
							if (dups) {
								disableUserAdd = true;
							}
							permissionLevel = e.detail.operator ?? '-1';
						}}
						id="email"
						name="email"
						bind:value={email}
						class="w-full"
					/>
					<input
						type="hidden"
						bind:value={permissionLevel}
						name="permissionLevel"
						id="permissionLevel"
					/>
					<Button
						icon={mdiPlus}
						type="submit"
						variant="fill"
						color={disableUserAdd ? 'warning' : 'success'}
						disabled={disableUserAdd}
					/>
				</div>
				{#if disableUserAdd}
					<p class="text-red-500">
						{$_('location.settings.userAlreadyExists')}
						<Button on:click={() => {email = ''; disableUserAdd = false;}} icon={mdiCloseCircle} />
					</p>
				{/if}
			</DarkCard>
			<DarkCard title="{$_('location.settings.currentUsers')}:">
				<ul>
					{#each locationPermissions as permission}
						<ListItem
							title={permission.profile.email}
							subheading={$_(permissionNumberToRole(permission.permission_level))}
							icon={mdiAccount}
						>
							<div slot="actions">
								<Toggle let:on={open} let:toggle let:toggleOff>
									<Button icon={mdiTrashCan} on:click={toggle} variant="fill" color="danger" />
									<Dialog {open} on:close={toggleOff}>
										<div slot="title">{$_('location.settings.deleteTitle')}</div>
										<div class="px-6 py-3">
											<p>
												{$_('location.settings.deleteMsg1')} "{permission.profile.email}" {$_(
													'location.settings.deleteMsg2'
												)}
											</p>
										</div>
										<div slot="actions">
											<Button
												on:click={() => {
													deletePermission(permission.id);
												}}
												variant="fill"
												color="danger"
											>
												{$_('location.settings.confirmDelete')}
											</Button>
											<Button>{$_('app.cancle')}</Button>
										</div>
									</Dialog>
								</Toggle>
							</div>
						</ListItem>
					{/each}
				</ul>
			</DarkCard>
		</form>
	</div>
</div>
