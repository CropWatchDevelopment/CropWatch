<script>
	let { historicalData } = $props();

	let dataArray = $derived(historicalData); // Assume data is an array of objects

	// Filter data for current day
	function getCurrentDayData(dataArray) {
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		return dataArray.filter((item) => {
			const itemDate = new Date(item.created_at);
			itemDate.setHours(0, 0, 0, 0);
			return itemDate.getTime() === today.getTime();
		});
	}

	// Get visible columns
	function getVisibleColumns(dataArray) {
		const excludedColumns = ['is_simulated', 'dev_eui', 'smoke_detected', 'id', 'vape_detected'];
		const allKeys = dataArray.length > 0 ? Object.keys(dataArray[0]) : [];

		return allKeys.filter((key) => {
			if (excludedColumns.includes(key)) return false;
			const hasNonNullValue = dataArray.some((item) => item[key] !== null);
			return hasNonNullValue;
		});
	}

	// Format column names
	function formatColumnName(key) {
		return key
			.split('_')
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(' ');
	}

	// Format cell value
	function formatCellValue(key, value) {
		if (key === 'created_at') {
			return new Date(value).toLocaleString();
		}
		if (typeof value === 'boolean') {
			return value ? 'Yes' : 'No';
		}
		if (typeof value === 'number') {
			return value.toFixed(2);
		}
		return value;
	}

	let filteredData = $derived(getCurrentDayData(dataArray));
	let visibleColumns = $derived(getVisibleColumns(filteredData));
</script>

<div class="min-h-screen p-8">
	<div class="mx-auto max-w-7xl">
		<div class="overflow-hidden rounded-lg bg-white shadow-lg">
			<div class="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
				<h1 class="text-2xl font-bold text-white">Sensor Data - Today</h1>
				<p class="mt-1 text-sm text-blue-100">
					{filteredData.length} reading{filteredData.length !== 1 ? 's' : ''} recorded
				</p>
			</div>

			<div class="overflow-x-auto">
				{#if filteredData.length === 0}
					<div class="p-12 text-center text-gray-500">
						<p class="text-lg">No data available for today</p>
					</div>
				{:else}
					<table class="w-full">
						<thead class="border-b border-gray-200 bg-gray-50">
							<tr>
								{#each visibleColumns as column}
									<th
										class="px-6 py-3 text-left text-xs font-semibold tracking-wider text-gray-700 uppercase"
									>
										{formatColumnName(column)}
									</th>
								{/each}
							</tr>
						</thead>
						<tbody class="divide-y divide-gray-200">
							{#each filteredData as row, rowIndex}
								<tr class="transition-colors duration-150 hover:bg-gray-50">
									{#each visibleColumns as column}
										<td class="px-6 py-4 text-sm whitespace-nowrap text-gray-900">
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
