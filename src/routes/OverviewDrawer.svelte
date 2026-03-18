<script lang="ts">
	import { getAppContext } from '$lib/appContext.svelte';
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

	let totalDevices = $derived((app.deviceStatuses?.online ?? 0) + (app.deviceStatuses?.offline ?? 0));
	let offlineDevices = $derived(app.deviceStatuses?.offline ?? 0);
	let onlineDevices = $derived(Math.max(0, totalDevices - offlineDevices));
	let alertCount = $derived(app.triggeredRulesCount || 0);

	let drawerOpen: boolean = $state(app.drawerOpen ?? false);
	let barItems = $derived<CwDrawerItem[]>([
		{ id: 'online', label: `Online ${onlineDevices}`, tone: 'success' },
		{ id: 'offline', label: `Offline ${offlineDevices}`, tone: 'danger' },
		{ id: 'alerts', label: `Alerts ${alertCount}`, tone: 'warning' }
	]);
	let statusSegments = $derived<CwDonutSegment[]>([
		{ label: 'Online', value: onlineDevices, color: 'var(--cw-success-500)' },
		{ label: 'Offline', value: offlineDevices, color: 'var(--cw-danger-500)' },
		{ label: 'Alerts', value: alertCount, color: 'var(--cw-warning-500)' }
	]);

	const topGroups = [
		{ name: 'Ungrouped', count: 91 },
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
		reported: rule.last_triggered ? new Date(rule.last_triggered).toLocaleString() : 'N/A'
	}));
</script>

<CwDrawer bind:open={app.drawerOpen} label="Alerts" items={barItems} height="18rem">
	<div class="flex w-full flex-row gap-6">
		<!-- Status Mix card -->
		<CwCard class="w-full">
			<div class="status-card">
				<div class="status-card__header">
					<span class="status-card__title">Status mix</span>
					<span class="status-card__total"
						>Total {statusSegments.reduce((s, x) => s + x.value, 0)}</span
					>
				</div>
				<div class="status-card__body">
					<div class="status-card__chart">
						<CwDonutChart segments={statusSegments} size={120} thickness={14} />
					</div>
					<div class="status-card__legend">
						<!-- {#each statusSegments as seg}
							<div class="legend-row">
								<CwChip
									label="{seg.label}  {seg.value}"
									tone={seg.label === 'Online'
										? 'success'
										: seg.label === 'Offline'
											? 'danger'
											: 'warning'}
									size="sm"
									variant="soft"
								/>
							</div>
						{/each} -->
					</div>
				</div>
			</div>
		</CwCard>

		<!-- Top Groups card -->
		<CwCard class="w-full">
			<div class="groups-card">
				<div class="groups-card__header">
					<span class="groups-card__title">Top groups</span>
					<span class="groups-card__subtitle">In view</span>
				</div>
				{#each topGroups as group (group.name)}
					<div class="groups-card__row">
						<span class="groups-card__name">{group.name}</span>
						<span class="groups-card__count">{group.count}</span>
					</div>
					<div class="groups-card__bar-track">
						<div
							class="groups-card__bar-fill"
							style:width="{(group.count / maxGroupCount) * 100}%"
						></div>
					</div>
				{/each}
			</div>
		</CwCard>

		<!-- Active Alert List card -->
		<CwCard class="w-full">
			<div class="alerts-card">
				<div class="alerts-card__header">
					<span class="alerts-card__title">Active Alert List</span>
					<span class="alerts-card__subtitle">Reported Time</span>
				</div>
				<div class="alerts-card__list" style="overflow-y: scroll;">
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
