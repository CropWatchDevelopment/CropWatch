<script lang="ts">
	import type { DeviceGatewayWithDevice } from '$lib/models/DeviceGateway';

	export let devices: DeviceGatewayWithDevice[] = [];
</script>

<div class="connected-devices">
	{#if devices.length === 0}
		<p class="connected-devices__empty">No devices are currently linked to this gateway.</p>
	{:else}
		<ul>
			{#each devices as entry (entry.id)}
				<li>
					<div>
						<p class="device-name">{entry.device?.name ?? entry.dev_eui}</p>
						<p class="device-id">ID: {entry.device?.dev_eui ?? entry.dev_eui}</p>
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.connected-devices {
		margin-top: 0.75rem;
		border-radius: 0.5rem;
		background: var(--color-card, rgb(248 250 252));
		border: 1px solid var(--color-border, rgb(226 232 240));
		padding: 0.75rem;
	}

	.connected-devices__empty {
		margin: 0;
		font-size: 0.875rem;
		color: var(--color-text-muted);
	}

	.connected-devices ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.connected-devices li {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.5rem 0.25rem;
		border-bottom: 1px solid rgba(148, 163, 184, 0.3);
	}

	.connected-devices li:last-child {
		border-bottom: none;
	}

	.device-name {
		margin: 0;
		font-weight: 600;
		color: var(--color-text);
		font-size: 0.95rem;
	}

	.device-id {
		margin: 0.15rem 0 0;
		font-size: 0.75rem;
		color: var(--color-text-muted);
	}
</style>
