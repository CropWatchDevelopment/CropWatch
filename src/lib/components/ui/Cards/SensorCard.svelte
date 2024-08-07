<script lang="ts">
	import Active from '$lib/images/UI/cw_active.svg';
	import Inactive from '$lib/images/UI/cw_inactive_circle.svg';
	import SensorArrow from '$lib/images/UI/cw_get_into_arrow.svg';
	import { ProgressCircle } from 'svelte-ux';
	import SEEED_T1000_IMG from '$lib/images/devices/seeed-t1000.png';
	import SEEED_S2120_IMG from '$lib/images/devices/seeed_sensecap_s2120.png';
	import SEEED_S2103_IMG from '$lib/images/devices/seeed_sensecap_s210x.png';
	import { _ } from 'svelte-i18n';
	import { nameToNotation } from '../utilities/NameToNotation';
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

<div class="flex bg-[#34393f] bg-opacity-50 rounded-xl justify-between">
	<!-- Content -->
	<div class="py-4 pl-6 flex items-center space-x-3 w-full">
		<!-- image -->
		<div class="h-full rounded-md">
			{#if deviceType == 'seeed_t1000'}
				<img src={SEEED_T1000_IMG} alt="device" class="object-cover w-20 h-full rounded-xl" />
			{:else if deviceType == 'seeed_sensecap_s2120'}
				<img src={SEEED_S2120_IMG} alt="device" class="object-cover w-20 h-full rounded-xl" />
			{:else if deviceType == 'SenseCAP S2103'}
				<img src={SEEED_S2103_IMG} alt="device" class="object-cover w-20 h-full rounded-xl" />
			{/if}
		</div>
		<!-- data -->
		<div class="w-full">
			<!-- Title and status -->
			<div class="flex space-x-1 items-center w-full">
				<div>
					<p class="text-lg">{name}</p>
				</div>
			</div>

			{#if latestData}
				<DeviceDataList data={latestData} />
			{:else}
				<ProgressCircle />
				<p>Loading data...</p>
			{/if}
		</div>
	</div>
	<!-- href arrow -->
	<a href={`/app/devices/${devEui}/data`} class="bg-[#3A393F] mix-blend-soft-light px-3 rounded-xl flex items-center">
		<div class="w-5">
			<img src={SensorArrow} alt="" />
		</div>
	</a>
</div>
