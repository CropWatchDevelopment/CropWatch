<script lang="ts">
  import LocationDangerSettingsSection from './LocationDangerSettingsSection.svelte';
	import LocationPermissions from './LocationPermissions.svelte';
	import LocationGeneralSettings from './LocationGeneralSettings.svelte';

	let {
		data = $bindable(),
		addDeviceForm = $bindable(),
		location,
		locationUsers = $bindable(),
		locationGeneralForm = $bindable()
	} = $props();
</script>

<h1>Settings for {location.name}</h1>

<div class="flex flex-col gap-4 h-full">
	<div class="flex flex-row gap-5">
		<LocationPermissions {data} {locationUsers} />
		<LocationGeneralSettings {location} {locationGeneralForm} />
	</div>
	<span class="flex-1"></span>
	<LocationDangerSettingsSection data={location} />
</div>
