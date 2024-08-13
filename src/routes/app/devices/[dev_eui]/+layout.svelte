<script lang="ts">
	import { browser } from '$app/environment';
	import { page } from '$app/stores';
	import Back from '$lib/components/ui/Back.svelte';
	import moment from 'moment';
	
	import { mdiCog, mdiDownload } from '@mdi/js';
	import { Button, Icon, Tooltip } from 'svelte-ux';
	import { goto } from '$app/navigation';
	import SensorHeader from '$lib/components/ui/Sensors/SensorHeader.svelte';

	let sensorName = 'NS';
	let devEui = $page.params.dev_eui;
	let lastSeen = new Date();
	let upload_interval = 0;
	let data_table: string;
	let today: Date = new Date();
	let yesterday: Date = moment(today).subtract(1, 'day').toDate();

	const sensorPromise = browser
		? fetch(`/api/v1/devices/${devEui}/data?firstDataDate=${yesterday}&lastDataDate=${today}`)
				.then((res) => res.json())
				.then((sensor) => {
					let newestData = sensor.data.at(0);
					lastSeen = new Date(newestData.created_at);
					sensorName = sensor.device.name;
					data_table = sensor.deviceType.data_table;
					upload_interval = sensor.deviceType.upload_interval;
					return sensor;
				})
		: null;
</script>

{#if sensorPromise !== null}
	{#await sensorPromise}
		loading
	{:then sensor}
		<div class="relative m-1">
			<div class="mx-2 flex flex-row">
				<SensorHeader {sensorName} {lastSeen} {upload_interval} />
				<span class="flex-grow" />
                <Tooltip title={`${sensorName} History Download`}>
					<Button icon={mdiDownload} size="lg" on:click={() => goto(`history`)} />
				</Tooltip>
				<Tooltip title={`${sensorName}'s Settings`}>
					<Button icon={mdiCog} size="lg" on:click={() => goto(`settings`)} />
				</Tooltip>
			</div>
			<slot />
		</div>
	{:catch error}
		<p>{error.message}</p>
	{/await}
{/if}
