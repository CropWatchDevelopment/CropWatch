<script lang="ts">
	import { getWeatherImage } from '$lib/utilities/weatherCodeToImage';
	import activeImage from '$lib/images/UI/cw_active.png';
	import inactiveImage from '$lib/images/UI/cw_inactive_circle.png';
	import thermometerImage from '$lib/images/UI/cw_thermometer.png';
	import moistureImage from '$lib/images/UI/cw_moisture.png';
	import { onMount } from 'svelte';
	import { Button, Card, Collapse, DurationUnits, Duration, ProgressCircle } from 'svelte-ux';
	import { writable, get } from 'svelte/store';
	import { isDayTime } from '$lib/utilities/isDayTime';
	import { goto } from '$app/navigation';
	import { mdiArrowRight, mdiEye } from '@mdi/js';
	import { _ } from 'svelte-i18n';
	import moment from 'moment';
	import { nameToNotation } from '$lib/utilities/nameToNotation';
	import { fetchWeatherData } from '$lib/stores/weatherStore';
	import { convertObject } from '$lib/sensor-dto/convert_all_attempt';
	import { nameToEmoji } from '$lib/utilities/nameToEmoji';

	export let data;
	const locationId = data.location_id;
	let locationName: string = data.cw_locations.name ?? '--';
	let loading = true;
	// let expanded: boolean = false;
	const devices = writable([]);
	let locationWeatherData = writable(null);

	onMount(async () => {
		try {
			const response = await fetch(`/api/v1/locations/${locationId}/devices`);
			const devicesFromApi = await response.json();

			const deviceDataPromises = devicesFromApi.map((device) => loadDeviceDataFor(device));
			const deviceDataArray = await Promise.all(deviceDataPromises);
			devicesFromApi.forEach((device, index) => (device.data = deviceDataArray[index]));

			devices.set(devicesFromApi);

			const weather = await fetchWeatherData(
				data.cw_locations.latitude,
				data.cw_locations.longitude,
				locationId
			);
			locationWeatherData.set(weather);
		} catch (err) {
			console.error('Error loading devices:', err);
			devices.set([]);
		} finally {
			loading = false;
		}
	});

	const loadDeviceDataFor = async (device) => {
		if (device) {
			try {
				const res = await fetch(`/api/v1/devices/${device.dev_eui}/data?page=0&count=1`);
				try {
					return await res.json();
				} catch (error) {
					console.error('No data for device:', device.dev_eui, error);
				}
			} catch (err) {
				console.error('Error loading device data:', err);
			}
		}
		return null;
	};
</script>

<div class="bg-[#E2E2E2] p-0.5 rounded-2xl border-[#D2D2D2] border-[0.1em]">
	<div
		class="w-full h-20 relative rounded-2xl bg-blend-overlay bg-no-repeat bg-cover bg-bottom custom-bg"
	>
		<div class="w-1/2 h-full bg-gradient-to-l from-black absolute top-0 rounded-2xl right-0"></div>
		<div class="absolute top-4 text-xs text-surface-100 drop-shadow-md right-3 space-y-1">
			{#if $locationWeatherData}
				<p>{$_('dashboardCard.rainfall')}: {$locationWeatherData.rainfall}%</p>
				<p>{$_('dashboardCard.humidity')}: {$locationWeatherData.humidity}%</p>
				<p>{$_('dashboardCard.windspeed')}: {$locationWeatherData.windSpeed} km/h</p>
			{:else}
				<p>{$_('dashboardCard.rainfall')}: --%</p>
				<p>{$_('dashboardCard.humidity')}: --%</p>
				<p>{$_('dashboardCard.windspeed')}: -- km/h</p>
			{/if}
		</div>
		<div class="absolute left-3 top-5">
			<p class="flex text-surface-100 text-3xl text-shadow">
				{#if $locationWeatherData}
					{$locationWeatherData.temperature}<span class="text-xl text-gray-100 drop-shadow-md"
						>ºC</span
					>
					{#await getWeatherImage($locationWeatherData.weatherCode, isDayTime())}
						<ProgressCircle />
					{:then image}
						<img src={image} alt="weather code icon" class="ml-2 w-12" />
					{:catch error}
						<p>{error.message}</p>
					{/await}
				{:else}
					--<span class="text-xl text-gray-100 drop-shadow-md">ºC</span>
				{/if}
			</p>
		</div>
	</div>

	<h2 class="text-xl my-3 flex flex-row items-center">
		{locationName ?? '--'}
		<span class="flex flex-grow" />
		<Button
			variant="outline"
			color="primary"
			icon={mdiArrowRight}
			on:click={() => goto(`app/locations/${locationId}`)}
		/>
	</h2>
	<div class="flex flex-col text-sm gap-1 pb-4 px-1">
		{#if $devices.length === 0 && loading}
			<ProgressCircle class="flex self-center" />
		{/if}
		{#if $devices.length === 0 && !loading}
			<p class="text-center my-5">{$_('dashboardCard.noDevices')}</p>
		{/if}
		{#each $devices as device}
			{#if device.data}
				<Collapse classes={{ root: 'shadow-md pr-2 bg-white' }}>
					<div
						slot="trigger"
						class="flex-1 border-l-8 {device.data &&
						moment().diff(moment(device.data.created_at), 'minutes') > 120
							? 'border-l-red-500'
							: 'border-l-green-500'}"
					>
						<div class="my-1 mr-2 border-r-2">
							<div class="flex flex-col text-center text-base">
								<div class="flex flex-row justify-left">
									<b class="text-sm ml-4 text-slate-800">{device.cw_devices.name}</b>
								</div>
								<div class="flex flex-row justify-center">
									{#if device.data}
										<p class="justify-center m-auto">
											{#if device.data && device.data.primaryData && device.data.primary_data_notation}
												<span>
													{nameToEmoji(device.data.primaryData)}
													{device.data[device.data.primaryData]}
												</span>

												<small class="text-slate-800"
													><sup>{device.data.primary_data_notation}</sup></small
												>
											{:else}
												N/A
											{/if}
										</p>
										<p class="justify-center m-auto">
											{#if device.data && device.data.secondaryData && device.data.secondary_data_notation}
												{nameToEmoji(device.data.secondaryData)}
												{device.data[device.data.secondaryData]}
												<small class="text-slate-800"
													><sup>{device.data.secondary_data_notation}</sup></small
												>
											{:else}
												N/A
											{/if}
										</p>
									{:else}
										<p class="basis-1/3 justify-center m-auto">(no Data Yet...)</p>
									{/if}
								</div>
							</div>
						</div>
					</div>
					<div class="pl-4">
						<div class="flex px-3 mt-3">
							<h3 class="text-lg basis-1/3 font-medium mb-2">{$_('dashboardCard.details')}</h3>
						</div>
						{#if device.data}
							{#each Object.keys(convertObject(device.data)) as dataPointKey, index}
								<div class="py-1">
									<div class="px-3 flex">
										<p class="basis-1/2 text-base">{$_(dataPointKey)}</p>
										<p class="basis-1/2 text-base flex flex-row">
											{#if dataPointKey === 'created_at'}
												<Duration
													start={device.data[dataPointKey]}
													totalUnits={2}
													minUnits={DurationUnits.Second}
												/>
											{:else}
												{device.data[dataPointKey]}
												<small class="text-slate-800"
													><sup>{nameToNotation(dataPointKey)}</sup></small
												>
											{/if}
										</p>
									</div>
									{#if Object.keys(convertObject(device.data)).length - 1 !== index}
										<div class="px-3 pt-2 border-b border-[#7d7d81]"></div>
									{:else}
										<div class="px-3 pt-2"></div>
									{/if}
								</div>
							{/each}

							<Button
								on:click={() => goto(`app/devices/${device.data.dev_eui}/data`)}
								variant="fill-light"
								color="primary"
								class="w-full mb-1"
								icon={mdiEye}>{$_('dashboardCard.view')}</Button
							>
						{:else}
							<ProgressCircle />
						{/if}
					</div>
				</Collapse>
			{:else}
				<p class="text-center my-5">{$_('dashboardCard.noData')}</p>
			{/if}
		{/each}
	</div>
</div>

<style>
	.text-shadow {
		text-shadow: black 5px 5px 3px;
	}
	.custom-bg {
		position: relative;
		overflow: hidden;
		background-color: lightgray; /* Temporary background color to ensure the div is visible */
	}
	.custom-bg::before {
		content: ' '; /* Ensure the pseudo-element is generated */
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background-image: url($lib/images/weather/sunny_clouds.png);
		background-size: cover;
		background-position: center;
		filter: blur(1px) grayscale(20%);
	}
</style>
