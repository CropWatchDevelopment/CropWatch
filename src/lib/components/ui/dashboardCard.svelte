<script lang="ts">
	import { getWeatherImage } from '$lib/utilities/weatherCodeToImage';
	import activeImage from '$lib/images/UI/cw_active.png';
	import inactiveImage from '$lib/images/UI/cw_inactive_circle.png';
	import thermometerImage from '$lib/images/UI/cw_thermometer.png';
	import moistureImage from '$lib/images/UI/cw_moisture.png';
	import { onMount } from 'svelte';
	import { Card, Collapse, ProgressCircle } from 'svelte-ux';
	import { get, writable } from 'svelte/store';

	export let data;
	const locationId = data.location_id;
	const locationName: string = data.cw_locations.name ?? '--';
	const temperature: number = data.weatherJSON.temperature ?? 0;
	const rainfall: number = data.weatherJSON.rainfall ?? 0;
	const humidity: number = data.weatherJSON.humidity ?? 0;
	const windSpeed: number = data.weatherJSON.windSpeed ?? 0;
	const weatherCode: number = data.weatherJSON.weatherCode ?? 0;
	let loading = true;
	const devices = writable([]);

	const loadDeviceDataFor = async (device) => {
		return await fetch(`/api/v1/devices/${device.dev_eui}/data?page=0&count=1`)
			.then((res) => res.json())
			.then((data) => {
				return data;
			});
	};

	onMount(async () => {
		const response = await fetch(`/api/v1/locations/${locationId}/devices`);
		const devicesFromApi = await response.json();
		for (let device of devicesFromApi) {
			device.data = await loadDeviceDataFor(device);
		}
		devices.set(devicesFromApi);
		loading = false;
	});
</script>

<!-- https://images.rawpixel.com/image_800/cHJpdmF0ZS9sci9pbWFnZXMvd2Vic2l0ZS8yMDIyLTA1L2ZsMzYyNjkxODE2NDItcHVibGljLWltYWdlLWtvbnFxczZlLmpwZw.jpgs -->
<div class="bg-white p-3 mb-4 rounded-2xl border-[#D2D2D2] border-[0.1em]">
	<a href="/app/locations/{locationId}" class="">
	<div class="w-full h-20 relative rounded-2xl bg-sky-800 bg-blend-overlay bg-no-repeat bg-cover bg-bottom bg-[url('https://images.rawpixel.com/image_800/cHJpdmF0ZS9sci9pbWFnZXMvd2Vic2l0ZS8yMDIyLTA1L2ZsMzYyNjkxODE2NDItcHVibGljLWltYWdlLWtvbnFxczZlLmpwZw.jpgs')]">
			
		<div class="w-1/2 h-full bg-gradient-to-l from-black absolute top-0 rounded-2xl right-0"></div>
		<div class="absolute top-4 text-[0.65em] text-surface-100 drop-shadow-md right-3 space-y-1">
			<p>Rainfall: {rainfall}%</p>
			<p>Humidity: {humidity}%</p>
			<p>Windspeed: {windSpeed} km/h</p>
		</div>
		<div class="absolute left-3 top-5">
			<p class="flex text-surface-100 text-3xl text-shadow">
				{temperature}<span class="text-xl text-gray-100 drop-shadow-md">ºC</span>
				{#await getWeatherImage(weatherCode, true)}
				<ProgressCircle />
				{:then image}
				<img src={image} alt="weather code icon" class="ml-2 w-12" />
				{:catch error}
				<p>{error}</p>
				{/await}
			</p>
		</div>
	</div>
</a>
	<div class="pl-2 pt-2">
		<h2 class="text-xl my-3">{locationName ?? '--'}</h2>
		<div class="flex">
			<p class="basis-1/3"></p>
			<div class="basis-1/3 text-xs flex">
				<img src={thermometerImage} alt="" class="w-4" />
				<p>Primary Data</p>
			</div>
			<div class="basis-1/3 text-xs flex">
				<img src={moistureImage} alt="" class="w-4" />
				<p>Secondary Data</p>
			</div>
		</div>
		<div class="flex flex-col text-sm">
			{#if $devices.length === 0 && loading}
				<ProgressCircle class="flex self-center" />
			{/if}
			{#each $devices as device}
				<Card
					class="divide-y bg-[#F7FAFF] border-[#FBFBFB] border-[0.1em] rounded-md elevation-none my-2"
				>
					<Collapse>
						<!-- Outside -->
						<div slot="trigger" class="flex-1 px-3 py-2">
							<div class="flex text-center">
								<div class="basis-1/3 flex items-center space-x-2">
									<div class="w-2">
										
										<img
											src={device.isPastDue
												? inactiveImage
												: activeImage}
											alt=""
										/>
									</div>
									<p>{device.cw_devices.name}</p>
								</div>
								<p class="basis-1/3">
									{#if device.data && device.data.primaryData && device.data.primary_data_notation}
										{device.data[device.data.primaryData]}{device.data.primary_data_notation}
									{:else}
										N/A
									{/if}
								</p>
								<p class="basis-1/3">
									{#if device.data && device.data.secondaryData && device.data.secondary_data_notation}
										{device.data[device.data.secondaryData]}{device.data.secondary_data_notation}
									{:else}
										N/A
									{/if}
								</p>
							</div>
						</div>
						<!-- Inside -->
						<div class="pl-4">
							<div class="flex px-3 mt-3">
								<h3 class="text-lg basis-1/3 font-medium mb-2">Details</h3>
							</div>
							{#if device.data}
								{#each Object.keys(device.data) as dataPointKey}
									<div class="px-3 pb-3 flex text-left">
										<p class="basis-1/2 text-sm">{dataPointKey}</p>
										<p class="basis-1/2 text-sm">{device.data[dataPointKey]}</p>
									</div>
								{/each}
							{:else}
								<ProgressCircle />
							{/if}
						</div>
					</Collapse>
				</Card>
			{/each}
		</div>
	</div>
</div>

<style>
	.text-shadow {
		text-shadow: black 5px 5px 3px;
	}
</style>
