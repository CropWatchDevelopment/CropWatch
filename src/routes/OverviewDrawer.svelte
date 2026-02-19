<script lang="ts">
	import {
		CwCard,
		CwChip,
		CwDonutChart,
		CwDrawer,
		type CwDonutSegment
	} from '@cropwatchdevelopment/cwui';

	let drawerOpen: boolean = $state(false);
	const barItems: CwDrawerItem[] = [
		{ id: 'online', label: 'Online 169', tone: 'success' },
		{ id: 'offline', label: 'Offline 27', tone: 'danger' },
		{ id: 'alerts', label: 'Alerts 10', tone: 'warning' },
		{ id: 'loading', label: 'Loading 0', tone: 'secondary' }
	];
	const statusSegments: CwDonutSegment[] = [
		{ label: 'Online', value: 169, color: 'var(--cw-success-500)' },
		{ label: 'Offline', value: 27, color: 'var(--cw-danger-500)' },
		{ label: 'Alerts', value: 10, color: 'var(--cw-warning-500)' }
	];

	const topGroups = [
		{ name: 'Ungrouped', count: 91 },
		{ name: 'TK-Ebisu', count: 49 },
		{ name: 'Seagaia', count: 41 },
		{ name: 'SA', count: 11 }
	];
	const maxGroupCount = Math.max(...topGroups.map((g) => g.count));
	const alerts: AlertRow[] = [
		{ id: 'a1', icon: '🔔', name: 'Test for development!', reported: '9/17/2024, 5:09:49 PM' },
		{ id: 'a2', icon: '🔔', name: 'test', reported: '9/21/2025, 10:58:16 PM' },
		{ id: 'a3', icon: '🔔', name: 'test', reported: '9/28/2025, 9:00:49 PM' },
		{ id: 'a4', icon: '🔔', name: '冷蔵', reported: '10/16/2025, 11:42:40 PM' },
		{ id: 'a5', icon: '🔔', name: '冷蔵', reported: '10/16/2025, 11:46:16 PM' },
		{ id: 'a6', icon: '🔔', name: 'TEST RULE', reported: '1/28/2026, 5:32:35 PM' }
	];
</script>

<CwDrawer bind:open={drawerOpen} label="Alerts" items={barItems} height="18rem">
	<div class="flex flex-row w-full gap-6 p-4">
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
				{#each topGroups as group}
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
