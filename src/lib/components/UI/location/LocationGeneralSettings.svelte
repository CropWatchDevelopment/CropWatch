<script lang="ts">
	import { Circle, Map, Marker, Popup, TileLayer } from 'sveaflet';
	import type { LatLngTuple, MapOptions } from 'leaflet';
	import { error } from 'highcharts';

	let { location, devices } = $props();
	let latlong: LatLngTuple = $derived([location.lat ?? 0, location.long ?? 0]);
	let marker;
	let circle;
	let mapOptions: MapOptions = $derived({
		center: latlong,
		zoom: 20,
		attributionControl: false,
		zoomControl: false
	});
	let address = $state('〒880-0805 Miyazaki, Tachibanadōrihigashi, 3-chōme−2−8');

	function markerOpenPopup() {
		marker && marker.openPopup();
	}

	function circleOpenPopup() {
		circle && circle.openPopup();
	}

	async function getAddressFromLatLong(lat: number, long: number) {
		const response = await fetch(
			`https://nominatim.openstreetmap.org/search?format=json&q=${lat},${long}`
		)
			.then((res) => res.json())
			.catch((err) => {
				console.error(err);
				return error;
			});
		if (await !response) {
			const data = await response.json();
			console.log(data);
		}
		const responseData = await response.json();
		return responseData;
	}

	async function getLatLongFromAddress(address: string) {
		const response = await fetch(
			`https://nominatim.openstreetmap.org/search?q=${address}&format=geojson`
		)
			.then((res) => res.json())
			.catch((err) => {
				console.error(err);
				return error;
			});
		if (await !response) {
			const data = await response.json();
			console.log(data);
		}
		const responseData = await response.json();
		return responseData;
	}
</script>

<div style="width:100%;height:500px;">
	<!-- <Map options={mapOptions}>
		<Circle
			latLng={latlong}
			options={{
				color: 'red',
				fillColor: 'lightblue',
				fillOpacity: 0.5,
				radius: 50
			}}
			bind:instance={circle}
		>
			<Marker latLng={[location.lat, location.long]} />
			<Popup options={{ content: 'Hello Sveaflet. (Circle)' }} />
		</Circle>
		{#each devices as device}
			<Marker latLng={[device.lat, device.long]} />
		{/each}
		<TileLayer url={'https://tile.openstreetmap.org/{z}/{x}/{y}.png'} />
	</Map> -->
</div>
<!-- <Input type="text" bind:value={address} />
<Button on:click={() => getLatLongFromAddress(address)}>Get Address</Button> -->
