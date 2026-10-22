<script lang="ts">
	import type { OverviewDto } from '$lib/api/api.dtos';
	import { m } from '$lib/paraglide/messages.js';
	import OverviewSection from './OverviewSection.svelte';
	import { donutSegments, DONUT_RADIUS, onlineShare, type DonutRow } from './overview';
	import { deviceHref } from './overview-links';

	interface Props {
		overview: OverviewDto;
		class?: string;
	}

	let { overview, class: className = '' }: Props = $props();

	type View = 'status' | 'alerts' | 'types';
	const VIEWS: View[] = ['status', 'alerts', 'types'];
	const viewLabel: Record<View, () => string> = {
		status: m.overview_breakdown_devices,
		alerts: m.overview_breakdown_alerts,
		types: m.overview_breakdown_types
	};

	let view = $state<View>('status');

	const cat = (n: number) => `var(--cw-chart-cat-${n})`;

	const typeLabel: Record<string, () => string> = {
		cw_air_data: m.overview_type_air,
		cw_soil_data: m.overview_type_soil,
		cw_water_data: m.overview_type_water,
		cw_traffic2: m.overview_type_traffic,
		cw_relay_data: m.overview_type_relay
	};

	const chart = $derived.by((): { rows: DonutRow[]; center: string; centerLabel: string } => {
		const devices = overview.devices;
		if (view === 'status') {
			return {
				rows: [
					{
						key: 'online',
						label: m.status_online(),
						value: devices.online,
						color: 'var(--cw-status-online)'
					},
					{
						key: 'offline',
						label: m.status_offline(),
						value: devices.offline,
						color: 'var(--cw-status-offline)'
					}
				],
				center: `${Math.round(onlineShare(overview) * 100)}%`,
				centerLabel: m.overview_breakdown_online_label()
			};
		}
		if (view === 'alerts') {
			// The devices with the most alerts, each linking to its device page.
			const devices = overview.alerts.topDevices;
			const sum = (list: typeof devices) => list.reduce((total, device) => total + device.count, 0);
			// A single remaining device is shown as itself rather than as "Other".
			const shown =
				devices.length === 4 && sum(devices) === overview.alerts.count
					? devices
					: devices.slice(0, 3);
			const rest = overview.alerts.count - sum(shown);
			const rows: DonutRow[] = shown.map((device) => ({
				key: device.devEui,
				label: device.deviceName ?? m.dashboard_unnamed_device(),
				value: device.count,
				color: '',
				href: deviceHref(device.devEui, device.locationId)
			}));
			if (rest > 0) {
				rows.push({ key: 'other', label: m.overview_breakdown_other(), value: rest, color: '' });
			}
			return {
				rows: rows.map((row, index) => ({ ...row, color: cat(index + 1) })),
				center: String(overview.alerts.count),
				centerLabel: {
					'24h': m.overview_breakdown_alerts_24h,
					'7d': m.overview_breakdown_alerts_7d,
					'30d': m.overview_breakdown_alerts_30d
				}[overview.range]()
			};
		}
		return {
			// Empty types are not shown, so they take no colour either.
			rows: overview.types
				.filter((type) => type.total > 0)
				.map((type, index) => ({
					key: type.dataTable,
					label: (typeLabel[type.dataTable] ?? m.overview_type_other)(),
					value: type.total,
					color: cat(index + 1)
				})),
			center: String(devices.total),
			centerLabel: m.overview_breakdown_devices_label()
		};
	});

	const segments = $derived(donutSegments(chart.rows));
	const legend = $derived(chart.rows.filter((row) => row.value > 0 || view === 'status'));
	// Describes what the legend shows, no more.
	const aria = $derived(
		m.overview_breakdown_aria({
			items: legend.map((row) => `${row.label} ${row.value}`).join(', ')
		})
	);
</script>

{#snippet item(row: DonutRow)}
	<span class="donut__swatch" style:background={row.color}></span>
	<span class="donut__item-label">{row.label}</span>
	<span class="donut__item-value">{row.value}</span>
{/snippet}

<OverviewSection title={m.overview_breakdown_title()} stackOnPhone class={className}>
	{#snippet actions()}
		<div class="tabs" role="group" aria-label={m.overview_breakdown_view_label()}>
			{#each VIEWS as option (option)}
				<button
					type="button"
					class="tabs__option"
					aria-pressed={view === option}
					onclick={() => (view = option)}
				>
					{viewLabel[option]()}
				</button>
			{/each}
		</div>
	{/snippet}

	<div class="donut">
		<div class="donut__ring">
			<svg width="100%" height="100%" viewBox="0 0 168 168" role="img" aria-label={aria}>
				<circle
					cx="84"
					cy="84"
					r={DONUT_RADIUS}
					fill="none"
					stroke="var(--cw-chart-grid)"
					stroke-width="20"
				/>
				<g transform="rotate(-90 84 84)">
					{#each segments as segment (segment.key)}
						<circle
							cx="84"
							cy="84"
							r={DONUT_RADIUS}
							fill="none"
							stroke={segment.color}
							stroke-width="20"
							stroke-dasharray={segment.dash}
							stroke-dashoffset={segment.offset}
						/>
					{/each}
				</g>
			</svg>
			<div class="donut__center">
				<span class="donut__value">{chart.center}</span>
				<span class="donut__label">{chart.centerLabel}</span>
			</div>
		</div>
		{#if legend.length === 0}
			<p class="donut__empty">
				{view === 'alerts' ? m.overview_breakdown_no_alerts() : m.overview_health_empty_title()}
			</p>
		{:else}
			<ul class="donut__legend">
				{#each legend as row (row.key)}
					<li class="donut__entry">
						{#if row.href}
							<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- deviceHref() resolves the path -->
							<a class="donut__item donut__item--link" href={row.href}>{@render item(row)}</a>
						{:else}
							<span class="donut__item">{@render item(row)}</span>
						{/if}
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</OverviewSection>

<style>
	.tabs {
		display: flex;
		gap: var(--cw-space-1);
		padding: 3px;
		border-radius: 0.625rem;
		background: var(--cw-bg-muted);
		border: 1px solid var(--cw-border-muted);
	}

	.tabs__option {
		min-height: var(--cw-control-h-sm);
		padding: 0 0.625rem;
		border-radius: 0.4375rem;
		font: inherit;
		font-size: var(--cw-text-xs);
		font-weight: var(--cw-font-medium);
		cursor: pointer;
		border: 1px solid transparent;
		background: transparent;
		color: var(--cw-text-secondary);
	}

	.tabs__option[aria-pressed='true'] {
		border-color: var(--cw-button-primary-border);
		background: var(--cw-button-primary-bg);
		color: var(--cw-button-primary-text);
		box-shadow: var(--cw-button-primary-shadow);
	}

	.tabs__option:focus-visible {
		outline: var(--cw-focus-ring-width) solid var(--cw-focus-ring-color);
		outline-offset: var(--cw-focus-ring-offset);
	}

	.donut {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--cw-space-4);
		padding: var(--cw-space-5) var(--cw-space-6) var(--cw-space-6);
	}

	.donut__ring {
		position: relative;
		width: 10.5rem;
		height: 10.5rem;
	}

	.donut__center {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		pointer-events: none;
	}

	.donut__value {
		font-size: var(--cw-text-2xl);
		font-weight: var(--cw-font-bold);
		line-height: var(--cw-leading-tight);
		color: var(--cw-text-primary);
		font-variant-numeric: tabular-nums;
	}

	.donut__label {
		font-size: var(--cw-text-xs);
		color: var(--cw-text-muted);
	}

	.donut__legend {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.375rem 0.875rem;
	}

	.donut__entry {
		min-width: 0;
	}

	.donut__item {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		font-size: 0.8125rem;
		color: var(--cw-text-secondary);
		min-width: 0;
	}

	.donut__item--link {
		border-radius: var(--cw-radius-sm);
		text-decoration: none;
	}

	.donut__item--link:hover .donut__item-label {
		text-decoration: underline;
	}

	.donut__item--link:focus-visible {
		outline: var(--cw-focus-ring-width) solid var(--cw-focus-ring-color);
		outline-offset: var(--cw-focus-ring-offset);
	}

	.donut__swatch {
		width: 0.625rem;
		height: 0.625rem;
		border-radius: var(--cw-radius-full);
		flex: none;
	}

	.donut__item-value {
		font-weight: var(--cw-font-semibold);
		color: var(--cw-text-primary);
		font-variant-numeric: tabular-nums;
	}

	.donut__empty {
		margin: 0;
		font-size: var(--cw-text-sm);
		color: var(--cw-text-muted);
	}

	@container overview (width < 640px) {
		.tabs {
			display: grid;
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}

		.tabs__option {
			min-height: 2.25rem;
			padding: 0 var(--cw-space-2);
			font-size: 0.8125rem;
		}

		.donut {
			align-items: stretch;
			gap: 0.875rem;
			padding: 0.875rem var(--cw-space-4) var(--cw-space-4);
		}

		.donut__ring {
			align-self: center;
			width: 11.5rem;
			height: 11.5rem;
		}

		.donut__value {
			font-size: 1.625rem;
			line-height: 1.2;
		}

		.donut__legend {
			display: grid;
			grid-template-columns: repeat(2, minmax(0, 1fr));
			gap: var(--cw-space-2);
		}

		.donut__item {
			display: flex;
			gap: var(--cw-space-2);
			padding: var(--cw-space-2) 0.625rem;
			border-radius: var(--cw-radius-lg);
			background: var(--cw-bg-surface-elevated);
			border: 1px solid var(--cw-border-muted);
		}

		.donut__item-label {
			flex: 1 1 auto;
			min-width: 0;
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
		}
	}
</style>
