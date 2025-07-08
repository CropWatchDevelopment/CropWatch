<script lang="ts">
	import LeafletMap from '$lib/components/maps/leaflet/LeafletMap.svelte';
	import type { DeviceWithType } from '$lib/models/Device';
	import { _ } from 'svelte-i18n';

	type Props = {
		device?: DeviceWithType;
		class?: string;
	};

	let { device, class: className = '' }: Props = $props();
</script>

{#if device}
	<section class={className}>
		<h2>{$_('Map')}</h2>
		<div class="aspect-square">
			<LeafletMap
				lat={device.lat || 0}
				lon={device.long || 0}
				zoom={17}
				markers={[[device.lat || 0, device.long || 0]]}
			/>
		</div>
	</section>
{/if}
