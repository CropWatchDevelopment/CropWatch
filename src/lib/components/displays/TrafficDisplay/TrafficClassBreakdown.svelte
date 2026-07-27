<script lang="ts">
	import { formatNumber } from '$lib/i18n/format';
	import { m } from '$lib/paraglide/messages.js';
	import { appTheme } from '$lib/theme/appTheme.svelte';
	import {
		metricEmoji,
		metricLabelText,
		trafficClassColor,
		TRAFFIC_CLASS_KEYS
	} from './traffic-data';

	interface Props {
		classKeys: string[];
		classTotals: Record<string, number>;
	}

	let { classKeys, classTotals }: Props = $props();

	const total = $derived(classKeys.reduce((sum, key) => sum + (classTotals[key] ?? 0), 0));

	// Sorted by volume for reading; colors stay pinned to each class's fixed slot.
	const rows = $derived(
		classKeys
			.map((key, index) => {
				const slot = TRAFFIC_CLASS_KEYS.indexOf(key as (typeof TRAFFIC_CLASS_KEYS)[number]);
				return {
					key,
					value: classTotals[key] ?? 0,
					share: total > 0 ? ((classTotals[key] ?? 0) / total) * 100 : 0,
					color: trafficClassColor(appTheme.current, slot >= 0 ? slot : index)
				};
			})
			.sort((left, right) => right.value - left.value)
	);
</script>

{#if total > 0}
	<div class="traffic-breakdown">
		{#each rows as row (row.key)}
			<div class="traffic-breakdown__row">
				<span class="traffic-breakdown__emoji" aria-hidden="true">{metricEmoji(row.key)}</span>
				<div class="traffic-breakdown__body">
					<div class="traffic-breakdown__topline">
						<span class="traffic-breakdown__label">{metricLabelText(row.key)}</span>
						<span class="traffic-breakdown__value">{formatNumber(row.value)}</span>
					</div>
					<div class="traffic-breakdown__track">
						<div
							class="traffic-breakdown__bar"
							style:width="{Math.max(row.share, row.value > 0 ? 1 : 0)}%"
							style:background-color={row.color}
						></div>
					</div>
					<span class="traffic-breakdown__share">
						{m.traffic_share_of_total({ value: row.share.toFixed(row.share >= 10 ? 0 : 1) })}
					</span>
				</div>
			</div>
		{/each}
	</div>
{:else}
	<p class="traffic-breakdown__empty">{m.traffic_no_class_data_recorded()}</p>
{/if}

<style>
	.traffic-breakdown {
		display: flex;
		flex-direction: column;
		gap: 0.7rem;
	}

	.traffic-breakdown__row {
		display: flex;
		align-items: flex-start;
		gap: 0.6rem;
	}

	.traffic-breakdown__emoji {
		font-size: 1.05rem;
		line-height: 1.4;
	}

	.traffic-breakdown__body {
		flex: 1;
		min-width: 0;
	}

	.traffic-breakdown__topline {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.traffic-breakdown__label {
		font-size: 0.9rem;
		color: var(--cw-text-primary);
	}

	.traffic-breakdown__value {
		font-size: 0.95rem;
		font-weight: 700;
		color: var(--cw-text-primary);
		font-variant-numeric: tabular-nums;
	}

	.traffic-breakdown__track {
		margin-top: 0.3rem;
		height: 0.375rem;
		border-radius: 999px;
		background: color-mix(in srgb, var(--cw-border-muted) 40%, transparent);
		overflow: hidden;
	}

	.traffic-breakdown__bar {
		height: 100%;
		border-radius: 999px;
		transition: width var(--cw-duration-fast, 150ms) ease;
	}

	.traffic-breakdown__share {
		display: inline-block;
		margin-top: 0.2rem;
		font-size: 0.75rem;
		color: var(--cw-text-muted);
		font-variant-numeric: tabular-nums;
	}

	.traffic-breakdown__empty {
		margin: 0;
		font-size: 0.9rem;
		color: var(--cw-text-secondary);
	}
</style>
