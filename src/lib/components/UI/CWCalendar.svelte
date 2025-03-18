<script lang="ts">
	import moment from 'moment';
	let { data } = $props();
	let monthGroups = $state([]);
	let months = $state({});
	let getDaysInMonth = (year: number, month: number) => {
		return new Date(year, month + 1, 0).getDate();
	};

	// Aggregate daily totals from raw data using the created_at field.
	let daily_totals = $derived(
		data.reduce((acc, entry) => {
			// Format the created_at date as "YYYY-MM-DD"
			const date = moment(entry.created_at).format('YYYY-MM-DD');
			const existing = acc.find((d) => d.date === date);
			if (existing) {
				existing.people_count += entry.people_count;
				existing.car_count += entry.car_count;
				existing.bicycle_count += entry.bicycle_count;
			} else {
				acc.push({
					date,
					people_count: entry.people_count,
					car_count: entry.car_count,
					bicycle_count: entry.bicycle_count
				});
			}
			return acc;
		}, [])
	);

	daily_totals.forEach((day) => {
		const m = moment(day.date, 'YYYY-MM-DD');
		const key = m.format('YYYY-MM');
		if (!months[key]) {
			months[key] = {
				year: m.year(),
				month: m.month(), // month index (0 = January, 11 = December)
				days: []
			};
		}
		months[key].days.push(day);
	});

	// Convert the months object to a sorted array.
	monthGroups = Object.values(months).sort((a, b) => {
		return a.year * 12 + a.month - (b.year * 12 + b.month);
	});
	// For each month, build an array representing the calendar cells.
	monthGroups = monthGroups.map((group) => {
		const { year, month, days } = group;
		const daysInMonth = getDaysInMonth(year, month);
		const firstDayOfWeek = new Date(year, month, 1).getDay();
		let calendarDays: (null | { day: number; isoDate: string; dayData: any })[] = [];

		// Add empty cells before the first day of the month.
		for (let i = 0; i < firstDayOfWeek; i++) {
			calendarDays.push(null);
		}

		// Create a cell for each day of the month.
		for (let day = 1; day <= daysInMonth; day++) {
			const dateObj = new Date(year, month, day);
			const isoDate = dateObj.toISOString().split('T')[0];
			// Find aggregated data for the current day if it exists.
			const dayData = days.find((item) => item.date === isoDate);
			calendarDays.push({ day, isoDate, dayData });
		}

		return {
			...group,
			calendarDays,
			daysInMonth,
			firstDayOfWeek
		};
	});
	
	// Function to get color intensity based on count value
	function getColorIntensity(count, maxValue = 10) {
		if (!count) return 'bg-gray-50';
		const intensity = Math.min(Math.floor((count / maxValue) * 100), 100);
		
		if (intensity < 20) return 'bg-blue-50';
		if (intensity < 40) return 'bg-blue-100';
		if (intensity < 60) return 'bg-blue-200';
		if (intensity < 80) return 'bg-blue-300';
		return 'bg-blue-400';
	}
	
	// Get current date to highlight today
	const today = moment().format('YYYY-MM-DD');
</script>

<div class="calendar-container w-full">
	{#each monthGroups as group}
		<div class="mb-8 w-full bg-white rounded-lg shadow-md overflow-hidden">
			<!-- Month Header -->
			<div class="bg-gradient-to-r from-blue-600 to-blue-500 text-white py-4 px-6 mb-2">
				<h2 class="text-2xl font-bold">
					{new Date(group.year, group.month).toLocaleString('default', { month: 'long' })}
					{group.year}
				</h2>
			</div>

			<!-- Calendar Grid for the month -->
			<div class="px-4 pb-4">
				<div class="grid grid-cols-7 gap-1">
					<!-- Weekday Headers -->
					<div class="text-center font-medium text-gray-600 py-2">Sun</div>
					<div class="text-center font-medium text-gray-600 py-2">Mon</div>
					<div class="text-center font-medium text-gray-600 py-2">Tue</div>
					<div class="text-center font-medium text-gray-600 py-2">Wed</div>
					<div class="text-center font-medium text-gray-600 py-2">Thu</div>
					<div class="text-center font-medium text-gray-600 py-2">Fri</div>
					<div class="text-center font-medium text-gray-600 py-2">Sat</div>

					{#each group.calendarDays as cell}
						{#if cell === null}
							<!-- Empty cell -->
							<div class="h-32 bg-gray-200 rounded p-2"></div>
						{:else}
							<!-- Day cell with its number and, if available, the counts -->
							{#if cell.dayData}
								<div class="relative h-32 rounded py-2 px-5 transition-all bg-slate-300"
									class:ring-2={cell.isoDate === today}
									class:ring-blue-500={cell.isoDate === today}
									class:shadow-sm={cell.isoDate === today}
									class:bg-white={cell.isoDate === today}
									class:font-medium={cell.isoDate === today}
									>
									<div class="flex justify-between">
										<div class="text-sm font-bold text-gray-700">{cell.day}</div>
										<div class="text-xs font-semibold bg-blue-500 text-white rounded-full h-5 w-5 flex items-center justify-center">
											<!-- WEATHER ICON HERE!!! -->
										</div>
									</div>
									<div class="mt-2 space-y-1">
										<div class="flex items-center text-xs text-gray-700">
											<span class="w-3 h-3 rounded-full bg-green-500 mr-1"></span>
											<span class="font-medium">{cell.dayData.people_count}</span> People
										</div>
										<div class="flex items-center text-xs text-gray-700">
											<span class="w-3 h-3 rounded-full bg-red-500 mr-1"></span>
											<span class="font-medium">{cell.dayData.car_count}</span> Cars
										</div>
										<div class="flex items-center text-xs text-gray-700">
											<span class="w-3 h-3 rounded-full bg-yellow-500 mr-1"></span>
											<span class="font-medium">{cell.dayData.bicycle_count}</span> Bikes
										</div>
									</div>
								</div>
							{:else}
								<div class="relative h-32 bg-gray-50 rounded p-2">
									<div class="text-sm font-medium text-gray-400">{cell.day}</div>
								</div>
							{/if}
						{/if}
					{/each}
				</div>
			</div>
		</div>
	{/each}
	
	
</div>