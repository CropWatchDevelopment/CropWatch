<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import {
		Button,
		DatePickerField,
		NumberStepper,
		TextField,
		SelectField,
		ListItem,
		Icon,
		ProgressCircle,
		Toggle,
		Dialog
	} from 'svelte-ux';
	import { mdiAccount, mdiCalendar, mdiPlus, mdiTrashCan } from '@mdi/js';
	import type { Tables } from '$lib/types/supabaseSchema';
	import { permissionNumberToRole } from '$lib/components/ui/utilities/permissionNumberToRole';
	import DarkCard from '$lib/components/ui/Cards/DarkCard.svelte';
	import { notificationStore } from '$lib/stores/notificationStore';
	import { enhance } from '$app/forms';

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

<div class="divide-y divide-white/5">
	<!-- Device Basic Info -->
	<div
		class="grid max-w-7xl grid-cols-1 gap-x-8 gap-y-10 px-4 py-16 sm:px-6 md:grid-cols-3 lg:px-8"
	>
		<div>
			<h2 class="text-base font-semibold leading-7 text-surface-900">Device Permissions</h2>
			<p class="mt-1 text-sm leading-6 text-surface-600">Setup What users can/Cannot see or do</p>
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
							title: 'Permission Add Success',
							description: 'Permission Successfully Added.',
							timeout: 2000,
							icon: '✅',
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
							title: 'Failed to Add Permission',
							description: 'An error occurred.',
							timeout: 2000,
							icon: '❌',
							buttonText: 'OK'
						});
					}
				};
			}}
		>
			<DarkCard title="Add New User Permission:">
				<div class="flex flex-row gap-2">
					<TextField
						label="User Email to grant permission"
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
										<div slot="title">Are you sure?</div>
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
												Yes, delete item
											</Button>
											<Button>Cancel</Button>
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
