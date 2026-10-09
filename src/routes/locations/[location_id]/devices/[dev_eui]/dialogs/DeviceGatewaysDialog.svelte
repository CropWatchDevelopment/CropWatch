<script lang="ts">
	import { untrack } from 'svelte';
	import { resolve } from '$app/paths';
	import { CwButton, CwDialog, CwSpinner, CwStatusDot } from '@cropwatchdevelopment/cwui';
	import { AppNotice } from '$lib/components/layout';
	import SignalStrength from '$lib/components/displays/SignalStrength/SignalStrength.svelte';
	import { signalBars } from '$lib/components/displays/SignalStrength/signalStrength';
	import { ApiService } from '$lib/api/api.service';
	import type { DeviceGatewayDto } from '$lib/api/api.dtos';
	import { readApiErrorMessage } from '$lib/api/api-error';
	import { formatDateTime } from '$lib/i18n/format';
	import { m } from '$lib/paraglide/messages.js';

	interface Props {
		authToken: string | null;
		devEui: string;
		disabled?: boolean;
	}

	let { authToken, devEui, disabled = false }: Props = $props();

	let open = $state(false);
	let loading = $state(false);
	let loadError = $state<string | null>(null);
	let gateways = $state<DeviceGatewayDto[]>([]);
	let activeRequestId = 0;

	let hasAnonymized = $derived(gateways.some((gateway) => gateway.anonymized));

	// A LoRaWAN uplink is delivered by whichever gateway heard it best, so the
	// device's link quality is that of its strongest gateway (ties: higher RSSI).
	let bestGateway = $derived(
		gateways.reduce<DeviceGatewayDto | null>((best, gateway) => {
			if (!best) return gateway;
			const diff = signalBars(gateway.rssi, gateway.snr) - signalBars(best.rssi, best.snr);
			return diff > 0 || (diff === 0 && (gateway.rssi ?? -Infinity) > (best.rssi ?? -Infinity))
				? gateway
				: best;
		}, null)
	);

	// Load up front so the button can show the signal bars; reloads on open.
	$effect(() => {
		if (!authToken || !devEui) return;
		untrack(() => void loadGateways());
	});

	async function loadGateways() {
		const requestId = ++activeRequestId;
		loading = true;
		loadError = null;

		try {
			const api = new ApiService({ authToken });
			const result = await api.getDeviceGateways(devEui);
			if (requestId !== activeRequestId) return;
			gateways = result;
		} catch (error) {
			if (requestId !== activeRequestId) return;
			gateways = [];
			loadError = readApiErrorMessage(error, m.device_gateways_load_failed());
		} finally {
			if (requestId === activeRequestId) loading = false;
		}
	}

	const openDialog = (): void => {
		open = true;
		void loadGateways();
	};
</script>

<CwButton
	id="device-gateways-open-button"
	onclick={openDialog}
	disabled={disabled || !devEui}
	variant="secondary"
	size="md"
>
	{#if bestGateway}
		<SignalStrength rssi={bestGateway.rssi} snr={bestGateway.snr} />
	{/if}
	{m.gateways_signal()}
</CwButton>

<CwDialog bind:open title={m.device_gateways_button()}>
	<div class="device-gateways">
		{#if loading}
			<div class="device-gateways__loading"><CwSpinner /></div>
		{:else if loadError}
			<AppNotice tone="danger"><p>{loadError}</p></AppNotice>
		{:else if gateways.length === 0}
			<AppNotice tone="neutral"><p>{m.device_gateways_empty()}</p></AppNotice>
		{:else}
			<ul class="device-gateways__list">
				{#each gateways as gateway, index (gateway.gateway_id ?? `anonymized-${index}`)}
					<li class="device-gateways__item">
						<div class="device-gateways__name">
							{#if gateway.anonymized || !gateway.gateway_id}
								<span class="text-(--cw-text-muted)">{m.gateways_other_gateway()}</span>
							{:else}
								<CwStatusDot
									status={gateway.is_online ? 'online' : 'offline'}
									label={gateway.is_online ? m.gateways_online() : m.gateways_offline()}
								/>
								<a
									href={resolve('/gateways/[gateway_id]', { gateway_id: gateway.gateway_id })}
									class="font-medium underline-offset-2 hover:underline"
								>
									{gateway.gateway_name ?? gateway.gateway_id}
								</a>
							{/if}
						</div>
						<dl class="device-gateways__stats">
							<div>
								<dt>{m.gateways_rssi()}</dt>
								<dd>{gateway.rssi != null ? `${gateway.rssi} dBm` : m.common_not_available()}</dd>
							</div>
							<div>
								<dt>{m.gateways_snr()}</dt>
								<dd>{gateway.snr != null ? `${gateway.snr} dB` : m.common_not_available()}</dd>
							</div>
							<div>
								<dt>{m.gateways_signal()}</dt>
								<dd><SignalStrength rssi={gateway.rssi} snr={gateway.snr} /></dd>
							</div>
							<div>
								<dt>{m.gateways_last_heard()}</dt>
								<dd>
									{formatDateTime(gateway.last_update ?? '', undefined, m.common_not_available())}
								</dd>
							</div>
						</dl>
					</li>
				{/each}
			</ul>
			{#if hasAnonymized}
				<p class="text-sm text-(--cw-text-muted)">{m.device_gateways_anonymized_hint()}</p>
			{/if}
		{/if}
	</div>
	{#snippet actions()}
		<CwButton id="device-gateways-close-button" onclick={() => (open = false)} variant="secondary">
			{m.action_close()}
		</CwButton>
	{/snippet}
</CwDialog>

<style>
	.device-gateways {
		display: flex;
		flex-direction: column;
		gap: var(--cw-space-3);
		min-width: min(32rem, 80vw);
	}

	.device-gateways__loading {
		display: flex;
		justify-content: center;
		padding: var(--cw-space-4);
	}

	.device-gateways__list {
		display: flex;
		flex-direction: column;
		gap: var(--cw-space-2);
	}

	.device-gateways__item {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: var(--cw-space-2);
		padding: var(--cw-space-3);
		border: 1px solid var(--cw-border-muted);
		border-radius: var(--cw-radius-md);
	}

	.device-gateways__name {
		display: inline-flex;
		align-items: center;
		gap: var(--cw-space-2);
	}

	.device-gateways__stats {
		display: flex;
		flex-wrap: wrap;
		gap: var(--cw-space-4);
		font-size: 0.875rem;
	}

	.device-gateways__stats dt {
		color: var(--cw-text-muted);
		font-size: 0.75rem;
	}
</style>
