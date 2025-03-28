<script lang="ts">
	import { page } from '$app/stores';
	import DeviceDeleteDialog from '$lib/components/UI/device/DeviceDeleteDialog.svelte';
	import DeviceGeneralSettings from '$lib/components/UI/device/DeviceGeneralSettings.svelte';
	import DeviceInfo from '$lib/components/UI/device/DeviceInfo.svelte';
	import DevicePermissions from '$lib/components/UI/device/DevicePermissions.svelte';
	import DeviceRulesView from '$lib/components/UI/device/DeviceRulesView.svelte';
	import { getUserState } from '$lib/state/user-state.svelte.js';
	import { mdiBomb } from '@mdi/js';
	import { Button, Card, Tabs, TextField } from 'svelte-ux';
	import { superForm } from 'sveltekit-superforms';

	let { data } = $props();

	let userContext = getUserState();
	userContext.fetchLocations();
	let location = $derived(
		userContext.allLocations.find((loc) => loc.location_id === +$page.params.location_id)
	);
	let devices = $derived(location?.cw_devices ?? []);
	let device = $derived(devices.find((dev) => dev.dev_eui === $page.params.dev_eui));
	let device_data_keys = $derived(Object.keys(device?.latest_data ?? []) ?? []);

	let rules = $derived(data.rules);
	let addRuleForm = $derived(data.addRuleForm);

	let deviceForm = data.updateDeviceLocationForm || { dev_eui: '', lat: 0, long: 0, name: '' };
	const { form, errors, delayed, validate, isTainted, enhance } = superForm(deviceForm);

	let options = [
		{ label: 'General', value: 1 },
		{ label: 'Permissions', value: 2 },
		{ label: 'Rules', value: 3 },
		{ label: 'Info', value: 4 }
	];

	let searchparam = $page.url.searchParams.get('tab');
	let optionsIndex = options.findIndex((option) => option.label === searchparam);
	let value: number = $state(
		optionsIndex ? (options[optionsIndex] ? options[optionsIndex].value : 1) : 1
	); // Clear as mud
</script>

<Tabs {options} bind:value>
	<svelte:fragment slot="content" let:value>
		{#if value === 1}
			<DeviceGeneralSettings updateDeviceLocationForm={data.updateDeviceLocationForm} />
			<Card class="p-4">
				<form method="POST" action="?/updateDeviceLocation" class="flex flex-col gap-2">
					<div class="grid grid-flow-col gap-2">
						<input type="hidden" name="dev_eui" id="id" bind:value={$page.params.dev_eui} />
						<TextField
							label="Location Name"
							name="name"
							id="name"
							bind:value={$form.name}
							aria-invalid={$errors.name ? 'true' : undefined}
							error={$errors.name}
						/>
					</div>
					<div class="grid grid-flow-col gap-2">
						<TextField label="Latitude" type="text" name="lat" id="lat" bind:value={$form.lat} />
					</div>
					<div class="grid grid-flow-col gap-2">
						<TextField
							label="Longitude"
							type="text"
							name="long"
							id="long"
							bind:value={$form.long}
						/>
					</div>

					<div>
						<Button type="submit" variant="fill" color="primary" class="w-full">Submit</Button>
					</div>
				</form>
				<!-- <SuperDebug data={$form} /> -->
			</Card>
		{:else if value === 2}
			<DevicePermissions devicePermissions={data.devicePermissions} />
		{:else if value === 3}
			<DeviceRulesView {rules} {addRuleForm} subjects={device_data_keys} />
		{:else if value === 4}
			<DeviceInfo {device} />
			<h2>DANGER ZONE</h2>
			<Card>
				<DeviceDeleteDialog />
			</Card>
		{/if}
	</svelte:fragment>
</Tabs>
