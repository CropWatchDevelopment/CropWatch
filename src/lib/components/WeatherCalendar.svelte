<script lang="ts">
	import { Calendar, DayGrid } from '@event-calendar/core';
	import '@event-calendar/core/index.css'; // include default styles
	import { fetchHistoricalWeather } from '$lib/utilities/monthWeatherHistory';
	import moment from 'moment';

	const { events = [], onDateChange = () => {} } = $props();

	// 1. Declare weather state and current date with proper types
	let weather: any[] = $state([]);
	let currentDate = $state(new Date()); // Track the currently displayed month
	let loading = $state(false);
	let calendarRef: any = $state(null); // Reference to the calendar component

	// Function to load weather data for a given date
	async function loadWeatherForMonth(date: Date) {
		loading = true;
		try {
			const startDate = moment(date).startOf('month').toDate();
			let endDate = moment(date).endOf('month').toDate();
			if (endDate > new Date()) {
				endDate = new Date(); // Adjust to yesterday if future date
			}

			const data = await fetchHistoricalWeather(startDate, endDate);

			const mappedEvents = data.map((entry) => ({
				id: entry.date,
				start: entry.date, // EventCalendar accepts ISO8601 strings
				end: entry.date,
				allDay: true, // Weather events are all-day events
				title:
					entry.weather.maxtemp_c !== null && entry.weather.mintemp_c !== null
						? `${entry.weather.maxtemp_c}°/${entry.weather.mintemp_c}°C ${entry.weather.totalprecip_mm}mm`
						: `No data - ${entry.weather.totalprecip_mm}mm`,
				display: 'auto',
				extendedProps: {
					icon: entry.weather.condition.icon,
					description: entry.weather.condition.text,
					maxTemp: entry.weather.maxtemp_c,
					minTemp: entry.weather.mintemp_c,
					precipitation: entry.weather.totalprecip_mm
				}
			}));
			mappedEvents.push(...events);
			weather = mappedEvents;
			console.log('Mapped weather events:', weather);
		} catch (err) {
			console.error('Weather fetch failed:', err);
			weather = [];
		} finally {
			loading = false;
		}
	}

	// Load initial data using $effect
	$effect(() => {
		if (currentDate) {
			loadWeatherForMonth(currentDate);
		}
	});

	// 4. Event content rendering function
	function eventContentRenderer(info: any) {
		const { event } = info;
		const icon = event.extendedProps.icon;
		const maxTemp = event.extendedProps.maxTemp;
		const minTemp = event.extendedProps.minTemp;
		const precipitation = event.extendedProps.precipitation;

		if (icon) {
			const tempDisplay =
				maxTemp !== null && minTemp !== null ? `${maxTemp}/<wbr>${minTemp}℃` : 'No temp data';

			return {
				html: `
					<div class="weather-data">
						<div class="icon">${icon}</div>
						<div>
							${tempDisplay}<br>
							${precipitation}mm
						</div>
					</div>
				`
			};
		}
		return undefined; // Use default rendering
	}

	// Function to navigate to today
	function goToToday() {
		// Use the calendar API to navigate to today
		if (calendarRef) {
			calendarRef.getApi().today();
			// The datesSet event will trigger loadWeatherForMonth
		}
	}

	// 3. Derive calendar options reactively - this will update when weather changes
	const options = $derived({
		view: 'dayGridMonth',
		date: currentDate, // Use tracked current date
		events: weather.filter((event) => event && event.start), // Filter out invalid events
		eventContent: eventContentRenderer,
		dayMaxEvents: true, // Allow +more link when too many events
		height: '700px',
		headerToolbar: {
			start: 'prev,next today',
			center: 'title',
			end: 'dayGridMonth'
		},
		initialView: 'dayGridMonth',
		// Handle date changes (month navigation)
		datesSet: (info) => {
			if (info && info.view && info.view.currentStart) {
				loadWeatherForMonth(info.view.currentStart);
				if (typeof onDateChange === 'function') {
					onDateChange(info.view.currentStart, info.view.currentEnd);
				}
			}
		},
		buttonText: {
			today: 'Today',
			dayGridMonth: 'Month'
		},
		// Add custom button handlers
		customButtons: {
			today: {
				text: 'Today',
				click: goToToday
			}
		}
	});
</script>

<section class="w-full">
	{#if loading}
		<div class="flex items-center justify-center p-4">
			<div class="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-500"></div>
			<span class="ml-2 text-gray-600 dark:text-gray-300">Loading weather data...</span>
		</div>
	{/if}
	<div class="calendar-container">
		<Calendar plugins={[DayGrid]} {options} bind:this={calendarRef} />
	</div>
</section>

<style lang="postcss">
	@reference "tailwindcss";

	/* Override the default styles for the calendar */
	:global {
		/* Secondary button */
		.calendar-container .ec-button {
			@apply inline-flex cursor-pointer items-center justify-center gap-2 rounded-md border-0 bg-gray-700 px-4 py-2 text-sm font-semibold text-nowrap text-white shadow-sm transition-colors hover:bg-gray-700/90 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none active:bg-gray-700/95 disabled:pointer-events-none disabled:cursor-default disabled:opacity-50;
		}

		.ec-header,
		.ec-all-day,
		.ec-body,
		.ec-days,
		.ec-day,
		.ec-day-head {
			@apply border-gray-300;

			.dark & {
				@apply border-neutral-800;
			}
		}

		.ec-day-grid　 {
			@apply !h-auto md:h-[700px];
		}

		.ec-header {
			@apply hidden border-0 sm:flex;

			.ec-day {
				@apply border-0 px-2 py-1 text-right text-sm text-neutral-100;
			}
		}

		.ec-day-grid .ec-body {
			@apply border-0 bg-gray-50 sm:rounded-lg sm:shadow;

			.dark & {
				@apply bg-zinc-800;
			}
		}

		.ec-day-grid .ec-day-head {
			@apply min-w-10 items-center justify-center px-3 py-2 md:min-w-auto;
		}

		.ec-day-grid .ec-uniform .ec-days {
			@apply min-h-auto;
		}

		.ec-day-grid .ec-uniform .ec-day {
			@apply flex min-h-12 items-center md:min-h-32 md:flex-col md:items-end;
		}

		.ec-days {
			@apply flex-col border-none md:flex-row md:border-1;

			&:first-child .ec-day {
				@apply md:border-t-0;
			}
		}

		.ec-day {
			@apply border-t border-l-0 md:border-l-1;

			&.ec-other-month {
				@apply !hidden md:!flex;
			}
		}

		.ec-events {
			@apply m-0 !flex w-full flex-row items-center justify-between md:!flow-root;
		}

		.ec-event {
			@apply !visible mx-3 !my-2 !w-auto bg-transparent text-xs text-inherit shadow-none;

			/* Device data */
			~ .ec-event {
				@apply mx-2 !mt-2 rounded-sm bg-blue-100 px-2 py-1;

				.dark & {
					@apply bg-gray-700;
				}

				.ec-event-title {
					@apply min-h-auto;
				}
			}
		}

		.weather-data {
			@apply flex w-full flex-row items-center gap-1 md:-mt-9 md:flex-col md:items-start;

			.icon {
				@apply text-2xl md:text-3xl;
			}
		}

		.ec-day-foot {
			@apply !hidden;
		}
	}
</style>
