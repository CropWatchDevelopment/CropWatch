<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import {
		Button,
		TextField,
		ListItem,
		Icon,
		ProgressCircle,
		Toggle,
		Dialog
	} from 'svelte-ux';
	import { mdiAccount, mdiCheckCircle, mdiCloseBox, mdiPlus, mdiTrashCan } from '@mdi/js';
	import type { Tables } from '$lib/types/supabaseSchema';
	import { permissionNumberToRole } from '$lib/components/ui/utilities/permissionNumberToRole';
	import DarkCard from '$lib/components/ui/Cards/DarkCard.svelte';
	import { notificationStore } from '$lib/stores/notificationStore';
	import { enhance } from '$app/forms';
	import { _ } from 'svelte-i18n';

	let loading: boolean = true;
	let permissionsRequest: Tables<'cw_device_owners'>[] = [];
	let permissionLevel: string = '';
	const permissionLevelOptions = [
		{ label: 'Administrator', value: '1' },
		{ label: 'User', value: '2' },
		{ label: 'Viewer', value: '3' }
	];

	// Fetch device data when component is mounted
	onMount(async () => {
		permissionsRequest = await (await fetch(`/api/v1/devices/${$page.params.dev_eui}/permissions`)).json();
		loading = false;
	});

	let deletePermission = async (id: number) => {
		const deletePermissionRequest = await fetch(`/api/v1/devices/${$page.params.dev_eui}/permissions`, {
			method: 'DELETE',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ id }) // Pass the id in the body
		});

		const deletePermissionResult = await deletePermissionRequest.json();

		if (deletePermissionResult.success) {
			// Remove the deleted permission from the list
			permissionsRequest = permissionsRequest.filter((permission) => permission.id !== id);

			notificationStore.NotificationTimedOpen({
				title: $_('devices.permissions.permissionDeleted'),
				description: $_('devices.permissions.permissionDeleted'),
				timeout: 2000,
				icon: mdiCheckCircle,
				buttonText: 'OK'
			});
		} else {
			notificationStore.NotificationTimedOpen({
				title: $_('devices.permissions.failedToDelete'),
				description: deletePermissionResult.error || 'An error occurred.',
				timeout: 2000,
				icon: '❌',
				buttonText: 'OK'
			});
		}
	};
</script>

<div class="divide-y divide-white/5">
	<!-- Device Basic Info -->
	<div
		class="grid max-w-7xl grid-cols-1 gap-x-8 gap-y-10 px-4 py-16 sm:px-6 md:grid-cols-3 lg:px-8"
	>
		<div>
			<h2 class="text-base font-semibold leading-7 text-surface-900">{$_('devices.permissions.title')}</h2>
			<p class="mt-1 text-sm leading-6 text-surface-600">{$_('devices.permissions.subtitle')}</p>
		</div>

		<form
			action="?/addDevicePermission"
			method="POST"
			class="md:col-span-2"
			use:enhance={({ formElement, formData, action, cancel }) => {
				return async ({ result }) => {
					console.log(result);
					if (result.type === 'success') {
						notificationStore.NotificationTimedOpen({
							title: $_('devices.permissions.success'),
							description: $_('devices.permissions.success'),
							timeout: 2000,
							icon: mdiCheckCircle,
							buttonText: 'OK'
						});
						const newPermission = {
                            ...JSON.parse(result.data).responseData,
                            owner: {
                                email: formData.get('email'),
                            }
                        };
                        formElement.reset();
						permissionsRequest.push(newPermission);
						permissionsRequest = permissionsRequest;
					} else {
						notificationStore.NotificationTimedOpen({
							title: $_('devices.permissions.failedToAdd'),
							description: $_('devices.permissions.failedToAdd'),
							timeout: 2000,
							icon: mdiCloseBox,
							buttonText: 'OK'
						});
					}
				};
			}}
		>
			<DarkCard title={$_('devices.permissions.userEmailToGrantAccess')}>
				<div class="flex flex-row gap-2">
					<TextField
						label={$_('devices.permissions.userEmailToGrantAccess')}
						operators={permissionLevelOptions}
						on:change={(e) => {
							console.log(e);
							permissionLevel = e.detail.operator ?? '-1';
						}}
						id="email"
						name="email"
						class="w-full"
					/>
					<input
						type="hidden"
						bind:value={permissionLevel}
						name="permissionLevel"
						id="permissionLevel"
					/>
					<Button icon={mdiPlus} type="submit" variant="fill" color="success" />
				</div>
			</DarkCard>

			<DarkCard title="Current Users:">
				<ul>
					{#if loading}
						<ProgressCircle />
					{/if}
					{#each permissionsRequest as permission}
						<ListItem
							title={permission.owner.email}
							subheading={permissionNumberToRole(permission.permission_level)}
						>
							<div slot="avatar">
								<Icon data={mdiAccount} />
							</div>
							<div slot="actions">
								<Toggle let:on={open} let:toggle let:toggleOff>
									<Button icon={mdiTrashCan} on:click={toggle} variant="fill" color="danger" />
									<Dialog {open} on:close={toggleOff}>
										<div slot="title">{$_('devices.permissions.deleteConfirmMessage')}</div>
										<div class="px-6 py-3">
											<p>
												You are about to delete '{permission.owner.email}' This user will no longer
												be
											</p>
											<p>able to view this device.</p>
										</div>
										<div slot="actions">
											<Button
												on:click={() => {
													deletePermission(permission.id);
												}}
												variant="fill"
												color="danger"
											>
												
												{$_('devices.permissions.confirmDelete')}
											</Button>
											<Button>{$_('devices.permissions.cancelelete')}</Button>
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
