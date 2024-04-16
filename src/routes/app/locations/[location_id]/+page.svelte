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
	import backgroundImg from '$lib/images/breadcrumb-bg.jpg';
	import moment from 'moment';
	import { _ } from 'svelte-i18n';

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
		events: [
			{"id":"event-0","title":"🌤️ 7°C, Rain: 0mm","editable":false,"allDay":true,"backgroundColor":"#a90f0f","start":"2024-03-01T00:00:00.000Z","end":"2024-03-01T00:00:00.000Z"}
		],
		locale: 'ja-jp'
	};

	let displayCalendar = false;

	fetch(
		`https://archive-api.open-meteo.com/v1/archive?latitude=52.52&longitude=13.41&start_date=${moment().startOf('month').format('YYYY-MM-DD')}&end_date=${moment().endOf('day').format('YYYY-MM-DD')}&daily=weather_code,temperature_2m_mean,rain_sum`
	).then(async (r) => {
		const apiResponse = await r.json();

		for (let index = 0; index < apiResponse.daily.time.length; index++) {
			const date = apiResponse.daily.time[index];
			const tempEvent = {
				id: `event-${index}`,
				title: `🌡️ Temp ${apiResponse.daily.temperature_2m_mean[index]}°C`, // Replace the emoji based on weather_code or your preferences
				editable: false,
				allDay: true,
				backgroundColor: '#a90f0f',
				start: new Date(date),
				end: new Date(date)
			};
			const rainEvent = {
				id: `event-${index}`,
				title: `🌧️ Rain: ${apiResponse.daily.rain_sum[index]}mm`, // Replace the emoji based on weather_code or your preferences
				editable: false,
				allDay: true,
				backgroundColor: 'blue',
				start: new Date(date),
				end: new Date(date)
			};
			options.events.push(tempEvent);
			options.events.push(rainEvent);
			options = options;
		}
		options = options;
		displayCalendar = true;
	});

	$: console.log(data);
	view = [data.location.latitude, data.location.longitude];
</script>

<h1
	class="mb-2 flex items-center text-2xl font-bold border-b w-full text-white relative"
	style="background-image:url({backgroundImg}); width:100%; height: 100px;"
>
	<Button
		variant="outline"
		icon={mdiChevronLeft}
		size="lg"
		on:click={() => goto(`/app/locations`)}
	/>
	{#await data.location}
		<ProgressCircle />
	{:then location}
		<p class="my-auto ml-2">{location.name}</p>
	{/await}
</h1>

<div class="my-4">
	{#if data.weatherJSON}
		<WeatherWidget environmentalData={data.weatherJSON} />
	{/if}
</div>

<div class="grid grid-cols-1 md:grid-cols-12 grid-flow-row gap-4">
	<Card class="col-span-12 lg:col-span-8">
		<Header slot="header" class="gap-0">
			<div slot="title" class="text-nowrap text-xl font-medium">{$_('location.map_card_title')}</div>
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
											(s.cw_devices.cw_ss_tmepnpk[0].soil_temperatureC/zoom)
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
		{#if displayCalendar}
		<Calendar {plugins} {options} />
		{/if}
	</div>
</Card>
