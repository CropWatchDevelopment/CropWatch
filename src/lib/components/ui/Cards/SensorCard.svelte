<script lang="ts">
	import Active from '$lib/images/UI/cw_active.svg';
	import Inactive from '$lib/images/UI/cw_inactive_circle.svg';
	import SensorArrow from '$lib/images/UI/cw_get into arrow.svg';
	import { ProgressCircle } from 'svelte-ux';
	import SEEED_T1000_IMG from '$lib/images/devices/seeed-t1000.png';
	import SEEED_S2120_IMG from '$lib/images/devices/seeed_sensecap_s2120.png';
    import SEEED_S2103_IMG from '$lib/images/devices/seeed_sensecap_s210x.png';
	import { _ } from 'svelte-i18n';
	import { nameToNotation } from '../utilities/NameToNotation';
	import DeviceDataList from './Dashboard/DeviceDataList.svelte';

    export let devEui: string;
	export let deviceType: string;
    export let name: string;
    export let latestData: any;
</script>

<div class="flex bg-[#34393f] bg-opacity-50 rounded-xl my-3 justify-between">
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
				<div class="w-2">
					<!-- {#if sensor.status == 'active'}
						<img src={Active} alt="active" />
					{:else}
						<img src={Inactive} alt="inactive" />
					{/if} -->
				</div>
				<div>
					<p class="text-lg">{name}</p>
				</div>
			</div>

			{#if latestData}
				<!-- <div class="grid grid-cols-2 gap-1 text-sm text-left mt-2">
					{#each Object.keys(latestData) as value}
						{#if value != 'created_at' && value != 'dev_eui' && value != 'id' && value != 'latitude' && value != 'longitude' && value != 'temperature'}
							<p>{ $_(value)}</p>
							<p class="ml-6">{latestData[value]}{nameToNotation(value)}</p>
						{/if}
					{/each}
				</div> -->
                <DeviceDataList data={latestData} />
			{/if}
		</div>
	</div>
	<!-- href arrow -->

	<!-- <a href="/locations/{location.id}/sensors/{sensors.id}"> -->
	<a href={`/app/devices/${devEui}/data`} class="bg-[#3A393F] mix-blend-soft-light px-3 rounded-xl flex items-center">
		<div class="w-5">
			<img src={SensorArrow} alt="" />
		</div>
	</a>
</div>