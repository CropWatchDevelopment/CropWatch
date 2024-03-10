<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { DeviceIntToEnglish, DeviceIntType } from '$lib/helpers/DeviceTypeToName';
	import { mdiEye, mdiMapMarker, mdiMeterGas, mdiThermometer, mdiWater } from '@mdi/js';
	import { Button, Dialog, Icon } from 'svelte-ux';
	import CwStatCard from '../stat-card/CWStatCard.svelte';

	export let sensor;
	let open: boolean = false;
</script>

{#if sensor.type == 5}
	<Icon data={mdiMeterGas} size="3em" class="text-blue-700" on:click={() => (open = true)} />
{:else if sensor.type == 4 || sensor.type == 3}
	<Icon data={mdiThermometer} size="3em" class="text-orange-900" on:click={() => (open = true)} />
{:else}
	<Icon data={mdiMapMarker} size="3em" class="text-slate-900" on:click={() => (open = true)} />
{/if}

<Dialog bind:open>
	<div slot="title">{DeviceIntToEnglish(sensor.type)}</div>

	{#if sensor.type == 5}
		0
	{:else if sensor.type == 4}
		<div class="grid grid-cols-1 md:grid-cols-2 gap-2 m-2">
			<CwStatCard
				title="Temperature"
				counterStartTime={sensor.cw_ss_tmepnpk[0].created_at}
				value={sensor.cw_ss_tmepnpk[0].soil_temperatureC}
				icon={mdiThermometer}
				optimal={19}
			/>
			<CwStatCard
				title="Soil Moisture"
				counterStartTime={sensor.cw_ss_tmepnpk[0].created_at}
				value={sensor.cw_ss_tmepnpk[0].soil_moisture}
				icon={mdiWater}
				optimal={26}
			/>
		</div>
	{:else if sensor.type == 3}
		<div class="grid grid-cols-1 md:grid-cols-2 gap-2 m-2">
			<CwStatCard
				title="Temperature"
				counterStartTime={sensor.cw_ss_tmepnpk[0].created_at}
				value={sensor.cw_ss_tmepnpk[0].soil_temperatureC}
				icon={mdiThermometer}
				optimal={19}
			/>
			<CwStatCard
				title="Soil Moisture"
				counterStartTime={sensor.cw_ss_tmepnpk[0].created_at}
				value={sensor.cw_ss_tmepnpk[0].soil_moisture}
				icon={mdiWater}
				optimal={26}
			/>
		</div>
	{:else if sensor.type == 6}
		<div class="grid grid-cols-1 md:grid-cols-3 gap-2 m-2">
			<CwStatCard
				title="Air Temperature"
				counterStartTime={sensor.seeed_co2_lorawan_uplinks[0].created_at}
				value={sensor.seeed_co2_lorawan_uplinks[0].temperature}
				icon={mdiThermometer}
				optimal={23.88}
			/>
			<CwStatCard
				title="Air Humidity"
				counterStartTime={sensor.seeed_co2_lorawan_uplinks[0].created_at}
				value={sensor.seeed_co2_lorawan_uplinks[0].humidity}
				icon={mdiWater}
				optimal={75}
				notation="%"
			/>
			<CwStatCard
				title="CO²"
				counterStartTime={sensor.seeed_co2_lorawan_uplinks[0].created_at}
				value={sensor.seeed_co2_lorawan_uplinks[0].co2_level}
				icon={mdiWater}
				optimal={800}
				notation="PPM"
			/>
		</div>
	{:else}
		<pre>
			{JSON.stringify(sensor,null, 2)}
		</pre>
	{/if}

	<div slot="actions">
		<Button variant="fill" color="primary">Close</Button>
		<Button
			variant="fill-light"
			color="accent"
			icon={mdiEye}
			on:click={() =>
				goto(
					`/app/locations/${$page.params.location_id}/device-type/${DeviceIntType(sensor.type)}/${sensor.dev_eui}`
				)}>View Details</Button
		>
	</div>
</Dialog>
