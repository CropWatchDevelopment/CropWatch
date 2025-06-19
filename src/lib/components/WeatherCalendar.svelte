<script lang="ts">
	import { Calendar, DayGrid } from '@event-calendar/core';
	import '@event-calendar/core/index.css'; // include default styles
	import { fetchHistoricalWeather } from '$lib/utilities/monthWeatherHistory';
	import moment from 'moment';
	import { onMount } from 'svelte';

    interface WeatherCalendarProps {
		events?: any[];
		onDateChange?: (start: Date, end: Date) => void;
	}

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
				maxTemp !== null && minTemp !== null ? `${maxTemp}°/${minTemp}°C` : 'No temp data';

			return {
				html: `
					<div style="display:flex; flex-direction:row; font-size:1rem;">
						<div style="font-size:2rem;margin-right:2px">${icon}</div>
						<div style="font-size:1rem;">
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
		events: weather.filter(event => event && event.start), // Filter out invalid events
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

<style>
	/* Fix for dark mode compatibility */
	:global(.calendar-container .ec-button) {
		color: var(--foreground, #000);
		background-color: var(--background, #fff);
		border: 1px solid var(--border, #ddd);
	}

	:global(.calendar-container .ec-button:hover) {
		background-color: var(--muted, #f5f5f5);
	}

	:global(.calendar-container .ec-button.ec-button-active) {
		background-color: var(--primary, #3788d8);
		color: var(--primary-foreground, #fff);
	}

	:global(.dark .calendar-container .ec-button) {
		color: #fff;
		background-color: #333;
		border-color: #555;
	}

	:global(.dark .calendar-container .ec-button:hover) {
		background-color: #444;
	}

	:global(.dark .calendar-container .ec-button.ec-button-active) {
		background-color: #3788d8;
		color: #fff;
	}
</style>
