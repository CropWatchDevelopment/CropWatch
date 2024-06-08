<script lang="ts">
	import { getWeatherImage } from '$lib/utilities/weatherCodeToImage';
	import activeImage from '$lib/images/UI/cw_active.png';
	import inactiveImage from '$lib/images/UI/cw_inactive_circle.png';
	import thermometerImage from '$lib/images/UI/cw_thermometer.png';
	import moistureImage from '$lib/images/UI/cw_moisture.png';
	import { onMount } from 'svelte';
	import { Button, Card, Collapse, Icon, ProgressCircle } from 'svelte-ux';
	import { writable, get } from 'svelte/store';
	import { isDayTime } from '$lib/utilities/isDayTime';
	import { goto } from '$app/navigation';
	import { mdiArrowRight, mdiEye } from '@mdi/js';
	import { _ } from 'svelte-i18n';
	import moment from 'moment';
	import EditLocationNameDialog from './EditLocationNameDialog.svelte';
	import { nameToNotation } from '$lib/utilities/nameToNotation';
	import { fetchWeatherData, weatherData } from '$lib/stores/weatherStore';
	import { convertObject } from '$lib/sensor-dto/convert_all_attempt';

	export let data;
	const locationId = data.location_id;
	let locationName: string = data.cw_locations.name ?? '--';
	let loading = true;
	const devices = writable([]);
	let locationWeatherData = writable(null);

	onMount(async () => {
		try {
			const response = await fetch(`/api/v1/locations/${locationId}/devices`);
			const devicesFromApi = await response.json();

			// Fetch device data in parallel
			const deviceDataPromises = devicesFromApi.map((device) => loadDeviceDataFor(device));
			const deviceDataArray = await Promise.all(deviceDataPromises);
			devicesFromApi.forEach((device, index) => (device.data = deviceDataArray[index]));

			devices.set(devicesFromApi);

			// Fetch weather data
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
					console.log('No data for device:', device.dev_eui, error);
				}
			} catch (err) {
				console.error('Error loading device data:', err);
			}
		}
		return null;
	};
</script>

<div class="bg-white p-3 mb-4 rounded-2xl border-[#D2D2D2] border-[0.1em]">
	<a href="/app/locations/{locationId}" class="">
		<div
			class="w-full h-20 relative rounded-2xl bg-sky-800 bg-blend-overlay bg-no-repeat bg-cover bg-bottom bg-clouds]"
		>
			<div
				class="w-1/2 h-full bg-gradient-to-l from-black absolute top-0 rounded-2xl right-0"
			></div>
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
	</a>
	<div class="pl-2 pt-2">
		<h2 class="text-xl my-3 flex flex-row items-center">
			{locationName ?? '--'}
			<EditLocationNameDialog {locationId} bind:currentLocationName={locationName} />
			<span class="flex flex-grow" />
			<Button
				variant="outline"
				color="primary"
				icon={mdiArrowRight}
				on:click={() => goto(`app/locations/${locationId}`)}
			/>
		</h2>
		<div class="flex">
			<p class="basis-1/3"></p>
			<div class="basis-1/3 text-xs flex flex-row justify-center text-slate-800">
				<img src={thermometerImage} alt="" class="w-4" />
				<p>{$_('dashboardCard.primaryData')}</p>
			</div>
			<div class="basis-1/3 text-xs flex flex-row justify-center">
				<img src={moistureImage} alt="" class="w-4 text-slate-800" />
				<p>{$_('dashboardCard.secondaryData')}</p>
			</div>
		</div>
		<div class="flex flex-col text-sm">
			{#if $devices.length === 0 && loading}
				<ProgressCircle class="flex self-center" />
			{/if}
			{#if $devices.length === 0 && !loading}
				<p class="text-center my-5">{$_('dashboardCard.noDevices')}</p>
			{/if}
			{#each $devices as device}
				<Card
					class="divide-y bg-[#F7FAFF] border-[#FBFBFB] border-[0.1em] rounded-md elevation-none my-2"
				>
					{#if device.data}
						<Collapse>
							<div slot="trigger" class="flex-1 px-3 py-2">
								<div class="flex text-center text-base">
									<div class="basis-1/3 flex items-center space-x-2">
										<div class="w-2">
											{#if device.data}
												<img
													src={moment().diff(moment(device.data.created_at), 'minutes') > 120
														? inactiveImage
														: activeImage}
													alt=""
												/>
											{:else}
												<img src={inactiveImage} alt="" />
											{/if}
										</div>
										<p>{device.cw_devices.name}</p>
									</div>
									{#if device.data}
										<p class="basis-1/3 justify-center m-auto">
											{#if device.data && device.data.primaryData && device.data.primary_data_notation}
												{device.data[device.data.primaryData]}{device.data.primary_data_notation}
											{:else}
												N/A
											{/if}
										</p>
										<p class="basis-1/3 justify-center m-auto">
											{#if device.data && device.data.secondaryData && device.data.secondary_data_notation}
												{device.data[device.data.secondaryData]}{device.data
													.secondary_data_notation}
											{:else}
												N/A
											{/if}
										</p>
									{:else}
										<p class="basis-1/3 justify-center m-auto">(no Data Yet...)</p>
										<p class="basis-1/3 justify-center m-auto"></p>
									{/if}
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
													{device.data[dataPointKey]}
													<span class="text-sm text-slate-500 flex-grow"
														>{nameToNotation(dataPointKey)}</span
													>
												</p>
											</div>
											{#if Object.keys(convertObject(device.data)).length-1 !== index}
												<div class="px-3 pt-2 border-b border-[#7d7d81]"></div>
											{:else}
												<div class="px-3 pt-3"></div>
											{/if}
											<!-- <div class="px-3 pt-2 border-b border-[#7d7d81]"></div> -->
										</div>
									{/each}

									<Button
										on:click={() => goto(`app/devices/${device.data.dev_eui}/data`)}
										variant="fill-light"
										color="primary"
										class="w-full"
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
