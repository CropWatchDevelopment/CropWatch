<script lang="ts">
	import { enhance } from '$app/forms';
	import { PermissionNumberToName } from '$lib/utilities/permissionNumberToName';
	import { mdiAccount, mdiPlus, mdiTrashCan } from '@mdi/js';
	import { toast } from '@zerodevx/svelte-toast';
	import { Button, ListItem, SelectField, TextField } from 'svelte-ux';
	import { _ } from 'svelte-i18n';

	export let devEui;
	// export let permissions;
	let permissions = [];
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
				if (result) {
					update();
					if(permissions) {
						permissions.push(result);
						permissions = permissions;
					}
					//reload page
					toast.push('User Permission Added Successfully!', {
						theme: {
							'--toastBackground': 'green',
							'--toastColor': 'black'
						}
					});
				} else {
					toast.push(
						result.statusText ??
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
			<label for="email" class="text-surface-100">{$_('permissions.email')}:</label>
			<TextField name="email" label={$_('permissions.user_email')} />
		</div>
		<div>
			<label for="role" class="text-surface-100">{$_('permissions.role')}:</label>
			<input type="hidden" name="permission_level" value={permission_level} />
			<SelectField
				label={$_('permissions.role')}
				id="permission_level"
				bind:value={permission_level}
				options={[
					{ value: '1', label: $_('permissions.admin') },
					{ value: '2', label: $_('permissions.user') },
					{ value: '3', label: $_('permissions.viewer') }
				]}
			/>
		</div>
		<Button variant="fill" type="submit" icon={mdiPlus} color="primary" class="mt-2 w-full"
			>{$_('permissions.add_permission')}</Button
		>
	</form>

	<p class="text-surface-100 mt-5 mb-2">{$_('permissions.following_have_access')}:</p>
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
