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
		mdiMapMarker,
		mdiPlus,
		mdiTrashCan
	} from '@mdi/js';
	import { Button, Dialog, Icon, ListItem, SelectField, TextField, Toggle } from 'svelte-ux';
	import { _ } from 'svelte-i18n';
	import BasicInfo from './BasicInfo.svelte';
	import SuperDebug, { superForm } from 'sveltekit-superforms';
	import { appStore } from '$lib/stores/app.store';
	import AlertMenu from '$lib/components/ui/Header/AlertMenu.svelte';

	type locationType = Tables<'cw_locations'>;

	export let data;
	let locationPermissions = data.locationPermissions;
	const superform = superForm(data.locationEditForm, {
		delayMs: 500,
		timeoutMs: 5000,
		onUpdate({ form }) {
			if (form.message) {
				localStorage.clear();
				notificationStore.NotificationTimedOpen({
					title: 'success',
					description: form.message.text,
					buttonText: 'Close',
					timeout: 5000,
					icon: mdiCheckCircle
				});
			}
		}
	});

	const { form: permissionForm, delayed: permissionsDelayed, enhance: permissionsEnhance } = superForm(data.permissionForm, {
		delayMs: 500,
		timeoutMs: 5000,
		onUpdate({ form }) {
			if (form.message) {
				locationPermissions.push(form.message.user);
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
		}
	});
	let disableUserAdd: boolean = false;

	let location: locationType = {
		created_at: new Date().toDateString(),
		description: '',
		lat: -1,
		location_id: -1,
		long: -1,
		name: '',
		owner_id: ''
	};

	const permissionLevelOptions = [
		{ label: $_('Administrator'), value: 1 },
		{ label: $_('User'), value: 2 },
		{ label: $_('Viewer'), value: 3 }
	];

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
			locationPermissions = locationPermissions.filter((m) => m.id !== id);
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
	{#if location}
		<BasicInfo {superform} />
		{#if $appStore.debugMode}
			<SuperDebug data={superform.form} />
		{/if}
	{/if}

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

		<form action="?/addLocationPermissions" method="POST" class="md:col-span-2" use:permissionsEnhance>
			<DarkCard title={$_('location.settings.addNewLocationPermission')}>
				<div class="flex flex-row gap-2">
					<TextField
						label={$_('location.settings.userEmailToGrantAccess')}
						on:change={(e) => {
							const dups = locationPermissions.find(
								(m) => m.profile.email == e.detail.value
							);
							if (dups) {
								disableUserAdd = true;
							} else {
								disableUserAdd = false;
							}
							if (e.detail.operator) $permissionForm.permission_level = +e.detail.operator;
						}}
						id="email"
						name="email"
						bind:value={$permissionForm.email}
						class="w-full"
					/>
					<SelectField
						options={permissionLevelOptions}
						bind:value={$permissionForm.permission_level}
						label={$_('location.settings.permissionLevel')}
						name="permission_level"
						id="permission_level"
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
						<Button
							on:click={() => {
								$permissionForm.email = '';
								disableUserAdd = false;
							}}
							loading={$permissionsDelayed}
							icon={mdiCloseCircle}
						/>
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
				{#if $appStore.debugMode}
					<SuperDebug data={$permissionForm} />
				{/if}
			</DarkCard>
		</form>
	</div>
</div>
