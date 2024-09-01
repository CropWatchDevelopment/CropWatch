<script lang="ts">
	import Active from '$lib/images/UI/cw_active.svg';
	import Inactive from '$lib/images/UI/cw_inactive_circle.svg';
	import SensorArrow from '$lib/images/UI/cw_get_into_arrow.svg';
	import { ProgressCircle, Tooltip } from 'svelte-ux';
	import SEEED_T1000_IMG from '$lib/images/devices/seeed-t1000.png';
	import SEEED_S2120_IMG from '$lib/images/devices/seeed_sensecap_s2120.png';
	import SEEED_S2103_IMG from '$lib/images/devices/seeed_sensecap_s210x.png';
	import { _ } from 'svelte-i18n';
	import DeviceDataList from './Dashboard/DeviceDataList.svelte';
	import devicesStore from '$lib/stores/devicesStore';

	export let devEui: string;
	export let deviceType: string;
	export let name: string;

	let latestData;

	// Subscribe to devicesStore and update latestData when data changes
	devicesStore.subscribe((devicesData) => {
		latestData = devicesData[devEui];
	});
</script>

<div class="flex justify-between rounded-xl bg-secondary/20 bg-opacity-50">
	<!-- Content -->
	<div class="flex w-full items-center space-x-3 py-4 pl-6">
		<!-- image -->
		<div class="h-full rounded-md">
			{#if deviceType == 'T1000'}
				<Tooltip title="Card Tracker">
					<img src={SEEED_T1000_IMG} alt="device" class="h-full w-20 rounded-xl object-cover" />
				</Tooltip>
			{:else if deviceType == 'seeed_sensecap_s2120'}
				<Tooltip title="Weather Station">
					<img src={SEEED_S2120_IMG} alt="device" class="h-full w-20 rounded-xl object-cover" />
				</Tooltip>
			{:else if deviceType == 'SenseCAP S2103' || deviceType == 'S2101'}
				<Tooltip title={`${deviceType == 'SenseCAP S2103' ? 'CO²' : ''}/Temperature/Humidity Sensor`}>
					<img src={SEEED_S2103_IMG} alt="device" class="h-full w-20 rounded-xl object-cover" />
				</Tooltip>
			{/if}
		</div>
		<!-- data -->
		<div class="w-full">
			<!-- Title and status -->
			<div class="flex w-full items-center space-x-1">
				<div>
					<p class="text-md">{name}</p>
				</div>
			</div>

			{#if latestData}
				<DeviceDataList data={latestData} />
			{:else}
				<ProgressCircle />
				<p>Waiting For Data...</p>
			{/if}
		</div>
	</div>
	<!-- href arrow -->
	<a
		href={`/app/devices/${devEui}/data`}
		class="flex items-center rounded-xl bg-primary px-3"
	>
		<div class="w-5">
			<img src={SensorArrow} alt="" />
		</div>
	</a>
</div>
