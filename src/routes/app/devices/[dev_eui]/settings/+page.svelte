<script>
	import { page } from '$app/stores';
	import Back from '$lib/components/ui/Back.svelte';
	import DeleteSensorDialog from '$lib/components/ui/DeleteSensorDialog.svelte';
	import EditSensorNameDialog from '$lib/components/ui/EditSensorNameDialog.svelte';
	import historyImage from '$lib/images/UI/cw_settings.svg';
	import { getDeviceByDevEui } from '$lib/stores/device.store';

	let latestSensorData = getDeviceByDevEui($page.params.dev_eui);
</script>

<div class="flex flex-row bg-emerald-300 p-4 text-center justify-center">
	<img src={historyImage} alt="History" class="w-10 h-10" />
	<p class="text-surface-100 text-3xl ml-2">Settings</p>
</div>

<div class="flex flex-row">
	<Back>Back</Back>
</div>

<div class="flex flex-col m-6 h-full">

	<h1 class="mb-4 text-4xl">{latestSensorData.cw_devices.name}:</h1>
	<EditSensorNameDialog bind:currentSensorName={latestSensorData.cw_devices.name} />

	<span class="flex flex-1" />
	<fieldset class="border border-red-600 p-4">
		<legend>Danger Zone</legend>
		<DeleteSensorDialog bind:dev_eui={$page.params.dev_eui} />
	</fieldset>
</div>
