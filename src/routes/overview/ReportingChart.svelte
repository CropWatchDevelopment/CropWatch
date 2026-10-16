<script lang="ts">
	import type { OverviewDto } from '$lib/api/api.dtos';
	import { m } from '$lib/paraglide/messages.js';
	import OverviewSection from './OverviewSection.svelte';

	interface Props {
		hourly: OverviewDto['hourly'];
		/** Devices in scope (the denominator). */
		total: number;
		locale: string;
		class?: string;
	}

	let { hourly, total, locale, class: className = '' }: Props = $props();

	/** Below this share an hour is drawn in the warning color. */
	const LOW_PERCENT = 90;

	const bars = $derived.by(() => {
		const hourFormat = new Intl.DateTimeFormat(locale, {
			hour: '2-digit',
			minute: '2-digit',
			hourCycle: 'h23'
		});
		return hourly.map((entry) => {
			const percent = total === 0 ? 0 : Math.round((entry.reporting / total) * 100);
			return {
				hour: entry.hour,
				percent,
				title: m.overview_reporting_bar({
					time: hourFormat.format(new Date(entry.hour)),
					reporting: entry.reporting,
					total,
					percent
				})
			};
		});
	});

	const aria = $derived(
		m.overview_reporting_aria({
			min: bars.length ? Math.min(...bars.map((bar) => bar.percent)) : 0,
			max: bars.length ? Math.max(...bars.map((bar) => bar.percent)) : 0
		})
	);
</script>

<OverviewSection
	title={m.overview_reporting_title()}
	subtitle={m.overview_reporting_subtitle()}
	subtitleOnPhone
	class={className}
>
	<div class="chart">
		<div class="chart__bars" role="img" aria-label={aria}>
			{#each bars as bar (bar.hour)}
				<div
					class="chart__bar"
					class:chart__bar--low={bar.percent < LOW_PERCENT}
					style:height={`${bar.percent}%`}
					title={bar.title}
				></div>
			{/each}
		</div>
		<div class="chart__axis">
			<span>{m.overview_reporting_24h_ago()}</span>
			<span class="chart__axis-mid">{m.overview_reporting_12h_ago()}</span>
			<span>{m.overview_reporting_now()}</span>
		</div>
	</div>
</OverviewSection>

<style>
	.chart {
		display: flex;
		flex-direction: column;
		gap: 0.875rem;
		padding: 0.875rem var(--cw-space-6) var(--cw-space-5);
	}

	.chart__bars {
		display: flex;
		align-items: flex-end;
		gap: var(--cw-space-1);
		height: 6rem;
		padding: var(--cw-space-2);
		border-radius: var(--cw-radius-lg);
		background: var(--cw-bg-surface-elevated);
		border: 1px solid var(--cw-border-muted);
	}

	.chart__bar {
		flex: 1;
		border-radius: 3px 3px 0 0;
		background: var(--cw-chart-cat-1);
	}

	.chart__bar--low {
		background: var(--cw-status-warning);
	}

	.chart__axis {
		display: flex;
		justify-content: space-between;
		font-size: 0.6875rem;
		color: var(--cw-text-muted);
	}

	@container overview (width < 640px) {
		.chart {
			gap: var(--cw-space-3);
			padding: var(--cw-space-3) var(--cw-space-4) var(--cw-space-4);
		}

		.chart__bars {
			gap: 3px;
			height: 5.25rem;
		}

		.chart__bar {
			border-radius: 2px 2px 0 0;
		}

		.chart__axis-mid {
			display: none;
		}
	}
</style>
