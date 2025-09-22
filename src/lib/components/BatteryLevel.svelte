<!-- Battery.svelte (Svelte 5) - Modern Design -->
<script lang="ts">
	import MaterialIcon from './UI/icons/MaterialIcon.svelte';

	// Props
	let {
		value = 50, // 0..100
		size = 'medium',
		showLabel = false, // show % text next to icon
		charging = false, // optional charging bolt overlay
		lowThreshold = 15, // % -> red
		midThreshold = 40, // % -> amber
		highThreshold = 70, // % -> yellow; above is green
		ariaLabel = 'Battery level'
	} = $props();

	function getBatteryColor(): string {
		if (value <= lowThreshold) return 'red';
		if (value <= midThreshold) return 'orange';
		if (value <= highThreshold) return 'yellow';
		return 'green';
	}

	let batteryIconName = () => {
		if (value >= 95) return 'battery_android_frame_full';
		if (value >= 75) return 'battery_android_frame_6';
		if (value >= 50) return 'battery_android_frame_5';
		if (value >= 30) return 'battery_android_frame_4';
		if (value >= 15) return 'battery_android_frame_3';
		if (value >= 5) return 'battery_android_frame_2';
		return 'battery_android_alert'; // very low battery
	};
</script>

<div class="my-auto flex items-center space-x-1" aria-label={ariaLabel}>
	<MaterialIcon
		name={batteryIconName()}
		{size}
		class={getBatteryColor() === 'green'
			? 'text-green-500'
			: getBatteryColor() === 'yellow'
				? 'text-yellow-500'
				: 'text-red-500'}
	/>
	{value}%
</div>
