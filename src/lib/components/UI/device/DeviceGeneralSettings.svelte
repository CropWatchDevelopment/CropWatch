<script lang="ts">
	import { Circle, Map, Marker, Popup, TileLayer } from 'sveaflet';
	import { getUserState } from '$lib/state/user-state.svelte';
	import type { MapOptions } from 'leaflet';
	import { page } from '$app/stores';

	let { updateDeviceLocationForm } = $props();

	let userContext = getUserState();
	userContext.fetchLocations();

	let device = $derived(
		userContext.allDevices.find((dev) => dev.dev_eui === $page.params.dev_eui)
	);

	let latlong = $derived([device?.lat ?? 0, device?.long ?? 0]);
	let mapOptions: MapOptions = $derived({
		center: latlong,
		zoom: 20,
		attributionControl: false,
		// zoomControl: false
	});
</script>

<div style="width:100%;height:500px;">
	<Map
		options={mapOptions}
	>
		<TileLayer url={'https://tile.openstreetmap.org/{z}/{x}/{y}.png'} />
		<Marker latLng={latlong} />
	</Map>
</div>
