<script lang="ts">
	import { Button, Collapse, Icon } from 'svelte-ux';
	import { goto } from '$app/navigation';
	import { mdiArrowDown, mdiArrowRight, mdiTimerSand } from '@mdi/js';
	import { nameToEmoji } from '../../utilities/NameToEmoji';
	import DeviceDataList from './DeviceDataList.svelte';
	import { _ } from 'svelte-i18n';
	import { locationWeatherDataStore } from '$lib/stores/locationWeatherDataStore';
	import { deviceStore } from '$lib/stores/deviceStore';
	import type { Tables } from '$lib/types/supabaseSchema';
	import moment from 'moment';

	type deviceType = Tables<'cw_devices'>;

	export let location;

	const locationId = location.location_id;
	let devicesLatestData = deviceStore;
	let open: boolean = false;
	// Initialize devices as an empty array if undefined
	let devices = location.devices || [];

	// Fetch device data for all devices in the location
	devices.forEach((device: deviceType) => {
		deviceStore.fetchDeviceData(device.dev_eui);
	});

	$: {
		// Fetch weather data for this specific location
		locationWeatherDataStore.fetchWeatherData(location.lat, location.long, locationId);
	}
</script>

<div class="border-[rgb(121 121 121)] rounded-2xl border-[0.1em] bg-surface-content/30 p-0.5">
	<div
		class="custom-bg rounded-4xl relative h-20 w-full bg-cover bg-bottom bg-no-repeat bg-blend-overlay"
	>
		<div class="absolute right-0 top-0 h-full w-1/2 rounded-2xl bg-gradient-to-l from-black"></div>
		<div class="absolute right-3 top-4 space-y-1 text-xs text-white drop-shadow-md">
			{#if $locationWeatherDataStore[location.location_id]}
				<p>
					{$_('dashboard.dashboardCard.Rainfall')}: {$locationWeatherDataStore[location.location_id]
						.current?.rain}mm/h
				</p>
				<p>
					{$_('dashboard.dashboardCard.Humidity')}: {$locationWeatherDataStore[location.location_id]
						.current?.relative_humidity_2m}%
				</p>
				<p>
					{$_('dashboard.dashboardCard.WindSpeed')}: {$locationWeatherDataStore[
						location.location_id
					].current?.wind_speed_10m} m/s
				</p>
			{:else}
				<p>{$_('dashboard.dashboardCard.Rainfall')}: --%</p>
				<p>{$_('dashboard.dashboardCard.Humidity')}: --%</p>
				<p>{$_('dashboard.dashboardCard.WindSpeed')}: -- km/h</p>
			{/if}
		</div>
		<div class="absolute left-3 top-5">
			<p class="text-shadow flex text-3xl text-white">
				{#if $locationWeatherDataStore[location.location_id]}
					{$locationWeatherDataStore[location.location_id].current?.temperature_2m}<span
						class="text-xl text-neutral-content drop-shadow-md">ºC</span
					>
				{:else}
					--<span class="text-xl text-gray-100 drop-shadow-md">ºC</span>
				{/if}
			</p>
		</div>
	</div>

	<h2 class="primary-text my-3 flex flex-row items-center overflow-hidden text-ellipsis text-xl">
		{location.name}
		<span class="flex flex-grow" />
		<Button
			variant="fill"
			color="primary"
			icon={mdiArrowRight}
			on:click={() => goto(`/app/locations/${locationId}`)}
		/>
	</h2>
	<div class="flex flex-col gap-1 px-1 pb-4 text-sm">
		{#each location.devices as device}
			<Collapse
				{open}
				icon={!$devicesLatestData[device.dev_eui] ? mdiTimerSand : mdiArrowRight}
				classes={{ root: 'shadow-md pr-2 bg-surface-200/50', icon: 'data-[open=true]:rotate-90' }}
				disabled={!$devicesLatestData[device.dev_eui]}
			>
				<DeviceDataList data={$devicesLatestData[device.dev_eui].latest} />

				<div
					slot="trigger"
					class="flex-1 border-l-8
				 {moment($devicesLatestData[device.dev_eui]?.latest.created_at).isBefore(
						moment().subtract(device.upload_interval, 'minutes')
					)
						? '!border-l-red-500'
						: '!border-l-green-500'}"
				>
					<div class="my-1 mr-2 border-r-2">
						<div class="flex flex-col text-center text-base">
							<div class="justify-left flex flex-row">
								<b class="ml-4 text-sm">{device.name}</b>
							</div>
							{#if $devicesLatestData[device.dev_eui]}
								<div class="flex flex-row justify-center">
									<p class="m-auto justify-center">
										<span>
											{nameToEmoji(device.deviceType.primary_data)}
											{$devicesLatestData[device.dev_eui].latest[
												device.deviceType.primary_data
											]?.toFixed(2)}
										</span>
										<small class="text-secondary-200">
											<sup>{device.deviceType.primary_data_notation}</sup>
										</small>
									</p>
									{#if device.deviceType.secondary_data}
										<p class="m-auto justify-center">
											<span>
												{nameToEmoji(device.deviceType.secondary_data)}
												{$devicesLatestData[device.dev_eui].latest[
													device.deviceType.secondary_data
												]?.toFixed(2)}
											</span>
											<small class="text-secondary-200">
												<sup>{device.deviceType.secondary_data_notation}</sup>
											</small>
										</p>
									{/if}
								</div>
							{:else}
								<div class="flex flex-row">
									<p>{$_('app.loading')}</p>
								</div>
							{/if}
						</div>
					</div>
				</div>
				<div class="pl-4">
					<Button
						on:click={() => goto(`/app/devices/${device.dev_eui}/data`)}
						variant="fill"
						color="info"
						class="mb-1 w-full"
						icon={mdiArrowRight}
					>
						{$_('dashboard.dashboardCard.ViewData')}
					</Button>
				</div>
			</Collapse>
		{/each}
	</div>
</div>

<style>
	.text-shadow {
		text-shadow: black 5px 5px 3px;
	}
	.custom-bg::before {
		content: ' ';
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background-image: url($lib/images/weather/sunny_clouds.png);
		background-size: cover;
		background-position: center;
		-webkit-border-radius: 15px;
		-moz-border-radius: 15px;
		border-radius: 15px;
		filter: blur(1px) grayscale(20%);
	}
</style>
