<script lang="ts">
	import { Calendar, DayGrid } from '@event-calendar/core';
	import '@event-calendar/core/index.css'; // include default styles
	import { fetchHistoricalWeather } from '$lib/utilities/monthWeatherHistory';
	import { DateTime } from 'luxon';
	import { onMount } from 'svelte';

	interface WeatherCalendarProps {
		events?: any[];
		onDateChange?: (start: Date, end: Date) => void;
		latitude?: number | null;
		longitude?: number | null;
	}

	const {
		events = [],
		onDateChange = () => {},
		latitude = null,
		longitude = null
	}: WeatherCalendarProps = $props();

	// 1. Declare weather state and current date with proper types
	let weather: any[] = $state([]);
	let currentDate = $state(DateTime.now().startOf('month').toJSDate()); // Track the currently displayed month
	let loading = $state(false);
	let calendarRef: any = $state(null); // Reference to the calendar component
	let lastWeatherMonthKey = $state<string | null>(null);
	let pendingWeatherMonthKey = $state<string | null>(null);

	const logPrefix = '[WeatherCalendar]';
	const debug = (...args: unknown[]) => console.log(logPrefix, ...args);

	const toMonthKey = (date: Date) => DateTime.fromJSDate(date).toFormat('yyyy-MM');

	// Function to load weather data for a given date
	async function loadWeatherForMonth(date: Date) {
		const monthKey = toMonthKey(date);
		if (monthKey === pendingWeatherMonthKey) {
			debug('Skipping weather fetch; already fetching', monthKey);
			return;
		}
		if (monthKey === lastWeatherMonthKey && weather.length) {
			debug('Skipping weather fetch; data already loaded for', monthKey);
			return;
		}
		debug('Fetching weather for month', monthKey, 'date range seed', date.toISOString());
		pendingWeatherMonthKey = monthKey;
		loading = true;
		try {
			const currentMonth = DateTime.fromJSDate(date);
			const startDate = currentMonth.startOf('month').toJSDate();
			let endDate = currentMonth.endOf('month');
			const today = DateTime.now();
			if (endDate.toMillis() > today.toMillis()) {
				endDate = today.endOf('day');
			}

			const resolvedLatitude =
				typeof latitude === 'number' && Number.isFinite(latitude) ? latitude : undefined;
			const resolvedLongitude =
				typeof longitude === 'number' && Number.isFinite(longitude) ? longitude : undefined;

			const data = await fetchHistoricalWeather(
				startDate,
				endDate.toJSDate(),
				resolvedLatitude,
				resolvedLongitude
			);

			debug('Weather API response length', data.length, 'for', monthKey);
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
			weather = mappedEvents;
			lastWeatherMonthKey = monthKey;
			//console.log('Mapped weather events:', weather);
		} catch (err) {
			console.error(logPrefix, 'Weather fetch failed for', monthKey, err);
			weather = [];
			lastWeatherMonthKey = null;
		} finally {
			loading = false;
			if (pendingWeatherMonthKey === monthKey) {
				pendingWeatherMonthKey = null;
			}
			debug('Fetch complete for', monthKey);
		}
	}

	// Load initial data on mount
	onMount(() => {
		debug('Mounting calendar with initial date', currentDate?.toISOString());
		if (currentDate) {
			void loadWeatherForMonth(currentDate);
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

	// Handle datesSet separately to avoid reactive loop
	function handleDatesSet(info: any) {
		// Guard against duplicate triggers caused by internal rerenders
		const viewStart = info?.view?.currentStart;
		const viewEnd = info?.view?.currentEnd;
		if (!viewStart) return;

		const nextKey = toMonthKey(viewStart);

		if (nextKey === lastWeatherMonthKey && weather.length) {
			debug('datesSet ignored; data already loaded for', nextKey);
			return;
		}

		debug('datesSet triggered', { currentStart: viewStart, currentEnd: viewEnd });
		loadWeatherForMonth(viewStart);
		if (typeof onDateChange === 'function') {
			onDateChange(viewStart, viewEnd);
		}
	}

	// 3. Derive calendar options reactively - this will update when weather changes
	const options = $derived({
		view: 'dayGridMonth',
		events: [...weather, ...events].filter((event) => {
			if (!event || !event.start) return false;
			const eventDate = new Date(event.start);
			const now = new Date();
			const monthStart = DateTime.now().startOf('month').toJSDate();
			return eventDate >= monthStart && eventDate <= now;
		}),
		eventContent: eventContentRenderer,
		dayMaxEvents: true, // Allow +more link when too many events
		height: '700px',
		locale: 'ja',
		headerToolbar: {
			start: 'prev,next today',
			center: 'title',
			end: 'dayGridMonth'
		},
		initialView: 'dayGridMonth',
		// Handle date changes (month navigation)
		validRange: (() => {
			const today = DateTime.now();
			const start = today.startOf('month').toISODate();
			const end = today.toISODate();
			return { start, end };
		})(),
		datesSet: handleDatesSet,
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
	<p class="mt-4 text-center text-xs text-gray-500">
		Weather data by <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer"
			>Open-Meteo</a
		>
	</p>
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

		.ec-title {
			@apply text-lg;
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
				@apply text-lg md:text-2xl;
			}
		}

		.ec-day-foot {
			@apply !hidden;
		}
	}
</style>
