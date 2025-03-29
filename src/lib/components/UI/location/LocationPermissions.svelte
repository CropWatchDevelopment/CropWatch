<script lang="ts">
	import { Avatar, Button, Card, Header, Icon, SelectField } from 'svelte-ux';
	import {
		mdiAccount,
		mdiAccountMinus,
		mdiAccountOff,
		mdiAccountPlus,
		mdiFloppy,
		mdiLock,
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
	let options = $state(clone.filter((user) => !user.profiles.email.includes('@cropwatch.io')));

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

<Card>
	<Header title="Location's User Permissions" subheading="Subheading" slot="header">
		<div slot="avatar">
			<Avatar class="bg-primary font-bold text-primary-content">
				<Icon data={mdiMapMarkerAccount} class="text-2xl" />
			</Avatar>
		</div>
		<div slot="actions">
			<AddPermissionDialog
				bind:data
				bind:newUser
				bind:existingUsers={locationUsers}
				{onUserAdded}
			/>
		</div>
	</Header>

	<div class="flex max-h-[360px] flex-col overflow-auto">
		{#if options.length === 0}
			<Card class="my-1 p-1">
				<div class="flex flex-row items-center">
					<Avatar
						class="bg-primary font-bold text-primary-content mr-2"
						size="lg"
					>
					<Icon
						class="text-danger"
						data={mdiAccountOff}
					/>
					</Avatar>
					<span class="flex w-1/2 flex-col">
						<b>No users found</b>
					</span>
				</div>
			</Card>
		{/if}
		{#each options as option}
			<Card class="my-1 p-1">
				<div class="flex flex-row items-center">
					<Avatar
						class="bg-primary font-bold text-primary-content mr-2"
						size="lg"
					>
					<Icon
						class={option.permission_level
							? permissionOptionsWithIcon.find((o) => o.value === option.permission_level)?.color
							: 'text-danger'}
						data={option.permission_level
							? permissionOptionsWithIcon.find((o) => o.value === option.permission_level)?.icon
							: mdiAccountOff}
					/>
					</Avatar>
					<span class="flex w-1/2 flex-col">
						<b>{option.profiles.email}</b>
						<small>{option.profiles.full_name}</small>
					</span>
					<span class="flex flex-grow"></span>
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
		{/each}
	</div>
</Card>
