<script>
	import { browser } from '$app/environment';
	import { page } from '$app/stores';
	import Back from '$lib/components/ui/Back.svelte';
	import EditSensorNameDialog from '$lib/components/ui/EditSensorNameDialog.svelte';
	import historyImage from '$lib/images/UI/cw_settings.svg';

	export let sensorName = 'Loading...';

	const latest =
		browser &&
		fetch(`/api/v1/devices/${$page.params.dev_eui}/data?count=1&order=desc`)
			.then((res) => res.json())
			.catch((err) => console.error(err));
</script>

<div class="flex flex-row bg-emerald-300 p-4 text-center justify-center">
	<img src={historyImage} alt="History" class="w-10 h-10" />
	<p class="text-surface-100 text-3xl ml-2">Settings</p>
</div>

<div class="mt-4 mx-2 flex justify-between">
	<Back />
</div>

<div class="m-6">
	{#await latest}
		mdiLoading...
	{:then data}
		{JSON.stringify(data)}
	{/await}
	<EditSensorNameDialog bind:currentSensorName={sensorName} />
</div>
