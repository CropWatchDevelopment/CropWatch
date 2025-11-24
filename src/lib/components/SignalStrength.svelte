<script lang="ts">
	import { Tooltip } from 'bits-ui';
	import MaterialIcon from './UI/icons/MaterialIcon.svelte';

	let { strength, gatewayCount }: { strength: number; gatewayCount?: number } = $props();
	let signalStrengthString = $derived(`signal_cellular_${strength}_bar`);
	let signalPercentage = $derived((strength / 4) * 100);
</script>

<div class="my-auto flex items-center" aria-label="Signal strength">
	{#if strength === 0}
		<MaterialIcon name="signal_cellular_nodata" size="medium" />
		<span class="ml-1">0%</span>
	{:else if strength === null || strength === undefined}
		<MaterialIcon name="signal_wifi_statusbar_not_connected" size="medium" />
		<span class="ml-1">N/A</span>
	{:else}
		<MaterialIcon name={signalStrengthString} size="medium" />
		<span class="ml-1">
			{signalPercentage}%
			{#if gatewayCount && strength > 0 && gatewayCount > 1}({gatewayCount}){/if}
		</span>
	{/if}
</div>

<div class="my-auto flex items-center" aria-label={'Signal strength'}>
	<Tooltip.Provider>
		<Tooltip.Root delayDuration={1000}>
			<Tooltip.Trigger class="flex items-center">
				Signal Strength: {signalPercentage}%
			</Tooltip.Trigger>
			<Tooltip.Content side="bottom">
				<div
					class="rounded-md bg-gray-800 px-2 py-1 text-sm text-white shadow-lg"
					style="max-width: 200px;"
				>
					<h4 class="font-semibold">Signal Strength</h4>
					<p class="mt-1">
						The current signal strength of the device is at <strong>{signalPercentage}%</strong>.
					</p>
				</div>
			</Tooltip.Content>
		</Tooltip.Root>
	</Tooltip.Provider>
</div>
