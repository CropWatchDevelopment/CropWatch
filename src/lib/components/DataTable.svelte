<script lang="ts">
	import { _ } from 'svelte-i18n';
	type DataRecord = Record<string, unknown> & { created_at?: string };

	let { historicalData } = $props<{ historicalData: DataRecord[] }>();

	let dataArray = $derived(historicalData);

	// Filter data for current day
	function getCurrentDayData(dataArray: DataRecord[]): DataRecord[] {
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		return dataArray.filter((item) => {
			const createdAt = item.created_at;
			if (typeof createdAt !== 'string') {
				return false;
			}
			const itemDate = new Date(createdAt);
			if (Number.isNaN(itemDate.getTime())) {
				return false;
			}
			itemDate.setHours(0, 0, 0, 0);
			return itemDate.getTime() === today.getTime();
		});
	}

	// Get visible columns
	function getVisibleColumns(dataArray: DataRecord[]): string[] {
		const excludedColumns = ['is_simulated', 'dev_eui', 'smoke_detected', 'id', 'vape_detected'];
		const allKeys =
			dataArray.length > 0 ? Object.keys(dataArray[0] as Record<string, unknown>) : [];

		return allKeys.filter((key) => {
			if (excludedColumns.includes(key)) return false;
			const hasNonNullValue = dataArray.some((item) => item[key] !== null);
			return hasNonNullValue;
		});
	}

	// Format column names
	function formatColumnName(key: string): string {
		return key
			.split('_')
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(' ');
	}

	// Format cell value
	function formatCellValue(key: string, value: unknown): string {
		if (key === 'created_at') {
			if (typeof value === 'string') {
				const date = new Date(value);
				return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
			}
			return '—';
		}
		if (typeof value === 'boolean') {
			return value ? 'Yes' : 'No';
		}
		if (typeof value === 'number') {
			return Number.isFinite(value) ? value.toFixed(2) : '—';
		}
		return value == null ? '—' : String(value);
	}

	let filteredData = $derived(getCurrentDayData(dataArray));
	let visibleColumns = $derived(getVisibleColumns(filteredData));
</script>

<div class="w-full text-[var(--color-text)]">
	<div class="w-full p-4">
		<div class="surface-card overflow-hidden">
			<!-- Header -->
			<div class="border-b border-[var(--color-border-subtle)] px-6 py-4">
				<h1 class="text-xl leading-tight font-semibold">{$_('Sensor Data - Today')}</h1>
			</div>

			<!-- Table wrapper -->
			<div class="overflow-x-auto">
				{#if filteredData.length === 0}
					<div class="p-12 text-center text-[var(--color-text-muted)]">
						<p class="text-base">{$_('No data available for today')}</p>
					</div>
				{:else}
					<table class="w-full text-lg">
						<thead
							class="border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-emphasis)]"
						>
							<tr>
								{#each visibleColumns as column}
									<th
										class="px-6 py-3 text-center text-4xl font-semibold tracking-wide text-[var(--color-text-muted)] uppercase"
									>
										{#if column === 'temperature_c'}
											🌡️
										{:else if column === 'humidity'}
											💧
										{/if}
										{$_(column)}
									</th>
								{/each}
							</tr>
						</thead>

						<tbody class="divide-y divide-[var(--color-border-subtle)] text-2xl">
							{#each filteredData as row, rowIndex}
								<tr
									class="transition-colors duration-150 odd:bg-[var(--color-surface-emphasis)] hover:bg-orange-50/30"
								>
									{#each visibleColumns as column}
										<td class="px-2 py-3 text-center whitespace-nowrap text-[var(--color-text)]">
											{formatCellValue(column, row[column])}
										</td>
									{/each}
								</tr>
							{/each}
						</tbody>
					</table>
				{/if}
			</div>
		</div>
	</div>
</div>
