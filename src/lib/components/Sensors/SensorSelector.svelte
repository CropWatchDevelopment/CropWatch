<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import type { IDevice } from '$lib/interfaces/IDevice.interface';
	import AiCamera from './ai-camera.svelte';
	import Co2Sensor from './Co2Sensor.svelte';
	import SoilSensor from './SoilSensor.svelte';
	import UnknownSensorType from './UnknownSensorType.svelte';

	let { device }: { device: IDevice } = $props();
	if (browser && (!device || !location)) {
		goto('/app');
	}
	let sensorType = $derived(device.cw_device_type || null);
</script>

{#if sensorType.data_table_v2 == 'cw_soil_data'}
	<!-- <SoilSensor {device} {sensorType} /> -->
	<SoilSensor />
{:else if sensorType.data_table_v2 == 'cw_air_data'}
	<Co2Sensor />
{:else if sensorType.data_table_v2 == 'cw_traffic2'}
	<AiCamera />
{:else}
	<UnknownSensorType />
	<p>Unknown sensor type: {sensorType.data_table_v2}</p>
{/if}
