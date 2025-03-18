<script lang="ts">
	import { Card, Icon, SelectField } from 'svelte-ux';
	import { mdiAccount, mdiAccountMinus, mdiAccountOff, mdiAccountPlus } from '@mdi/js';
	import { page } from '$app/stores';
	import { nameToJapaneseName } from '$lib/utilities/nameToJapanese';

	let { devicePermissions } = $props();

	let options = $state(
		devicePermissions.map((permission) => ({
			label: permission.profiles.email,
			name: permission.profiles.full_name ?? '<No name added>',
			value: permission.profiles.id,
			permissonValue: permission.permission_level,
			permissionId: permission.id
		}))
	);

	const permissionOptionsWithIcon = [
		{ label: nameToJapaneseName('Administrator'), value: 1, icon: mdiAccountPlus, color: 'text-success' },
		{ label: nameToJapaneseName('User'), value: 2, icon: mdiAccount, color: 'text-primary' },
		{ label: nameToJapaneseName('View'), value: 3, icon: mdiAccountMinus, color: 'text-warning' },
		{ label: nameToJapaneseName('Disabled'), value: 4, icon: mdiAccountOff, color: 'text-danger' }
	];

	function onPermissionChange(e, option) {
		const newValue = e.detail;
		const existingValue = option;
		fetch(`/api/device/${$page.params.dev_eui}/permissions`, {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ newValue, existingValue })
		});
	}
</script>

<h1 class="flex w-full flex-row">
	<Icon data={mdiAccount} class="mr-2 items-center" />
	{nameToJapaneseName('Device Permissions')}
</h1>

<div class="height-full flex flex-col">
	{#each options as option}
		{#if !option.label.includes('@cropwatch.io')}
			<Card class="my-1 p-1">
				<div class="flex flex-row items-center space-x-2">
					<Icon
						class={option.value
							? permissionOptionsWithIcon.find((o) => o.value === option.permissonValue)?.color
							: 'text-danger'}
						data={option.value
							? permissionOptionsWithIcon.find((o) => o.value === option.permissonValue)?.icon
							: mdiAccountOff}
					/>
					<span class="flex w-full flex-col">
						<b>{option.label}</b>
						<small>{option.name}</small>
					</span>
					<SelectField
						bind:value={option.permissonValue}
						options={permissionOptionsWithIcon}
						on:change={(e) => {
							onPermissionChange(e, option);
						}}
					/>
				</div>
			</Card>
		{/if}
	{/each}
</div>
