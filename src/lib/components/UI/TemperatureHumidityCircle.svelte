<script lang="ts">
	import { computeColor } from "$lib/utilities/ComputeColor";

	let {
		temperature,
		temperatureNotation = 'ºC',
		humidity = null
	}: { temperature: number; temperatureNotation: string; humidity?: string | null } = $props();

	// Reactive statement to compute background color based on temperature
	let bgColor = $state(computeColor(temperature));
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
						{temperature}<sup class="text-surface-900 text-3xl">{temperatureNotation}</sup>
					</p>
					{#if humidity !== null}
						<p class="text-center text-xl">
							{humidity}<span class="text-surface-900 text-xl">% RH</span>
						</p>
					{/if}
				</div>
			</div>
		</div>
	</div>
</div>
