<script lang="ts">
	import { getAppContext } from '$lib/appContext.svelte';
	import { AppNotice } from '$lib/components/layout';
	import { formatDateTime } from '$lib/i18n/format';
	import { appChartPalette } from '$lib/theme/chartPalette';
	import { m } from '$lib/paraglide/messages.js';
	import {
		CwCard,
		CwDonutChart,
		CwDrawer,
		type CwDonutSegment,
		type CwDrawerItem
	} from '@cropwatchdevelopment/cwui';

	interface AlertRow {
		id: string;
		icon: string;
		name: string;
		reported: string;
	}

	const app = getAppContext();

	let totalDevices = $derived(
		(app.deviceStatuses?.online ?? 0) + (app.deviceStatuses?.offline ?? 0)
	);
	let offlineDevices = $derived(app.deviceStatuses?.offline ?? 0);
	let onlineDevices = $derived(Math.max(0, totalDevices - offlineDevices));
	let alertCount = $derived(app.triggeredRulesCount || 0);
	let barItems = $derived<CwDrawerItem[]>([
		{
			id: 'online',
			label: m.overview_online_count({ count: String(onlineDevices) }),
			tone: 'success'
		},
		{
			id: 'offline',
			label: m.overview_offline_count({ count: String(offlineDevices) }),
			tone: 'danger'
		},
		{ id: 'alerts', label: m.overview_alert_count({ count: String(alertCount) }), tone: 'warning' }
	]);
	let statusSegments = $derived<CwDonutSegment[]>([
		{ label: m.status_online(), value: onlineDevices, color: appChartPalette.success },
		{ label: m.status_offline(), value: offlineDevices, color: appChartPalette.danger },
		{ label: m.status_alerts(), value: alertCount, color: appChartPalette.warning }
	]);
	const triggeredRules = Array.isArray(app?.triggeredRules) ? app.triggeredRules : [];
	const alerts: AlertRow[] = triggeredRules.map((rule) => ({
		id: String(rule.id),
		icon: '🔔',
		name: rule.name,
		reported: rule.last_triggered ? formatDateTime(rule.last_triggered) : m.common_not_available()
	}));
</script>

<CwDrawer
	bind:open={app.drawerOpen}
	label={m.status_alerts()}
	items={barItems}
	height="min(22rem, 46vh)"
	class="app-overview-drawer"
>
	<div class="app-overview-drawer__grid">
		<div class="app-overview-drawer__card">
			<CwCard
				title={m.overview_status_mix()}
				subtitle={m.overview_total({
					count: String(statusSegments.reduce((s, x) => s + x.value, 0))
				})}
			>
				<div class="status-card">
					<div class="status-card__body">
						<div class="status-card__chart">
							<CwDonutChart segments={statusSegments} size={120} thickness={14} />
						</div>
					</div>
				</div>
			</CwCard>
		</div>

		<div class="app-overview-drawer__card">
			<CwCard title={m.overview_active_alert_list()} subtitle={m.overview_reported_time()}>
				<div class="alerts-card">
					{#if alerts.length === 0}
						<AppNotice tone="neutral">
							<p>{m.common_not_available()}</p>
						</AppNotice>
					{:else}
						<div class="alerts-card__list">
							{#each alerts as alert (alert.id)}
								<div class="alerts-card__row">
									<span class="alerts-card__icon">🔔</span>
									<span class="alerts-card__name">{alert.name}</span>
									<span class="alerts-card__time">{alert.reported}</span>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			</CwCard>
		</div>
	</div>
</CwDrawer>

<style>
	.app-overview-drawer__grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: var(--cw-space-4);
		width: 100%;
		height: 100%;
	}

	.app-overview-drawer__card {
		height: 100%;
	}

	.status-card {
		height: 100%;
	}

	.status-card__body {
		height: 100%;
		min-height: 12rem;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--cw-space-4);
	}

	.alerts-card {
		height: 100%;
		overflow: auto;
		padding: var(--cw-space-4);
	}

	.alerts-card__list {
		display: flex;
		flex-direction: column;
	}

	.alerts-card__row {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto;
		align-items: start;
		gap: var(--cw-space-2);
		padding: var(--cw-space-3) 0;
		border-top: 1px solid var(--cw-border-muted);
	}

	.alerts-card__row:first-child {
		padding-top: 0;
		border-top: none;
	}

	.alerts-card__icon {
		line-height: 1.2;
	}

	.alerts-card__name,
	.alerts-card__time {
		min-width: 0;
		font-size: var(--cw-text-sm);
	}

	.alerts-card__time {
		color: var(--cw-text-secondary);
		text-align: right;
	}

	@media (max-width: 767px) {
		.app-overview-drawer__grid {
			grid-template-columns: 1fr;
		}

		.alerts-card__row {
			grid-template-columns: auto minmax(0, 1fr);
		}

		.alerts-card__time {
			grid-column: 2;
			text-align: left;
		}
	}
</style>
