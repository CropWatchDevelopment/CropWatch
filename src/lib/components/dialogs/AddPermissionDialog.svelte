<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import {
		mdiAccount,
		mdiAccountMinus,
		mdiAccountOff,
		mdiAccountPlus,
		mdiAccountPlusOutline,
		mdiClose,
		mdiEmail,
		mdiLockPercent,
		mdiPoliceBadge
	} from '@mdi/js';
	import {
		Avatar,
		Button,
		Card,
		Checkbox,
		Dialog,
		Header,
		Icon,
		MenuItem,
		SelectField,
		TextField,
		Tooltip
	} from 'svelte-ux';
	import { cls } from '@layerstack/tailwind';
	import SuperDebug, { superForm } from 'sveltekit-superforms';
	import { dev } from '$app/environment';
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
				<p>
					This will also give the user the <b>'Disabled'</b> permission level for all sensors in this
					location.
				</p>
				<p>
					<b>IF</b> you check the <i>Apply Permission to All sensors in this location.</i> checkbox,
					then the user will get the permission Selected in the permission dropdown for <b>ALL</b> sensors
					in this location
				</p>
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
				use:enhance
			>
				<TextField
					label="email"
					type="email"
					id="email"
					name="email"
					placeholder="Enter email"
					bind:value={$form.email}
					error={$errors.email}
					aria-invalid={$errors.email ? 'true' : undefined}
				>
					<div slot="prepend">
						<Icon data={mdiEmail} class="text-surface-content/50 mr-2" />
					</div>
				</TextField>

				<Card class="bg-accent/10 flex p-2">
					<Header title="Permissions Selection" subheading="Subheading" slot="header">
						<div slot="avatar">
							<Avatar class="bg-primary text-primary-content font-bold">
								<Icon data={mdiPoliceBadge} class="text-2xl" />
							</Avatar>
						</div>
					</Header>
					<SelectField
						class="mb-1 w-full"
						id="permission_level"
						name="permission_level"
						options={permissionOptionsWithIcon}
						bind:value={$form.permissonValue}
						placeholder="Select Permission Level"
						error={$errors.permission_level}
						activeOptionIcon={true}
						icon={mdiLockPercent}
						autoPlacement={false}
						placement="bottom-start"
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
				</Card>
				<input type="hidden" name="location_id" value={$page.params.location_id} />

				<div class="flex w-full flex-row">
					<Button type="submit" variant="fill" icon={mdiAccountPlus} color="default">Yes, Add new User</Button>
					<span class="flex-1"></span>
					<Button
						class="justify-end"
						variant="outline"
						color="default"
						icon={mdiClose}
						on:click={() => {
							open = false;
							newUser = { email: '', permissonValue: 4 };
						}}>Cancel</Button
					>
				</div>
			</form>
		</div>
		{#if dev}
			<SuperDebug data={$form} />
		{/if}
	</Card>
</Dialog>
