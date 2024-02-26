<script lang="ts">
	import { goto } from '$app/navigation';

	import { page } from '$app/stores';
	import {
		mdiCalendar,
		mdiChevronLeft,
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

	export let data;
	let view: L.LatLngExpression | undefined = [32.14088948246444, 131.3853159103882];
	let zoom: number | undefined = 20;
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

<h1 class="flex flex-row text-4xl font-semibold text-slate-700 mb-4">
	<Button icon={mdiChevronLeft} size="lg" on:click={() => goto(`/app/locations`)} />
	{#await data.location}
		<ProgressCircle />
	{:then location}
		<p class="my-auto">{location.name}</p>
	{/await}
</h1>

<div class="grid grid-cols-3 gap-2">
	<CwStatCard title="Anomalous Sensors" counterStartTime={null} value={0} notation=" Problems" />
	<CwStatCard title="Outdoor Temp" counterStartTime={null} value={14} optimal={null} />
	<CwStatCard
		title="Outdoor Humidity"
		counterStartTime={null}
		value={34}
		notation="%"
		optimal={null}
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

<Card class="my-2">
	<Header slot="header" class="gap-0">
		<div slot="title" class="text-nowrap text-xl font-medium">Overview Map</div>
		<div slot="avatar">
			<Avatar class="bg-accent-500 text-white font-bold mr-4">
				<Icon data={mdiMapMarker} />
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

	<div
		class="w-full min-h-96"
		slot="contents"
		bind:offsetHeight={mapHeight}
		bind:offsetWidth={mapWidth}
	>
		{#if data.sensors && data.sensors.length > 0}
			<Leaflet
				{view}
				{zoom}
				disableZoom={false}
				width={mapWidth}
				height={mapHeight}
				heatMapLatLngs={data.sensors?.map((s) => s.cw_devices!==null ? [
					s.cw_devices.lat,
					s.cw_devices.long,
					s.cw_devices.cw_ss_tmepnpk[0].soil_temperatureC
				] : [])}
			>
				{#await data.sensors}
					<ProgressCircle />
				{:then sensors}
					{#each sensors as sensor}
						<Marker
							latLng={[sensor.cw_devices.lat, sensor.cw_devices.long]}
							width={40}
							height={40}
							bind:popupOpen={mapPopupOpen}
						>
							<Icon data={mdiMapMarker} classes={{ root: 'text-red-900' }} />
							<div slot="popup">
								<Card>
									<Header slot="header" class="gap-0">
										<div slot="title" class="text-nowrap text-xl font-medium">
											{sensor.cw_devices.name}
										</div>
										<div slot="avatar">
											<Avatar class="bg-accent-500 text-white font-bold mr-4">
												<Icon data={mdiMagnifyScan} />
											</Avatar>
										</div>
									</Header>
									<div slot="contents" class="grid grid-cols-2 gap-2">
										<CwStatCard
											title="Temperature"
											icon={mdiThermometer}
											value={sensor.cw_devices.cw_ss_tmepnpk[0].soil_temperatureC}
											optimal={null}
											counterStartTime={sensor.cw_devices.cw_ss_tmepnpk[0].created_at}
										/>
										<CwStatCard
											title="Moisture"
											icon={mdiWater}
											value={sensor.cw_devices.cw_ss_tmepnpk[0].soil_moisture}
											notation="%"
											optimal={null}
											counterStartTime={sensor.cw_devices.cw_ss_tmepnpk[0].created_at}
										/>
									</div>
									<div slot="actions">
										<Button variant="fill" on:click={() => (mapPopupOpen = false)}>Close</Button>
										<Button
											variant="fill-light"
											color="blue"
											icon={mdiEye}
											on:click={() =>
												goto(`/app/locations/${$page.params.location_id}/${sensor.dev_eui}`)}
											>View Details</Button
										>
									</div>
								</Card>
							</div>
						</Marker>
					{/each}
				{/await}
			</Leaflet>
		{/if}
	</div>
</Card>

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
