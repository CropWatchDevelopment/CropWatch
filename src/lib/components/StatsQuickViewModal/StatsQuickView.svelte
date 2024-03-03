<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { DeviceIntToEnglish, DeviceIntType } from '$lib/helpers/DeviceTypeToName';
	import { mdiEye, mdiMapMarker, mdiMeterGas, mdiThermometer } from '@mdi/js';
	import { Button, Dialog, Icon } from 'svelte-ux';

	export let sensor;
	let open: boolean = false;
</script>

{#if sensor.cw_devices.type == 5}
	<Icon data={mdiMeterGas} size="3em" class="text-blue-700" on:click={() => (open = true)} />
{:else if sensor.cw_devices.type == 4 || sensor.cw_devices.type == 3}
	<Icon data={mdiThermometer} size="3em" class="text-orange-900" on:click={() => (open = true)} />
{:else}
	<Icon data={mdiMapMarker} size="3em" class="text-slate-900" on:click={() => (open = true)} />
{/if}

<Dialog bind:open>
	<div slot="title">{DeviceIntToEnglish(sensor.cw_devices.type)}</div>
	<pre>
      {JSON.stringify(sensor, null, 2)}
  </pre>
	<div slot="actions">
		<Button variant="fill" color="primary">Close</Button>
		<Button
			variant="fill-light"
			color="accent"
			icon={mdiEye}
			on:click={() =>
				goto(
					`/app/locations/${$page.params.location_id}/device-type/${DeviceIntType(sensor.cw_devices.type)}/${sensor.dev_eui}`
				)}>View Details</Button
		>
	</div>
</Dialog>
