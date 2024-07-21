<script lang="ts">
	import { getWeatherImage } from '$lib/utilities/weatherCodeToImage';
	import { onMount } from 'svelte';
	import { Button, Collapse, DurationUnits, Duration, ProgressCircle } from 'svelte-ux';
	import { writable } from 'svelte/store';
	import { isDayTime } from '$lib/utilities/isDayTime';
	import { goto } from '$app/navigation';
	import { mdiArrowRight, mdiEye } from '@mdi/js';
	import { _ } from 'svelte-i18n';
	import moment from 'moment';
	import { nameToNotation } from '$lib/utilities/nameToNotation';
	import { fetchWeatherData } from '$lib/stores/weatherStore';
	import { convertObject } from '$lib/sensor-dto/convert_all_attempt';
	import { nameToEmoji } from '$lib/utilities/nameToEmoji';
	import { deviceDataStore } from '$lib/stores/deviceData.store';
	import { getDeviceByDevEui } from '$lib/stores/device.store';
  
	export let data;
	const locationId = data.location_id;
	let locationName: string = data.cw_locations.name ?? '--';
	let loading = true;
	let locationWeatherData = writable(null);
  
	let devices = [];
	let deviceData = {};
  
	// Subscribe to deviceStore to get the latest devices
	const unsubscribeDeviceStore = deviceDataStore.subscribe(value => {
	  devices = value;
	});
  
	// Subscribe to deviceDataStore to get the latest data
	const unsubscribeDeviceDataStore = deviceDataStore.subscribe(value => {
	  deviceData = value;
	});
  
	// Reactive statement to filter devices by location using dev_eui
	$: filteredDevices = devices.filter(device => 
	  data.cw_locations.cw_device_locations.some(locationDevice => locationDevice.dev_eui === device.dev_eui)
	);
  
	onMount(async () => {
	  try {
		const weather = await fetchWeatherData(
		  data.cw_locations.latitude,
		  data.cw_locations.longitude,
		  locationId
		);
		locationWeatherData.set(weather);
	  } catch (err) {
		console.error('Error loading weather data:', err);
	  } finally {
		loading = false;
	  }
  
	  return () => {
		unsubscribeDeviceStore();
		unsubscribeDeviceDataStore();
	  };
	});
  </script>
  
  <div class="bg-[#E2E2E2] p-0.5 rounded-2xl border-[#D2D2D2] border-[0.1em]">
	<div class="w-full h-20 relative rounded-2xl bg-blend-overlay bg-no-repeat bg-cover bg-bottom custom-bg">
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
			{$locationWeatherData.temperature}<span class="text-xl text-gray-100 drop-shadow-md">ºC</span>
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
	  {#if filteredDevices.length === 0 && loading}
		<ProgressCircle class="flex self-center" />
	  {/if}
	  {#if filteredDevices.length === 0 && !loading}
		<p class="text-center my-5">{$_('dashboardCard.noDevices')}</p>
	  {/if}
	  {#each filteredDevices as device}
		{#if device}
		  <Collapse classes={{ root: 'shadow-md pr-2 bg-white' }}>
			<div
			  slot="trigger"
			  class="flex-1 border-l-8 {device && moment().diff(moment(device.created_at), 'minutes') > 120 ? 'border-l-red-500' : 'border-l-green-500'}"
			>
			  <div class="my-1 mr-2 border-r-2">
				<div class="flex flex-col text-center text-base">
				  <div class="flex flex-row justify-left">
					<b class="text-sm ml-4 text-slate-800">{getDeviceByDevEui(device.dev_eui)?.cw_devices?.name ?? 'un-named'}</b>
				  </div>
				  <div class="flex flex-row justify-center">
					{#if device}
					  <p class="justify-center m-auto">
						{#if device && device.primaryData && device.primary_data_notation}
						  <span>{nameToEmoji(device.primaryData)}{device[device.primaryData]}</span>
						  <small class="text-slate-800"><sup>{device.primary_data_notation}</sup></small>
						{:else}
						  N/A
						{/if}
					  </p>
					  <p class="justify-center m-auto">
						{#if device && device.secondaryData && device.secondary_data_notation}
						  {nameToEmoji(device.secondaryData)}{device[device.secondaryData]}
						  <small class="text-slate-800"><sup>{device.secondary_data_notation}</sup></small>
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
			  {#each Object.keys(convertObject(device)) as dataPointKey, index}
				<div class="py-1">
				  <div class="flex">
					<p class="text-base">{nameToEmoji(dataPointKey)}</p>
					<p class="text-right">{$_(dataPointKey)}</p>
					<span class="flex-grow" />
					<p class="text-base flex flex-row align-bottom">
					  {#if dataPointKey === 'created_at'}
						<Duration start={device[dataPointKey]} totalUnits={2} minUnits={DurationUnits.Second} />
					  {:else}
						{device[dataPointKey]}
						<small class="text-slate-800"><sup>{nameToNotation(dataPointKey)}</sup></small>
					  {/if}
					</p>
				  </div>
				  {#if Object.keys(convertObject(device)).length - 1 !== index}
					<div class="px-3 pt-2 border-b border-[#7d7d81]"></div>
				  {:else}
					<div class="px-3 pt-2"></div>
				  {/if}
				</div>
			  {/each}
  
			  <Button
				on:click={() => goto(`app/devices/${device.dev_eui}/data`)}
				variant="fill-light"
				color="primary"
				class="w-full mb-1"
				icon={mdiEye}>{$_('dashboardCard.view')}</Button
			  >
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
