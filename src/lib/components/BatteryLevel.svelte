<!-- Battery.svelte (Svelte 5) - Modern Design -->
<script lang="ts">
	import MaterialIcon from './UI/icons/MaterialIcon.svelte';
	import { Tooltip } from 'bits-ui';

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

<div class="my-auto flex items-center" aria-label={ariaLabel}>
	<Tooltip.Provider>
		<Tooltip.Root delayDuration={1000}>
			<Tooltip.Trigger class="flex items-center">
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
			</Tooltip.Trigger>
			<Tooltip.Content side="bottom">
				<div
					class="rounded-md bg-gray-800 px-2 py-1 text-sm text-white shadow-lg"
					style="max-width: 200px;"
				>
					<h4 class="font-semibold">Battery Level</h4>
					<p class="mt-1">
						The current battery level of the device is at <strong>{value}%</strong>.
					</p>
				</div>
			</Tooltip.Content>
		</Tooltip.Root>
	</Tooltip.Provider>
</div>
