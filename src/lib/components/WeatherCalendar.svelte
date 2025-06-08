<script lang="ts">
	import { Calendar, DayGrid } from '@event-calendar/core';
	import '@event-calendar/core/index.css'; // include default styles
	import { fetchHistoricalWeather } from '$lib/utilities/monthWeatherHistory';
	import moment from 'moment';
	// 1. Declare weather state
	let weather = $state([]);

	// Load weather data on component mount
	fetchHistoricalWeather(moment().startOf('month').toDate(), moment().endOf('day').toDate())
		.then((data) => {
			console.log('Weather data received:', data);
			const mappedEvents = data.map((entry) => ({
				id: entry.date,
				start: entry.date, // EventCalendar accepts ISO8601 strings
				end: entry.date,
				allDay: true, // Weather events are all-day events
				title: entry.weather.maxtemp_c !== null && entry.weather.mintemp_c !== null 
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
			weather = mappedEvents; // Direct assignment instead of splice
			console.log('Mapped weather events:', weather);
		})
		.catch((err) => console.error('Weather fetch failed:', err));

	// 4. Event content rendering function
	function eventContentRenderer(info) {
		const { event } = info;
		const icon = event.extendedProps.icon;
		const maxTemp = event.extendedProps.maxTemp;
		const minTemp = event.extendedProps.minTemp;
		const precipitation = event.extendedProps.precipitation;
		
		if (icon) {
			const tempDisplay = maxTemp !== null && minTemp !== null 
				? `${maxTemp}°/${minTemp}°C`
				: 'No temp data';
				
			return {
				html: `
					<div style="display:flex; flex-direction:column; align-items:center; font-size:10px; padding:2px;">
						<div style="font-size:20px; margin-bottom:2px;">${icon}</div>
						<div style="text-align:center; line-height:1.1;">
							${tempDisplay}<br>
							${precipitation}mm
						</div>
					</div>
				`
			};
		}
		return undefined; // Use default rendering
	}

	// 3. Derive calendar options reactively - this will update when weather changes
	const options = $derived({
		view: 'dayGridMonth',
		date: new Date(), // Current month
		events: weather, // This will reactively update when weather changes
		eventContent: eventContentRenderer,
		dayMaxEvents: true, // Allow +more link when too many events
		height: '600px',
		headerToolbar: {
			start: 'prev,next today',
			center: 'title',
			end: 'dayGridMonth,timeGridWeek'
		},
		initialView: 'dayGridMonth'
	});
</script>

<section>
	<div>
		<p>Weather events count: {weather.length}</p>
		<p>Data source: Open-Meteo Historical Weather API</p>
		<p>Location: Osaka, Japan</p>
		<p>Current calendar view: {moment().format('MMMM YYYY')}</p>
	</div>
	<Calendar 
		plugins={[DayGrid]} 
		{options}
	/>
</section>
