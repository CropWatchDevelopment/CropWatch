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
	import Calendar from '@event-calendar/core';
	import TimeGrid from '@event-calendar/day-grid';
	import StatsQuickView from '$lib/components/StatsQuickViewModal/StatsQuickView.svelte';
	import DeviceSelect from '$lib/components/DeviceSelect/DeviceSelect.svelte';
	import TempMarker from '$lib/components/leaflet/TempMarker.svelte';

	export let data;
	let view: L.LatLngExpression | undefined = [32.14088948246444, 131.3853159103882];
	let zoom: number | undefined = 19;
	let mapWidth: number = 150;
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
	{#if data.weatherJSON}
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
	{/if}
</div>

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
				{#await data.streamed.sensors}
					<ProgressCircle />
				{:then sensors}
					<!-- <pre>{JSON.stringify(sensors, null, 2)}</pre> -->
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
								{#if sensor && sensor.cw_devices && sensor.cw_devices.lat && sensor.cw_devices.long}
									<Marker
										latLng={[sensor.cw_devices.lat, sensor.cw_devices.long]}
										width={40}
										height={40}
									>
										<StatsQuickView sensor={sensor.cw_devices} />
										{sensor.cw_devices.type}
										{#if sensor.cw_devices.type == 2}
											<TempMarker
												latLng={[sensor.cw_devices.lat, sensor.cw_devices.long]}
												temp={sensor.cw_devices.cw_air_thvd.temperatureC} />
										{/if}
									</Marker>
									
								{/if}
							{/each}
						</Leaflet>
					{/if}
				{/await}
			</div>
		</div>
	</Card>
	{#await data.streamed.sensors}
		<ProgressCircle />
	{:then sensors}
		<DeviceSelect {sensors} />
	{/await}
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
