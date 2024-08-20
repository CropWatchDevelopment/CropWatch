<script lang="ts">
	export let temperature: number;
	export let temperatureNotation: number = 'ºC';
	export let humidity: number | null;

	// Reactive statement to compute background color based on temperature
	$: bgColor = computeColor(temperature);

	function computeColor(temp: number): string {
		// Temperature range from -40 to +150
		const minTemp = -20;
		const maxTemp = 40;

		// Normalize temperature to a 0-1 scale
		const normalized = (temp - minTemp) / (maxTemp - minTemp);

		// Calculate the red and blue components based on temperature
		const red = Math.round(255 * normalized);
		const blue = Math.round(255 * (1 - normalized));

		// Return the computed RGB color
		return `rgb(${red}, 0, ${blue})`;
	}
</script>

<div class="my-3 flex justify-center rounded-xl bg-surface-300 bg-opacity-50 py-5">
	<div
		class="my-auto flex h-60 w-60 items-center justify-center rounded-full bg-gradient-to-r from-[#375270] to-[#2108b4]"
		style="background: linear-gradient(to right, {bgColor} 0%, {bgColor} 100%);"
	>
		<div class="flex h-56 w-56 items-center justify-center rounded-full bg-surface-300 bg-opacity-80">
			<div
				class="flex h-56 w-56 items-center justify-center rounded-full bg-surface-300 bg-opacity-80"
			>
				<div class="space-y-4 text-center">
					<p class="text-surface-50 text-center text-5xl">
						{temperature}<sup class="text-3xl text-surface-900">{temperatureNotation}</sup>
					</p>
					{#if humidity !== null}
						<p class="text-center text-xl">
							{humidity}<span class="text-xl text-surface-900">%</span>
						</p>
					{/if}
				</div>
			</div>
		</div>
	</div>
</div>
