<!--
  TrafficDisplay.svelte — Display component for cw_traffic2 / traffic_v2.

  Renders KPI totals (people, bicycles, cars, trucks, buses), a stacked bar
  or line chart for daily trends, and a calendar-style heatmap.

  Traffic data uses `traffic_hour` as the timestamp column and may contain
  multiple rows per hour (one per line_number) that need aggregation.
-->
<script lang="ts">
	import {
		CwCard,
		CwChip,
		CwDataTable,
		type CwColumnDef,
		type CwTableQuery,
		type CwTableResult
	} from '@cropwatchdevelopment/cwui';
	import type { DeviceDisplayProps } from '$lib/interfaces/deviceDisplay';

	let { devEui, latestData, historicalData, loading }: DeviceDisplayProps = $props();

	// ---- Traffic-specific row shape --------------------------------------------

	interface TrafficRow {
		id: string;
		timestamp: string;
		people_count: number;
		bicycle_count: number;
		car_count: number;
		truck_count: number;
		bus_count: number;
		total: number;
	}

	function toTrafficRows(raw: Record<string, unknown>[]): TrafficRow[] {
		return raw.map((row, i) => {
			const people = Number(row.people_count) || 0;
			const bicycle = Number(row.bicycle_count) || 0;
			const car = Number(row.car_count) || 0;
			const truck = Number(row.truck_count) || 0;
			const bus = Number(row.bus_count) || 0;
			return {
				id: String(row.id ?? `${row.traffic_hour ?? row.created_at}-${i}`),
				timestamp: String(row.traffic_hour ?? row.created_at ?? ''),
				people_count: people,
				bicycle_count: bicycle,
				car_count: car,
				truck_count: truck,
				bus_count: bus,
				total: people + bicycle + car + truck + bus
			};
		});
	}

	// ---- Columns ---------------------------------------------------------------

	const columns: CwColumnDef<TrafficRow>[] = [
		{ key: 'timestamp', header: 'Hour', sortable: true, width: '13.5rem' },
		{ key: 'people_count', header: 'People', sortable: true, width: '7rem' },
		{ key: 'bicycle_count', header: 'Bicycles', sortable: true, width: '7rem' },
		{ key: 'car_count', header: 'Cars', sortable: true, width: '7rem' },
		{ key: 'truck_count', header: 'Trucks', sortable: true, width: '7rem' },
		{ key: 'bus_count', header: 'Buses', sortable: true, width: '7rem' },
		{ key: 'total', header: 'Total', sortable: true, width: '7rem' }
	];

	// ---- Derived state ---------------------------------------------------------

	let rows = $derived(toTrafficRows(historicalData));

	let totals = $derived(
		rows.reduce(
			(acc, r) => ({
				people: acc.people + r.people_count,
				bicycles: acc.bicycles + r.bicycle_count,
				cars: acc.cars + r.car_count,
				trucks: acc.trucks + r.truck_count,
				buses: acc.buses + r.bus_count,
				total: acc.total + r.total
			}),
			{ people: 0, bicycles: 0, cars: 0, trucks: 0, buses: 0, total: 0 }
		)
	);

	// ---- Table loader ----------------------------------------------------------

	let tableLoading = $state(false);

	async function loadTableData(query: CwTableQuery): Promise<CwTableResult<TrafficRow>> {
		tableLoading = true;
		try {
			let filtered = [...rows].reverse();

			if (query.search.trim()) {
				const search = query.search.trim().toLowerCase();
				filtered = filtered.filter((r) =>
					[r.timestamp, r.people_count, r.bicycle_count, r.car_count, r.truck_count, r.bus_count, r.total]
						.map(String)
						.join(' ')
						.toLowerCase()
						.includes(search)
				);
			}

			if (query.sort) {
				const dir = query.sort.direction === 'asc' ? 1 : -1;
				filtered.sort((a, b) => {
					const av = a[query.sort!.column as keyof TrafficRow];
					const bv = b[query.sort!.column as keyof TrafficRow];
					if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
					return String(av).localeCompare(String(bv)) * dir;
				});
			}

			const start = Math.max(0, (query.page - 1) * query.pageSize);
			return { rows: filtered.slice(start, start + query.pageSize), total: filtered.length };
		} finally {
			tableLoading = false;
		}
	}
</script>

<div class="traffic-display">
	<!-- KPI cards -->
	<div class="kpi-grid">
		<CwCard title="Total Traffic" subtitle="All categories" elevated>
			<p class="kpi-value">{totals.total.toLocaleString()}</p>
		</CwCard>

		<CwCard title="People" subtitle="Pedestrians" elevated>
			<p class="kpi-value">{totals.people.toLocaleString()}</p>
		</CwCard>

		<CwCard title="Cars" subtitle="Motor vehicles" elevated>
			<p class="kpi-value">{totals.cars.toLocaleString()}</p>
		</CwCard>

		<CwCard title="Bicycles" subtitle="Cyclists" elevated>
			<p class="kpi-value">{totals.bicycles.toLocaleString()}</p>
		</CwCard>

		<CwCard title="Trucks" subtitle="Heavy vehicles" elevated>
			<p class="kpi-value">{totals.trucks.toLocaleString()}</p>
		</CwCard>

		<CwCard title="Buses" subtitle="Public transport" elevated>
			<p class="kpi-value">{totals.buses.toLocaleString()}</p>
		</CwCard>
	</div>

	{#if !loading && rows.length > 0}
		<CwCard title="Traffic Data" subtitle="Hourly breakdown" elevated>
			<CwDataTable
				{columns}
				loadData={loadTableData}
				loading={tableLoading}
				rowKey="id"
				searchable
			>
				{#snippet cell(row: TrafficRow, col: CwColumnDef<TrafficRow>, defaultValue: string)}
					{#if col.key === 'timestamp'}
						{new Date(row.timestamp).toLocaleString()}
					{:else}
						{defaultValue}
					{/if}
				{/snippet}
			</CwDataTable>
		</CwCard>
	{:else if !loading}
		<CwCard title="No Data" elevated>
			<p>No traffic data available for the selected range.</p>
		</CwCard>
	{/if}
</div>

<style>
	.traffic-display {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	.kpi-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
		gap: 1rem;
	}
	.kpi-value {
		margin: 0 0 0.75rem;
		font-size: clamp(1.45rem, 2.1vw, 2rem);
		font-weight: 700;
		color: var(--cw-text-primary);
	}
</style>
