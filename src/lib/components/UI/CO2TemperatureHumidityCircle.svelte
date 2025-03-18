<script lang="ts">
	import { computeCo2Color } from '$lib/utilities/ComputeCo2Color';

	let {
		co2,
		temperature,
		temperatureNotation = 'ºC',
		humidity = null
	}: {
		co2: number;
		temperature: number;
		temperatureNotation: string;
		humidity: string | null;
	} = $props();

	// Reactive statement to compute background color based on temperature
	let bgColor = $state(computeCo2Color(co2));
</script>

<div class="my-3 flex justify-center rounded-xl bg-surface-300 bg-opacity-50 py-5">
	<div
		class="my-auto flex h-60 w-60 items-center justify-center rounded-full bg-gradient-to-r from-[#375270] to-[#2108b4]"
		style="background: linear-gradient(to right, {bgColor} 0%, {bgColor} 100%);"
	>
		<div
			class="flex h-56 w-56 items-center justify-center rounded-full bg-surface-300 bg-opacity-80"
		>
			<div
				class="flex h-56 w-56 items-center justify-center rounded-full bg-surface-300 bg-opacity-80"
			>
				<div class="space-y-4 text-center">
					<p class="text-surface-50 text-center text-5xl">
						{co2}<sup class="text-surface-900 text-3xl">ppm</sup>
					</p>
					<div class="flex flex-row space-y-4 text-xl">
						<p class="w-full text-center">
							{#if humidity !== null}
								{humidity}<sup class="text-surface-900">%RH</sup>
							{/if}
							{#if temperature !== null}
								{#if humidity !== null}
									<span>|</span>
								{/if}
								{temperature}<sup class="text-surface-900">{temperatureNotation}</sup>
							{/if}
						</p>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
