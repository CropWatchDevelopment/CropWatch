<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { DeviceIntToEnglish, DeviceIntType } from '$lib/helpers/DeviceTypeToName';
	import { mdiEye, mdiMapMarker, mdiMeterGas, mdiThermometer, mdiWater } from '@mdi/js';
	import { Button, Dialog, Icon } from 'svelte-ux';
	import CwStatCard from '../stat-card/CWStatCard.svelte';

	export let sensor;
	let open: boolean = false;
</script>

<Icon data={mdiThermometer} size="3em" class="text-orange-900" on:click={() => {
	open = true;
}} />

<Dialog bind:open>
	<div slot="title">{DeviceIntToEnglish(sensor.type)}</div>

	{#if sensor.type == 5}
		0
	{:else if sensor.type == 4}
		<div class="grid grid-cols-1 md:grid-cols-2 gap-2 m-2">
			<CwStatCard
				title="{$_('icon sensor.Soil Temperature')}"
				counterStartTime={sensor.cw_ss_tmepnpk[0].created_at}
				value={sensor.cw_ss_tmepnpk[0].soil_temperatureC}
				icon={mdiThermometer}
				optimal={19}
			/>
			<CwStatCard
				title="{$_('icon sensor.Soil Moisture')}l "
				counterStartTime={sensor.cw_ss_tmepnpk[0].created_at}
				value={sensor.cw_ss_tmepnpk[0].soil_moisture}
				icon={mdiWater}
				optimal={26}
			/>
		</div>
	{:else if sensor.type == 3}
		<div class="grid grid-cols-1 md:grid-cols-2 gap-2 m-2">
			<CwStatCard
				title="{$_('icon sensor.Soil Temperature')}"
				counterStartTime={sensor.cw_ss_tmepnpk[0].created_at}
				value={sensor.cw_ss_tmepnpk[0].soil_temperatureC}
				icon={mdiThermometer}
				optimal={19}
			/>
			<CwStatCard
				title="{$_('icon sensor.Soil Moisture')}"
				counterStartTime={sensor.cw_ss_tmepnpk[0].created_at}
				value={sensor.cw_ss_tmepnpk[0].soil_moisture}
				icon={mdiWater}
				optimal={26}
			/>
		</div>
	{:else if sensor.type == 6}
		<div class="grid grid-cols-1 md:grid-cols-3 gap-2 m-2">
			<CwStatCard
				title="{$_('icon sensor.Air Temperature')}"
				counterStartTime={sensor.seeed_co2_lorawan_uplinks[0].created_at}
				value={sensor.seeed_co2_lorawan_uplinks[0].temperature}
				icon={mdiThermometer}
				optimal={23.88}
			/>
			<CwStatCard
				title="{$_('icon sensor.Air Humidity')}"
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
	{:else if sensor.type == 2}
		<div class="grid grid-cols-1 md:grid-cols-2 gap-2 m-2">
			<CwStatCard
				title="{$_('icon sensor.Air Temperature')}"
				counterStartTime={sensor.cw_air_thvd[0].created_at}
				value={sensor.cw_air_thvd[0].temperatureC}
				icon={mdiThermometer}
			/>
			<CwStatCard
				title="{$_('icon sensor.Air Humidity')}"
				counterStartTime={sensor.cw_air_thvd[0].created_at}
				value={sensor.cw_air_thvd[0].humidity}
				icon={mdiThermometer}
				notation="%"
			/>
		</div>
	{:else}
		<!-- <pre>
			{JSON.stringify(sensor, null, 2)}
		</pre> -->
	{/if}

	<div slot="actions">
		<Button variant="fill" color="primary">{$_('icon sensor.Close')}</Button>
		<Button
			variant="fill-light"
			color="accent"
			icon={mdiEye}
			on:click={() =>
				goto(
					`/app/locations/${$page.params.location_id}/device-type/${DeviceIntType(sensor.type)}/${sensor.dev_eui}`
				)}>{$_('icon sensor.View Details')}</Button
		>
	</div>
</Dialog>
