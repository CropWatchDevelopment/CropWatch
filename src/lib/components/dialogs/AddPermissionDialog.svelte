<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import {
		mdiAccount,
		mdiAccountMinus,
		mdiAccountOff,
		mdiAccountPlus,
		mdiAccountPlusOutline,
		mdiEmail,
		mdiLockPercent,
		mdiPlus
	} from '@mdi/js';
	import {
	Avatar,
		Button,
		Card,
		Checkbox,
		cls,
		Dialog,
		Header,
		Icon,
		MenuItem,
		SelectField,
		TextField,
		Tooltip
	} from 'svelte-ux';
	import { superForm } from 'sveltekit-superforms';
	let {
		data = $bindable(),
		newUser = $bindable(),
		existingUsers = $bindable(),
		onUserAdded
	} = $props();
	const { form, errors } = superForm(data.addUserPermissionForm);
	let open: boolean = $state(false);

	const permissionOptionsWithIcon = [
		{ label: 'Administrator', value: 1, icon: mdiAccountPlus, color: 'text-success' },
		{ label: 'User', value: 2, icon: mdiAccount, color: 'text-primary' },
		{ label: 'View', value: 3, icon: mdiAccountMinus, color: 'text-warning' },
		{ label: 'Disabled', value: 4, icon: mdiAccountOff, color: 'text-danger' }
	];
</script>

<Tooltip title="+ Add User" position="bottom">
	<Button icon={mdiAccountPlus} variant="outline" on:click={() => (open = true)} />
</Tooltip>

<Dialog bind:open persistent>
	<Card class="p-4">
		<Header title="Add a new user to this location" slot="header">
			<div slot="subheading">
				<p>This will also give the user the <b>'Disabled'</b> permission level for all sensors in this location.</p>
				<p><b>IF</b> you check the <i>Apply Permission to All sensors in this location.</i> checkbox, then the user will
					get the permission Selected in the permission dropdown for <b>ALL</b> sensors in this location</p>
			</div>
			<div slot="avatar">
			  <Avatar class="bg-primary text-primary-content font-bold">
				<Icon data={mdiAccountPlusOutline} />
			  </Avatar>
			</div>
		  </Header>
		<div id="content">
			<form
				class="flex flex-col gap-2"
				method="POST"
				action={`?/addLocationPermission`}
				use:enhance={() => {
					return async ({ result, update }) => {
						if (result.status == 200) {
							onUserAdded(result);
							update();
							open = false;
						}
					};
				}}
			>
				<TextField
					label="email"
					type="email"
					id="email"
					name="email"
					bind:value={newUser.email}
					error={$errors._errors}
				>
					<div slot="prepend">
						<Icon data={mdiEmail} class="mr-2 text-surface-content/50" />
					</div>
				</TextField>
				{#if $errors.email}<span class="invalid">{$errors.name}</span>{/if}

				<SelectField
					id="permission_level"
					name="permission_level"
					options={permissionOptionsWithIcon}
					bind:value={newUser.permissonValue}
					placeholder="Select Permission Level"
					error={$errors.permission_level}
					activeOptionIcon={true}
					icon={mdiLockPercent}
					aria-invalid={$errors.permission_level ? 'true' : undefined}
				>
					<svelte:fragment slot="option" let:option let:index let:selected let:highlightIndex>
						<MenuItem
							class={cls(
								index === highlightIndex && 'bg-surface-content/5',
								option === selected && 'font-semibold',
								option.group ? 'px-4' : 'px-2'
							)}
							scrollIntoView={index === highlightIndex}
							icon={{ data: option.icon }}
						>
							{option.label}
						</MenuItem>
					</svelte:fragment>
				</SelectField>
				<Checkbox name="applyToAllSubDevices"
					>Apply Permission to ALL sensors in this location.</Checkbox
				>
				<input type="hidden" name="location_id" value={$page.params.location_id} />

				<div>
					<Button type="submit" variant="fill" color="default">Yes, Add new User</Button>
					<Button
						on:click={() => {
							open = false;
							newUser = { email: '', permissonValue: 4 };
						}}>Cancel</Button
					>
				</div>
			</form>
		</div>
	</Card>
</Dialog>
