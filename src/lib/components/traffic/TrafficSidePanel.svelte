<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import TrafficHourlyChart from './TrafficHourlyChart.svelte';
	import type { TrafficClass, TrafficClassKey, TrafficHourBin, TrafficTotals } from './traffic.types';

	let {
		selectedDate = null,
		selectedLineLabel = 'All lines',
		totals = null,
		bins = [],
		classes = [],
		hiddenSeries = []
	}: {
		selectedDate?: string | null;
		selectedLineLabel?: string;
		totals?: TrafficTotals | null;
		bins?: TrafficHourBin[];
		classes?: TrafficClass[];
		hiddenSeries?: TrafficClassKey[];
	} = $props();

	const dispatch = createEventDispatcher<{ toggle: { key: TrafficClassKey } }>();

	const formatter = new Intl.NumberFormat();

	function handleToggle(event: CustomEvent<{ key: TrafficClassKey }>) {
		dispatch('toggle', event.detail);
	}
</script>

<aside class="traffic-side">
	<div class="traffic-side-inner">
		<div class="traffic-card">
			<h3>Day details</h3>
			{#if !selectedDate}
				<div class="traffic-muted">Select a day in the calendar.</div>
			{:else}
				<div class="traffic-muted">{selectedDate}</div>
			{/if}
			<div class="traffic-gap"></div>
			<div class="traffic-grid2">
				{#if totals}
					{#each classes as klass (klass.key)}
						<div class="traffic-stat">
							<span class="k">{klass.label}</span>
							<span class="v">{formatter.format(totals[klass.key] ?? 0)}</span>
						</div>
					{/each}
				{:else}
					<div class="traffic-muted">No totals yet.</div>
				{/if}
			</div>
		</div>

		<div class="traffic-card">
			<h3>Hourly (0–23)</h3>
			<div class="traffic-muted">{selectedLineLabel}</div>
			<div class="traffic-gap"></div>
			<div class="traffic-scroll">
				<table>
					<thead>
						<tr>
							<th>Hr</th>
							{#each classes as klass (klass.key)}
								<th>{klass.short}</th>
							{/each}
						</tr>
					</thead>
					<tbody>
						{#if bins.length === 0}
							<tr>
								<td colspan={classes.length + 1}>No hourly data</td>
							</tr>
						{:else}
							{#each bins as bin (bin.hour)}
								<tr>
									<td>{String(bin.hour).padStart(2, '0')}</td>
									{#each classes as klass (klass.key)}
										<td>{bin.totals?.[klass.key] ?? 0}</td>
									{/each}
								</tr>
							{/each}
						{/if}
					</tbody>
				</table>
			</div>

			<TrafficHourlyChart
				{bins}
				{classes}
				{hiddenSeries}
				on:toggle={handleToggle}
			/>
		</div>
	</div>
</aside>

<style>
	.traffic-side {
		border-left: 1px solid var(--traffic-line);
		background: rgba(16, 28, 56, 0.62);
		backdrop-filter: blur(10px);
		min-height: 0;
		display: flex;
		flex-direction: column;
	}

	.traffic-side-inner {
		padding: 14px 14px 10px;
		display: flex;
		flex-direction: column;
		gap: 10px;
		min-height: 0;
	}

	.traffic-card {
		background: rgba(22, 36, 74, 0.86);
		border: 1px solid var(--traffic-line);
		border-radius: 16px;
		padding: 12px;
		box-shadow: var(--traffic-shadow);
	}

	.traffic-card h3 {
		margin: 0 0 8px;
		font-size: 13px;
		font-weight: 900;
	}

	.traffic-grid2 {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 8px;
	}

	.traffic-stat {
		background: rgba(11, 18, 32, 0.62);
		border: 1px solid rgba(255, 255, 255, 0.14);
		border-radius: 12px;
		padding: 8px 10px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		font-size: 12px;
	}

	.traffic-stat .k {
		color: rgba(242, 246, 255, 0.78);
	}

	.traffic-stat .v {
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono',
			'Courier New', monospace;
		font-weight: 900;
	}

	.traffic-scroll {
		overflow: auto;
		max-height: 340px;
		border-radius: 12px;
		border: 1px solid rgba(255, 255, 255, 0.12);
		background: rgba(11, 18, 32, 0.4);
	}

	table {
		width: 100%;
		border-collapse: separate;
		border-spacing: 0;
		font-size: 11px;
		overflow: hidden;
		border-radius: 12px;
		border: none;
		background: transparent;
	}

	thead th {
		position: sticky;
		top: 0;
		background: rgba(11, 18, 32, 0.92);
		color: rgba(242, 246, 255, 0.86);
		text-align: right;
		padding: 8px 8px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.12);
		font-weight: 900;
	}

	thead th:first-child {
		text-align: left;
	}

	tbody td {
		padding: 6px 8px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
		text-align: right;
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono',
			'Courier New', monospace;
		color: rgba(242, 246, 255, 0.92);
	}

	tbody td:first-child {
		text-align: left;
		color: rgba(242, 246, 255, 0.72);
		font-family: inherit;
	}

	tbody tr:hover {
		background: rgba(125, 184, 255, 0.12);
	}

	.traffic-muted {
		color: rgba(242, 246, 255, 0.72);
		font-size: 12px;
	}

	.traffic-gap {
		height: 10px;
	}

	@media (max-width: 980px) {
		.traffic-side {
			border-left: none;
			border-top: 1px solid var(--traffic-line);
		}

		.traffic-scroll {
			max-height: 260px;
		}
	}
</style>
