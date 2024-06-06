<script lang="ts">
	import Active from '$lib/images/UI/cw_active.svg';
	import Inactive from '$lib/images/UI/cw_inactive_circle.svg';
	import SensorArrow from '$lib/images/UI/cw_get into arrow.svg';
	import { ProgressCircle } from 'svelte-ux';
	import SEEED_T1000_IMG from '$lib/images/devices/seeed-t1000.png';
	import SEEED_S2120_IMG from '$lib/images/devices/seeed_sensecap_s2120.png';
	import { page } from '$app/stores';

	export let sensor;
	export let deviceType;
	const deviceData = fetch(`/api/v1/devices/${sensor.dev_eui}/data/latest`, { method: 'GET' }).then(
		(r) => r.json()
	);
</script>

<div class="flex bg-[#34393f] bg-opacity-50 rounded-xl text-surface-100 my-3 justify-between">
	<!-- Content -->
	<div class="py-4 pl-6 flex items-center space-x-3">
		<!-- image -->
		<div class="h-full rounded-md">
			{#if deviceType.cw_device_type.data_table == 'seeed_t1000'}
				<img src={SEEED_T1000_IMG} alt="device" class="object-cover w-20 h-full rounded-xl" />
			{:else if deviceType.cw_device_type.data_table == 'seeed_sensecap_s2120'}
				<img src={SEEED_S2120_IMG} alt="device" class="object-cover w-20 h-full rounded-xl" />
			{/if}
		</div>
		<!-- data -->
		<div>
			<!-- Title and status -->
			<div class="flex space-x-1 items-center">
				<div class="w-2">
					{#if sensor.status == 'active'}
						<img src={Active} alt="active" />
					{:else}
						<img src={Inactive} alt="inactive" />
					{/if}
				</div>
				<div>
					<p class="text-lg">{sensor.cw_devices.name}</p>
				</div>
			</div>

			{#await deviceData}
				<ProgressCircle />
			{:then dataPoint}
				<div class="grid grid-cols-2 gap-1 text-sm text-left mt-2">
					{#each Object.keys(dataPoint) as value}
						{#if value != 'created_at' && value != 'dev_eui' && value != 'id' && value != 'latitude' && value != 'longitude' && value != 'temperature'}
							<p>{value}</p>
							<p class="ml-6">{dataPoint[value]}</p>
						{/if}
					{/each}
				</div>
			{/await}
		</div>
	</div>
	<!-- href arrow -->

	<!-- <a href="/locations/{location.id}/sensors/{sensors.id}"> -->
	<a href={`/app/devices/${sensor.dev_eui}/data`} class="bg-[#3A393F] mix-blend-soft-light px-3 rounded-xl flex items-center">
		<div class="w-5">
			<img src={SensorArrow} alt="" />
		</div>
	</a>
</div>
