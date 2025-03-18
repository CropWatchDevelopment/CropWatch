<script lang="ts">
	import { Button, Card, Icon, SelectField } from 'svelte-ux';
	import {
		mdiAccount,
		mdiAccountMinus,
		mdiAccountOff,
		mdiAccountPlus,
		mdiFloppy,
		mdiMapMarkerAccount
	} from '@mdi/js';
	import AddPermissionDialog from '$lib/components/dialogs/AddPermissionDialog.svelte';
	import DeleteDialog from '$lib/components/dialogs/DeleteDialog.svelte';
	import { enhance } from '$app/forms';
	let { data, locationUsers } = $props();

	let newUser = $state({
		email: '',
		permission_level: 4
	});

	let updatePermissionLevelForm: HTMLFormElement;

	const clone = $state(locationUsers);
	let options = $state(clone);

	const permissionOptionsWithIcon = [
		{ label: 'Administrator', value: 1, icon: mdiAccountPlus, color: 'text-success' },
		{ label: 'User', value: 2, icon: mdiAccount, color: 'text-primary' },
		{ label: 'View', value: 3, icon: mdiAccountMinus, color: 'text-warning' },
		{ label: 'Disabled', value: 4, icon: mdiAccountOff, color: 'text-danger' }
	];

	const onPermissionDelete = (results) => {
		options = results.data.locationUsers;
	};

	const onUserAdded = (result) => {
		options = result.data.locationUsers;
	};
</script>

<h1 class="flex w-full flex-row">
	<Icon data={mdiMapMarkerAccount} class="mr-2 items-center" />
	Location's User Permissions
	<span class="flex-grow"></span>
	<AddPermissionDialog bind:data bind:newUser bind:existingUsers={locationUsers} {onUserAdded} />
</h1>

<div class="flex max-h-[360px] flex-col overflow-auto">
	{#each options as option}
		{#if !option.profiles.email.includes('@cropwatch.io')}
			<Card class="my-1 p-1">
				<div class="flex flex-row items-center space-x-2">
					{JSON.stringify(option.value, null, 2)}
					<Icon
						class={option.permission_level
							? permissionOptionsWithIcon.find((o) => o.value === option.permission_level)?.color
							: 'text-danger'}
						data={option.permission_level
							? permissionOptionsWithIcon.find((o) => o.value === option.permission_level)?.icon
							: mdiAccountOff}
					/>
					<span class="flex w-1/2 flex-col">
						<b>{option.profiles.email}</b>
						<small>{option.profiles.full_name}</small>
					</span>
					<div class="flex flex-row">
						<form
							class="flex flex-row"
							method="POST"
							action={`?/updateLocationPermission`}
							bind:this={updatePermissionLevelForm}
							use:enhance={() => {
								return async ({ result, update }) => {
									if (result.status == 200) {
										option['save'] = false;
									}
								};
							}}
						>
							<input type="hidden" name="id" value={option.id} />
							<SelectField
								id="permission_level"
								name="permission_level"
								bind:value={option.permission_level}
								options={permissionOptionsWithIcon}
								on:change={() => {
									option['save'] = true;
								}}
								clearable={false}
							/>
							{#if option.save}
								<Button type="submit" variant="outline" icon={mdiFloppy} color="success"
									>Save</Button
								>
							{/if}
						</form>
						<DeleteDialog id={option.id} user_id={option.user_id} {onPermissionDelete} />
					</div>
				</div>
			</Card>
		{/if}
	{/each}
</div>
