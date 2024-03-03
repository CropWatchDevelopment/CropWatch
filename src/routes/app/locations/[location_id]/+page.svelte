<script lang="ts">
	import { goto } from '$app/navigation';

	import { page } from '$app/stores';
	import {
		mdiCalendar,
		mdiChevronLeft,
		mdiDevices,
		mdiDotsVertical,
		mdiEye,
		mdiMagnifyScan,
		mdiMapMarker,
		mdiPlus,
		mdiThermometer,
		mdiWater,
		mdiWeatherSunny
	} from '@mdi/js';
	import {
		Avatar,
		Button,
		Card,
		Header,
		Icon,
		Menu,
		MenuItem,
		MultiSelect,
		ProgressCircle,
		Toggle
	} from 'svelte-ux';
	import Leaflet from '$lib/components/leaflet/Leaflet.svelte';
	import L from 'leaflet';
	import './cloud.css';
	import WeatherChart from '$lib/components/charts/highcharts/weatherChart/WeatherChart.svelte';
	import Marker from '$lib/components/leaflet/Marker.svelte';
	import WeatherWidget from '$lib/components/weatherWidget/WeatherWidget.svelte';
	import CwStatCard from '$lib/components/stat-card/CWStatCard.svelte';
	import Calendar from '@event-calendar/core';
	import TimeGrid from '@event-calendar/day-grid';
	import { DeviceIntToEnglish, DeviceIntType } from '$lib/helpers/DeviceTypeToName';
	import AddDevice from '$lib/components/AddDevice/AddDevice.svelte';
	import StatsQuickView from '$lib/components/StatsQuickViewModal/StatsQuickView.svelte';

	export let data;
	let view: L.LatLngExpression | undefined = [32.14088948246444, 131.3853159103882];
	let zoom: number | undefined = 19;
	let mapWidth: number = 100;
	let mapHeight: number = 100;
	let mapPopupOpen: boolean = false;

	let plugins = [TimeGrid];
	let options = {
		view: 'dayGridMonth',
		date: new Date(),
		events: [],
		locale: 'ja-jp'
	};
	options.events.push({
		id: 'a',
		title: `Rainfall Total: 34mm`,
		editable: false,
		allDay: true,
		backgroundColor: '#a90f0f',
		start: new Date(),
		end: new Date()
	});

	$: console.log(data);
	view = [data.location.latitude, data.location.longitude];
</script>

<h1 class="flex flex-row text-4xl font-semibold text-slate-700 mb-4 gap-3">
	<Button
		variant="outline"
		icon={mdiChevronLeft}
		size="lg"
		on:click={() => goto(`/app/locations`)}
	/>
	{#await data.location}
		<ProgressCircle />
	{:then location}
		<p class="my-auto">{location.name}</p>
	{/await}
</h1>

<div class="my-4">
	<WeatherWidget
		TemperatureC={data.weatherJSON.properties.timeseries.at(0).data.instant.details.air_temperature}
		Humidity={data.weatherJSON.properties.timeseries.at(0).data.instant.details.relative_humidity}
		WindSpeed={data.weatherJSON.properties.timeseries.at(0).data.instant.details.wind_speed}
		WindDirection={data.weatherJSON.properties.timeseries.at(0).data.instant.details
			.wind_from_direction}
		Pressure={data.weatherJSON.properties.timeseries.at(0).data.instant.details
			.air_pressure_at_sea_level}
		UVI={data.weatherJSON.properties.timeseries.at(0).data.instant.details
			.ultraviolet_index_clear_sky}
	/>
</div>

<Card class="my-2">
	<Header slot="header" class="gap-0">
		<div slot="title" class="text-nowrap text-xl font-medium">Weather</div>
		<div slot="avatar">
			<Avatar class="bg-accent-500 text-white font-bold mr-4">
				<Icon data={mdiWeatherSunny} />
			</Avatar>
		</div>
		<div slot="actions">
			<Button icon={mdiDotsVertical} />
		</div>
	</Header>
	<div slot="contents">
		<div class="relative mb-4 overflow-hidden">
			{#await data.weatherJSON}
				<ProgressCircle />
			{:then weather}
				<WeatherChart WeatherJSON={weather} />
			{:catch error}
				<pre>No Weather source currently available!</pre>
			{/await}
		</div>
	</div>
</Card>

<div class="grid grid-cols-1 md:grid-cols-12 grid-flow-row gap-4">
	<Card class="col-span-12 lg:col-span-8">
		<Header slot="header" class="gap-0">
			<div slot="title" class="text-nowrap text-xl font-medium">Overview Map</div>
			<div slot="avatar">
				<Avatar class="bg-accent-500 text-white font-bold mr-4">
					<Icon data={mdiMapMarker} />
				</Avatar>
			</div>
		</Header>

		<div slot="contents">
			<div class="w-full min-h-96" bind:offsetHeight={mapHeight} bind:offsetWidth={mapWidth}>
				{#if data.sensors && data.sensors.length > 0}
					<!-- <pre>{JSON.stringify(data.sensors, null, 4)}</pre> -->
					{#await data.sensors}
						<ProgressCircle />
					{:then sensors}
						{#if sensors}
							<Leaflet
								{view}
								{zoom}
								disableZoom={true}
								width={mapWidth}
								height={mapHeight}
								heatMapLatLngs={sensors
									?.filter((i) => i.cw_devices.type === 3 || i.cw_devices.type === 4)
									.map((s) => {
										if (s.cw_devices.cw_ss_tmepnpk.length > 0)
										return [
											s.cw_devices.lat,
											s.cw_devices.long,
											s.cw_devices.cw_ss_tmepnpk[0].soil_temperatureC
										];
									})}
							>
								{#each sensors as sensor}
									{#if sensor.cw_devices.lat && sensor.cw_devices.long}
										<Marker
											latLng={[sensor.cw_devices.lat, sensor.cw_devices.long]}
											width={40}
											height={40}
										>
											<StatsQuickView {sensor} />
										</Marker>
									{/if}
								{/each}
							</Leaflet>
						{/if}
					{/await}
				{/if}
			</div>
		</div>
	</Card>
	<Card class="col-span-12 lg:col-span-4">
		<Header title="Device Quick View" slot="header">
			<div slot="avatar">
				<Avatar class="bg-accent-500 text-white font-bold mr-4">
					<Icon data={mdiDevices} />
				</Avatar>
			</div>
			<div slot="actions">
				<Toggle let:on={open} let:toggle>
					<Button icon={mdiDotsVertical} on:click={toggle}>
						<Menu {open} on:close={toggle}>
							<MenuItem icon={mdiPlus}>Add Device</MenuItem>
						</Menu>
					</Button>
				</Toggle>
			</div>
		</Header>
		<div slot="contents" class="flex flex-col max-h-[360px] overflow-auto">
			<MultiSelect
				options={data.sensors
					? data.sensors?.map((m) => {
							return {
								name: `${DeviceIntToEnglish(m.cw_devices.type)} - (${m.cw_devices.dev_eui})`,
								value: m.cw_devices.dev_eui
							};
						})
					: []}
				inlineSearch
			>
				<div slot="actions">
					<AddDevice {data} />
				</div>
			</MultiSelect>
		</div>
	</Card>
</div>

<Card id="list" class="grid-flow-row col-span-2 justify-start my-2" title="Location List">
	<Header title="Your Locations" slot="header" class="gap-0">
		<div slot="avatar">
			<Avatar class="bg-accent-500 text-white font-bold mr-4">
				<Icon data={mdiCalendar} />
			</Avatar>
		</div>
		<div slot="actions">
			<Toggle let:on={open} let:toggle>
				<Button icon={mdiDotsVertical} on:click={toggle}>
					<Menu {open} on:close={toggle}>
						<MenuItem icon={mdiPlus}>Add Event</MenuItem>
					</Menu>
				</Button>
			</Toggle>
		</div>
	</Header>
	<div slot="contents">
		<Calendar {plugins} {options} />
	</div>
</Card>
