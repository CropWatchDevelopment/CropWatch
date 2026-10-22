<script lang="ts">
	import { resolve } from '$app/paths';
	import { CwCard } from '@cropwatchdevelopment/cwui';
	import type { OverviewDto } from '$lib/api/api.dtos';
	import { formatRelative } from '$lib/i18n/format';
	import { m } from '$lib/paraglide/messages.js';
	import OverviewIcon from './OverviewIcon.svelte';
	import { formatCompact, formatDelta, formatPercent } from './overview';

	interface Props {
		overview: OverviewDto;
		locale: string;
		now: number;
	}

	let { overview, locale, now }: Props = $props();

	const devices = $derived(overview.devices);
	const gatewaysOffline = $derived(overview.gateways.total - overview.gateways.online);
	const delta = $derived(formatDelta(overview.alerts.count, overview.alerts.previousCount, locale));
	const deltaLabel = $derived(
		{
			'24h': m.overview_kpi_delta_24h,
			'7d': m.overview_kpi_delta_7d,
			'30d': m.overview_kpi_delta_30d
		}[overview.range]({ delta })
	);
	// null without a last report, and when its time cannot be read.
	const lastReport = $derived(formatRelative(overview.reports.lastAt, now, locale));
	const expected = $derived(
		overview.uplinks.expected > 0
			? m.overview_kpi_data_expected({
					percent: formatPercent(overview.uplinks.delivered / overview.uplinks.expected, locale)
				})
			: null
	);
</script>

<section class="kpis" aria-label={m.overview_kpis_label()}>
	<CwCard padded={false} class="kpi-card kpi-card--wide-only">
		<div class="kpi">
			<div class="kpi__head">{m.overview_kpi_devices()}<OverviewIcon name="device" /></div>
			<div class="kpi__value">{devices.total}</div>
			<div class="kpi__sub">
				{devices.locationCount === 1
					? m.overview_kpi_devices_sub_one()
					: m.overview_kpi_devices_sub_other({ count: devices.locationCount })}
			</div>
		</div>
	</CwCard>

	<CwCard padded={false} class="kpi-card kpi-card--wide-only">
		<div class="kpi">
			<div class="kpi__head">{m.overview_kpi_online_offline()}<OverviewIcon name="signal" /></div>
			<div class="kpi__split">
				<span class="kpi__value kpi__value--success">{devices.online}</span>
				<span class="kpi__slash">/</span>
				<span class="kpi__value kpi__value--danger">{devices.offline}</span>
			</div>
			<div
				class="kpi__bar"
				role="img"
				aria-label={m.overview_kpi_online_offline_aria({
					online: devices.online,
					offline: devices.offline
				})}
			>
				<div class="kpi__bar-online" style:flex={devices.online}></div>
				<div class="kpi__bar-offline" style:flex={devices.offline}></div>
			</div>
		</div>
	</CwCard>

	<CwCard padded={false} class="kpi-card">
		<div class="kpi">
			<div class="kpi__head">{m.overview_kpi_alerts()}<OverviewIcon name="bell" /></div>
			<div class="kpi__value">{overview.alerts.count}</div>
			<div class="kpi__sub">
				{#if overview.alerts.active > 0}
					<span class="kpi__active"
						>{`${m.overview_kpi_alerts_active({ count: overview.alerts.active })} · `}</span
					>
				{/if}{deltaLabel}
			</div>
		</div>
	</CwCard>

	<!-- The whole card opens the gateways page. -->
	<a class="kpi-link" href={resolve('/gateways')}>
		<CwCard padded={false} class="kpi-card">
			<div class="kpi">
				<div class="kpi__head">{m.overview_kpi_gateways()}<OverviewIcon name="gateway" /></div>
				<div class="kpi__split">
					<span class="kpi__value">{overview.gateways.online}</span>
					<span class="kpi__of kpi__of--wide"
						>{m.overview_kpi_gateways_of({ total: overview.gateways.total })}</span
					>
					<span class="kpi__of kpi__of--narrow">/ {overview.gateways.total}</span>
				</div>
				{#if overview.gateways.total === 0}
					<div class="kpi__sub">{m.overview_kpi_gateways_none()}</div>
				{:else if gatewaysOffline === 0}
					<div class="kpi__sub kpi__sub--success">{m.overview_kpi_gateways_all()}</div>
				{:else}
					<div class="kpi__sub kpi__sub--danger">
						{gatewaysOffline === 1
							? m.overview_kpi_gateways_offline_one()
							: m.overview_kpi_gateways_offline_other({ count: gatewaysOffline })}
					</div>
				{/if}
			</div>
		</CwCard>
	</a>

	<CwCard padded={false} class="kpi-card">
		<div class="kpi">
			<div class="kpi__head">{m.overview_kpi_reports()}<OverviewIcon name="report" /></div>
			<div class="kpi__value">{overview.reports.count}</div>
			<div class="kpi__sub">
				{#if lastReport}
					{m.overview_kpi_reports_last({ when: lastReport })}
				{:else if !overview.reports.lastAt}
					{m.overview_kpi_reports_none()}
				{/if}
			</div>
		</div>
	</CwCard>

	<CwCard padded={false} class="kpi-card">
		<div class="kpi">
			<div class="kpi__head">{m.overview_kpi_data()}<OverviewIcon name="pulse" /></div>
			<div class="kpi__value">{formatCompact(overview.uplinks.count, locale)}</div>
			<div class="kpi__sub">
				<span class="kpi__unit" class:kpi__unit--before-expected={expected !== null}
					>{m.overview_kpi_data_unit()}{#if expected}&nbsp;·&nbsp;{/if}</span
				>{expected ?? ''}
			</div>
		</div>
	</CwCard>
</section>

<style>
	.kpis {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(11.875rem, 1fr));
		gap: var(--cw-space-3);
	}

	.kpis :global(.kpi-card) {
		min-width: 0;
	}

	.kpi-link {
		display: grid;
		min-width: 0;
		color: inherit;
		text-decoration: none;
		border-radius: var(--cw-card-radius);
	}

	.kpi-link:hover :global(.kpi-card) {
		background: var(--cw-bg-surface-elevated);
	}

	.kpi-link:focus-visible {
		outline: var(--cw-focus-ring-width) solid var(--cw-focus-ring-color);
		outline-offset: var(--cw-focus-ring-offset);
	}

	.kpi {
		display: flex;
		flex-direction: column;
		gap: 0.625rem;
		min-width: 0;
	}

	.kpi__head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--cw-space-2);
		font-size: 0.8125rem;
		font-weight: var(--cw-font-semibold);
		color: var(--cw-text-muted);
	}

	.kpi__value {
		font-size: var(--cw-text-3xl);
		font-weight: var(--cw-font-bold);
		letter-spacing: -0.02em;
		line-height: 1;
		color: var(--cw-text-primary);
		font-variant-numeric: tabular-nums;
	}

	.kpi__value--success {
		color: var(--cw-tone-success-text);
	}

	.kpi__value--danger {
		color: var(--cw-tone-danger-text);
	}

	.kpi__split {
		display: flex;
		align-items: baseline;
		gap: 0.375rem;
		line-height: 1;
	}

	.kpi__slash {
		font-size: var(--cw-text-lg);
		color: var(--cw-text-muted);
	}

	.kpi__of {
		font-size: var(--cw-text-sm);
		color: var(--cw-text-muted);
	}

	.kpi__of--narrow {
		display: none;
	}

	.kpi__sub {
		font-size: 0.8125rem;
		color: var(--cw-text-muted);
	}

	.kpi__sub--success {
		color: var(--cw-tone-success-text);
		font-weight: var(--cw-font-semibold);
	}

	.kpi__sub--danger {
		color: var(--cw-tone-danger-text);
		font-weight: var(--cw-font-semibold);
	}

	.kpi__active {
		color: var(--cw-tone-danger-text);
		font-weight: var(--cw-font-semibold);
	}

	.kpi__bar {
		display: flex;
		gap: 2px;
		height: 0.375rem;
		border-radius: var(--cw-radius-pill);
		overflow: hidden;
		background: var(--cw-bg-muted);
	}

	.kpi__bar-online {
		background: var(--cw-status-online);
	}

	.kpi__bar-offline {
		background: var(--cw-status-offline);
	}

	@container overview (width >= 1024px) {
		.kpis {
			grid-template-columns: repeat(6, minmax(0, 1fr));
		}
	}

	/* Phone: the hero card carries devices and online/offline, so the grid is
	   the other four, two by two, slightly tighter. */
	@container overview (width < 640px) {
		.kpis {
			grid-template-columns: repeat(2, minmax(0, 1fr));
			gap: 0.625rem;
		}

		.kpis :global(.kpi-card--wide-only) {
			display: none;
		}

		.kpis :global(.kpi-card > .cw-card__body) {
			padding: 0.875rem;
		}

		.kpi {
			gap: var(--cw-space-2);
		}

		.kpi__head {
			font-size: var(--cw-text-xs);
		}

		.kpi__head :global(svg) {
			width: 1rem;
			height: 1rem;
		}

		.kpi__value {
			font-size: 1.625rem;
		}

		.kpi__sub {
			font-size: var(--cw-text-xs);
		}

		.kpi__active,
		.kpi__unit--before-expected,
		.kpi__of--wide {
			display: none;
		}

		.kpi__of--narrow {
			display: inline;
			font-size: 0.8125rem;
		}
	}
</style>
