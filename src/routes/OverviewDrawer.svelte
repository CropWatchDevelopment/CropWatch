<script lang="ts">
	import { getAppContext } from '$lib/appContext.svelte';
	import { formatDateTime } from '$lib/i18n/format';
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

	let drawerOpen: boolean = $state(app.drawerOpen ?? false);
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
		{ label: m.status_online(), value: onlineDevices, color: 'var(--cw-success-500)' },
		{ label: m.status_offline(), value: offlineDevices, color: 'var(--cw-danger-500)' },
		{ label: m.status_alerts(), value: alertCount, color: 'var(--cw-warning-500)' }
	]);

	const topGroups = [
		{ name: m.overview_ungrouped(), count: 91 },
		{ name: 'TK-Ebisu', count: 49 },
		{ name: 'Seagaia', count: 41 },
		{ name: 'SA', count: 11 }
	];
	const maxGroupCount = Math.max(...topGroups.map((g) => g.count));
	const triggeredRules = Array.isArray(app?.triggeredRules) ? app.triggeredRules : [];
	const alerts: AlertRow[] = triggeredRules.map((rule) => ({
		id: String(rule.id),
		icon: '🔔',
		name: rule.name,
		reported: rule.last_triggered ? formatDateTime(rule.last_triggered) : m.common_not_available()
	}));
</script>

<CwDrawer bind:open={app.drawerOpen} label={m.status_alerts()} items={barItems}>
	<div class="flex w-full flex-row gap-6">
		<!-- Status Mix card -->
		<CwCard
			title={m.overview_status_mix()}
			subtitle={m.overview_total({
				count: String(statusSegments.reduce((s, x) => s + x.value, 0))
			})}
			class="w-full"
		>
			<div class="status-card">
				<div class="status-card__body">
					<div class="status-card__chart">
						<CwDonutChart segments={statusSegments} size={120} thickness={14} />
					</div>
				</div>
			</div>
		</CwCard>

		<!-- Active Alert List card -->
		<CwCard title={m.overview_active_alert_list()} subtitle={m.overview_reported_time()} class="w-full">
			<div class="alerts-card overflow-y-scroll">
				<div class="alerts-card__list">
					{#each alerts as alert (alert.id)}
						<div class="alerts-card__row">
							<span class="alerts-card__icon">🔔</span>
							<span class="alerts-card__name">{alert.name}</span>
							<span class="alerts-card__time">{alert.reported}</span>
						</div>
					{/each}
				</div>
			</div>
		</CwCard>
	</div>
</CwDrawer>
