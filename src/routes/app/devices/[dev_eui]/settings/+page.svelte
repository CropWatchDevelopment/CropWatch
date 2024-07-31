<script>
	import { page } from '$app/stores';
	import Back from '$lib/components/ui/Back.svelte';
	import DevicePermission from '$lib/components/ui/DevicePermission.svelte';
	import EditSensorNameDialog from '$lib/components/ui/EditSensorNameDialog.svelte';
	import historyImage from '$lib/images/UI/cw_settings.svg';
	import { getDeviceByDevEui } from '$lib/stores/device.store';

	let latestSensorData = getDeviceByDevEui($page.params.dev_eui);
	let devEui = $page.params.dev_eui;
</script>

<div class="flex flex-row bg-emerald-300 p-4 text-center justify-center">
	<img src={historyImage} alt="History" class="w-10 h-10" />
	<p class="text-surface-100 text-3xl ml-2">Settings</p>
</div>

<div class="flex flex-row">
	<Back>Back</Back>
</div>

<!-- Settings forms -->
<div class="divide-y divide-white/5">
	<div
		class="grid max-w-7xl grid-cols-1 gap-x-8 gap-y-10 px-4 py-16 sm:px-6 md:grid-cols-3 lg:px-8"
	>
		<div>
			<h2 class="text-base font-semibold leading-7 text-white">Location Information</h2>
			<p class="mt-1 text-sm leading-6 text-gray-400">
				General Location Information
			</p>
		</div>

		<form class="md:col-span-2">
			<div class="grid grid-cols-1 gap-x-6 gap-y-8 sm:max-w-xl sm:grid-cols-6">
				<div class="col-span-full flex items-center gap-x-8">
					<EditSensorNameDialog bind:currentSensorName={latestSensorData.cw_devices.name} />
				</div>
			</div>
		</form>
	</div>

	<div
		class="grid max-w-7xl grid-cols-1 gap-x-8 gap-y-10 px-4 py-16 sm:px-6 md:grid-cols-3 lg:px-8"
	>
		<div>
			<h2 class="text-base font-semibold leading-7 text-white">Change Permissions</h2>
			<p class="mt-1 text-sm leading-6 text-gray-400">
				Add/Remove users with permission to this Device
			</p>
		</div>

		<form class="md:col-span-2">
			<DevicePermission />
		</form>
	</div>

	

	<span class="flex flex-1" />
	<!-- <fieldset class="border border-red-600 p-4">
		<legend>Danger Zone</legend>
		<DeleteSensorDialog bind:dev_eui={$page.params.dev_eui} />
	</fieldset> -->
</div>
