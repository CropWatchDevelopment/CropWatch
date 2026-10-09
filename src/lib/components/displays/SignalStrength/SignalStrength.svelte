<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { signalBars, signalQuality } from './signalStrength';

	interface Props {
		/** Received signal strength in dBm (e.g. -95). */
		rssi?: number | null;
		/** Signal-to-noise ratio in dB (e.g. 7.5). */
		snr?: number | null;
		class?: string;
	}

	let { rssi = null, snr = null, class: className = '' }: Props = $props();

	const bars = $derived(signalBars(rssi, snr));
	const quality = $derived(signalQuality(bars));
	const qualityLabel = $derived(
		{
			none: m.signal_quality_none(),
			weak: m.signal_quality_weak(),
			okay: m.signal_quality_okay(),
			strong: m.signal_quality_strong()
		}[quality]
	);
	const title = $derived(
		[
			m.signal_strength_label({ quality: qualityLabel }),
			rssi != null ? `${m.gateways_rssi()} ${rssi} dBm` : null,
			snr != null ? `${m.gateways_snr()} ${snr} dB` : null
		]
			.filter(Boolean)
			.join(' · ')
	);
</script>

<span
	class="signal-strength signal-strength--{quality} {className}"
	role="img"
	aria-label={title}
	{title}
>
	{#each [1, 2, 3, 4] as level (level)}
		<span
			class="signal-strength__bar"
			class:signal-strength__bar--on={level <= bars}
			style:height="{level * 25}%"
		></span>
	{/each}
</span>

<style>
	/* Sized in em so the icon scales with the surrounding font-size. */
	.signal-strength {
		display: inline-flex;
		align-items: flex-end;
		gap: 0.12em;
		width: 1.15em;
		height: 1em;
		vertical-align: -0.1em;
		--signal-color: var(--cw-text-muted);
	}

	.signal-strength--weak {
		--signal-color: var(--cw-danger-500);
	}

	.signal-strength--okay {
		--signal-color: var(--cw-warning-500);
	}

	.signal-strength--strong {
		--signal-color: var(--cw-success-500);
	}

	.signal-strength__bar {
		flex: 1;
		border-radius: 1px;
		background: var(--cw-border-default);
	}

	.signal-strength__bar--on {
		background: var(--signal-color);
	}
</style>
