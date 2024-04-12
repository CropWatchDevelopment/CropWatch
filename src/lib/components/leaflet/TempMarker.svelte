<script lang="ts">
	import { Arc, Chart, Group, LinearGradient, Svg, Text } from 'layerchart';
	import L from 'leaflet';
	import 'leaflet/dist/leaflet.css';
	import { createEventDispatcher, getContext, onDestroy, onMount, setContext } from 'svelte';

	export let value: number;
	export let latLng: L.LatLngExpression;
	// export let popupOpen: boolean = false;

	let marker: L.Marker | undefined;
	let markerElement: HTMLDivElement;
	let spring: boolean = true;
	let initialValue = value;

	const dispatch = createEventDispatcher();

	const { getMap }: { getMap: () => L.Map | undefined } = getContext('map');
	const map = getMap();

	setContext('layer', {
		getLayer: () => marker
	});

	onMount(() => {
		if (map) {
			let icon = L.divIcon({
				html: markerElement,
				className: 'map-temp-marker',
				iconSize: L.point(200, 200)
			});
			marker = L.marker(latLng, { icon }).addTo(map);
		}
	});

	onDestroy(() => {
		marker?.remove();
		marker = undefined;
	});

	setContext('layer', {
		getLayer: () => marker
	});
</script>

<div bind:this={markerElement}>
	<Chart>
		<Svg>
			<Group center>
				<LinearGradient class="from-secondary to-primary" vertical let:url>
					<Arc
						{value}
						domain={[-40, 125]}
						range={[-95, 95]}
						innerRadius={50}
						outerRadius={60}
						cornerRadius={0}
						padAngle={0}
						label=""
						{spring}
						let:value
						let:boundingBox
						fill={url}
						track={{ class: 'fill-surface-content/5' }}
					>
						<Text
							value={Math.round(value)}
							textAnchor="middle"
							verticalAnchor="middle"
							class="text-4xl"
							dy={8}
						/>
					</Arc>
				</LinearGradient>
			</Group>
		</Svg>
	</Chart>
</div>
