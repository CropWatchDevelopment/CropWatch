<script lang="ts">
	import { enhance } from '$app/forms';
	import { PermissionNumberToName } from '$lib/utilities/permissionNumberToName';
	import { mdiAccount, mdiPlus, mdiTrashCan } from '@mdi/js';
	import { toast } from '@zerodevx/svelte-toast';
	import { Button, ListItem, SelectField, TextField } from 'svelte-ux';

	export let devEui;
	export let permissions;
	let permission_level: number = 3;

	const deletePermission = (id: number) => {
		fetch(`/api/v1/devices/${devEui}/permissions?id=${id}`, {
			method: 'DELETE'
		}).then((response) => {
			if (response.status < 400) {
				permissions = permissions.filter((permission) => permission.id !== id);
				toast.push('User Permission Deleted Successfully!', {
					theme: {
						'--toastBackground': 'green',
						'--toastColor': 'black'
					}
				});
			} else {
				toast.push('Failed to delete User Permission', {
					theme: {
						'--toastBackground': 'red',
						'--toastColor': 'black'
					}
				});
			}
		});
	};
</script>

<div class="flex flex-col m-4 gap-2">
	<form
		action="/api/v1/devices/{devEui}/permissions"
		method="POST"
		use:enhance={({ formElement, formData, action, cancel, submitter }) => {
			return async ({ result, update }) => {
				if (result.status && result.status < 400) {
					update();
					//reload page
					location.reload();
					toast.push('User Permission Added Successfully!', {
						theme: {
							'--toastBackground': 'success',
							'--toastColor': 'black'
						}
					});
				} else {
					toast.push(
						form?.message ??
							'Failed to add User Permission, does the user exist and have a setup account?',
						{
							theme: {
								'--toastBackground': 'red',
								'--toastColor': 'black'
							}
						}
					);
				}
			};
		}}
	>
		<input type="hidden" name="dev_eui" value={devEui} />
		<div>
			<label for="email" class="text-surface-100">Email:</label>
			<TextField name="email" label="User E-Mail" />
		</div>
		<div>
			<label for="role" class="text-surface-100">Role: {permission_level}</label>
			<input type="hidden" name="permission_level" value={permission_level} />
			<SelectField
				label="Role"
				id="permission_level"
				bind:value={permission_level}
				options={[
					{ value: '1', label: 'Admin (view, Edit, Update, Delete)' },
					{ value: '2', label: 'User (view data, Download Data' },
					{ value: '3', label: 'Viewer (view data only)' }
				]}
			/>
		</div>
		<Button variant="fill" type="submit" icon={mdiPlus} color="primary" class="mt-2 w-full"
			>Add Permission</Button
		>
	</form>

	<p class="text-surface-100 mt-5 mb-2">The following logins have access to this device:</p>
	<ul>
		{#each permissions as permission}
			<ListItem
				title={permission.profiles.email}
				subheading={PermissionNumberToName(permission.permission_level)}
				icon={mdiAccount}
				avatar={{ class: 'bg-surface-content/50 text-surface-100/90' }}
			>
				<div slot="actions">
					<Button
						variant="outline"
						icon={mdiTrashCan}
						color="danger"
						on:click={() => deletePermission(permission.id)}
					/>
				</div>
			</ListItem>
		{/each}
	</ul>
</div>
