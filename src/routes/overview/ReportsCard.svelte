<script lang="ts">
	import { resolve } from '$app/paths';
	import { useCwToast } from '@cropwatchdevelopment/cwui';
	import type { OverviewReportDto } from '$lib/api/api.dtos';
	import { m } from '$lib/paraglide/messages.js';
	import { getServices } from '$lib/services/context';
	import OverviewIcon from './OverviewIcon.svelte';
	import OverviewSection from './OverviewSection.svelte';
	import { feedTimeLabel, formatReportPeriod } from './overview';
	import { openReport } from './overview-links';

	interface Props {
		reports: OverviewReportDto[];
		locale: string;
		now: number;
		class?: string;
	}

	let { reports, locale, now, class: className = '' }: Props = $props();

	const services = getServices();
	const toast = useCwToast();
	let downloading = $state<string | null>(null);

	async function download(report: OverviewReportDto) {
		if (downloading) return;
		downloading = `${report.devEui}/${report.file}`;
		try {
			await openReport(services.reports, report.devEui, report.file, toast);
		} finally {
			downloading = null;
		}
	}
</script>

<OverviewSection title={m.overview_reports_title()} class={className}>
	{#snippet actions()}
		<a class="reports__all" href={resolve('/reports')}>{m.overview_reports_all()}</a>
	{/snippet}

	{#if reports.length === 0}
		<p class="reports-empty">{m.overview_reports_empty()}</p>
	{:else}
		<ul class="reports">
			{#each reports as report (`${report.devEui}/${report.file}`)}
				{@const period = formatReportPeriod(report.file, locale)}
				<li>
					<button
						type="button"
						class="report"
						aria-busy={downloading === `${report.devEui}/${report.file}`}
						onclick={() => download(report)}
					>
						<span class="report__tile"><OverviewIcon name="file" size={16} /></span>
						<span class="report__body">
							<span class="report__name">{report.deviceName ?? m.dashboard_unnamed_device()}</span>
							<span class="report__meta">
								{[period, feedTimeLabel(report.createdAt, now, locale, m.overview_yesterday())]
									.filter(Boolean)
									.join(' · ')}
							</span>
						</span>
						<OverviewIcon name="chevron" size={16} class="report__chevron" />
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</OverviewSection>

<style>
	.reports__all {
		font-size: var(--cw-text-sm);
		font-weight: var(--cw-font-medium);
		color: var(--cw-accent-text);
		text-decoration: none;
	}

	.reports__all:hover {
		text-decoration: underline;
	}

	.reports {
		list-style: none;
		margin: 0;
		padding: var(--cw-space-2) var(--cw-space-3) var(--cw-space-4);
	}

	.reports-empty {
		margin: 0;
		padding: var(--cw-space-3) var(--cw-space-6) var(--cw-space-5);
		font-size: var(--cw-text-sm);
		color: var(--cw-text-muted);
	}

	.report {
		display: flex;
		align-items: center;
		gap: var(--cw-space-3);
		width: 100%;
		min-height: 2.75rem;
		padding: var(--cw-space-2) var(--cw-space-3);
		border: none;
		border-radius: var(--cw-radius-lg);
		background: transparent;
		color: var(--cw-text-primary);
		font: inherit;
		text-align: left;
		cursor: pointer;
	}

	.report:hover {
		background: var(--cw-bg-surface-elevated);
	}

	.report:focus-visible {
		outline: var(--cw-focus-ring-width) solid var(--cw-focus-ring-color);
		outline-offset: var(--cw-focus-ring-offset);
	}

	.report[aria-busy='true'] {
		opacity: 0.6;
		cursor: progress;
	}

	.report__tile {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2.125rem;
		height: 2.125rem;
		border-radius: var(--cw-radius-lg);
		background: var(--cw-tone-info-bg-subtle);
		color: var(--cw-tone-info-text);
		flex: none;
	}

	.report__body {
		flex: 1 1 auto;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.report__name {
		font-size: var(--cw-text-sm);
		font-weight: var(--cw-font-medium);
		overflow-wrap: anywhere;
	}

	.report__meta {
		font-size: var(--cw-text-xs);
		color: var(--cw-text-muted);
	}

	.report :global(.report__chevron) {
		color: var(--cw-text-muted);
		flex: none;
	}

	@container overview (width < 640px) {
		.reports {
			padding: var(--cw-space-1) var(--cw-space-2) var(--cw-space-2);
		}

		.reports-empty {
			padding: var(--cw-space-2) var(--cw-space-4) var(--cw-space-4);
		}

		.report {
			min-height: 3.5rem;
			padding: var(--cw-space-2);
		}

		.report__tile {
			width: 2.25rem;
			height: 2.25rem;
		}
	}
</style>
