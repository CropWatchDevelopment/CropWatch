<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import {
		mdiAccount,
		mdiAccountMinus,
		mdiAccountOff,
		mdiAccountPlus,
		mdiEmail,
		mdiPlus
	} from '@mdi/js';
	import {
		Button,
		Checkbox,
		cls,
		Dialog,
		Icon,
		MenuItem,
		SelectField,
		TextField,
		Tooltip
	} from 'svelte-ux';
	import { superForm } from 'sveltekit-superforms';
	let { data = $bindable(), newUser = $bindable(), existingUsers = $bindable(), onUserAdded } = $props();
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
	<Button icon={mdiPlus} variant="outline" on:click={() => (open = true)} />
</Tooltip>

<Dialog bind:open persistent>
	<div slot="title">Add User</div>
	<div id="content">
		<form
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
				activeOptionIcon={true}
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
</Dialog>
