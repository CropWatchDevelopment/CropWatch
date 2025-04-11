<script lang="ts">
	import LocationDangerSettingsSection from './LocationDangerSettingsSection.svelte';
	import LocationPermissions from './LocationPermissions.svelte';
	import LocationGeneralSettings from './LocationGeneralSettings.svelte';
	import { getUserState } from '$lib/state/user-state.svelte';
	import CWCard from '$lib/components/UI/CWCard.svelte';
	import { mdiDevices } from '@mdi/js';

	let {
		data = $bindable(),
		addDeviceForm = $bindable(),
		devices,
		location,
		locationUsers = $bindable(),
		locationGeneralForm = $bindable()
	} = $props();
	let userContext = getUserState();
</script>

<h1>Settings for {location.name}</h1>

<div class="flex flex-row gap-4 mb-4">
	<CWCard text="Location Device Count" value={devices.length} icon="🖥️" notation="" />
	<CWCard text="Location User Count" value={locationUsers.length} icon="👤" notation="" />
</div>

<div class="flex h-full flex-col gap-4">
	<div class="flex flex-row gap-5">
		<LocationPermissions {data} {locationUsers} />
		<LocationGeneralSettings {location} {locationGeneralForm} />
	</div>
	<span class="flex-1"></span>
	<LocationDangerSettingsSection data={location} />
</div>
