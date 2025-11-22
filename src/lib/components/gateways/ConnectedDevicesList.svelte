<script lang="ts">
	import type { DeviceGatewayWithDevice } from '$lib/models/DeviceGateway';

	export let devices: DeviceGatewayWithDevice[] = [];
</script>

<div class="border-border bg-card rounded-lg border p-3">
	{#if devices.length === 0}
		<p class="text-muted-foreground m-0 text-sm">
			No devices are currently linked to this gateway.
		</p>
	{:else}
		<ul class="m-0 flex list-none flex-col gap-2 p-0">
			{#each devices as entry (entry.id)}
				<li
					class="flex items-center justify-between border-b border-slate-400/30 px-1 py-2 last:border-b-0"
				>
					<div>
						<p class="text-foreground m-0 text-sm font-semibold">
							{entry.device?.name ?? entry.dev_eui}
						</p>
						<p class="text-muted-foreground mt-0.5 text-xs">
							ID: {entry.device?.dev_eui ?? entry.dev_eui}
						</p>
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</div>
