<script lang="ts">
	import DarkCard from '../../Cards/DarkCard.svelte';
	import highcharts from '$lib/actions/highcharts.action';
	import { getChartConfig } from './chart_tempHumidityConfig';

	import Calendar from '@event-calendar/core';
	import TimeGrid from '@event-calendar/day-grid';
	import moment from 'moment';
	import { PeriodType } from 'svelte-ux';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { _ } from 'svelte-i18n';

	export let sensor = null;

	const people_count = sensor.data.map((d) => [new Date(d.created_at).getTime(), d.people_count]);
	const car_count = sensor.data.map((d) => [
		new Date(d.created_at).getTime(),
		d.car_count + d.truck_count
	]); // Updated to add truck_count to car_count
	const bicycle_count = sensor.data.map((d) => [new Date(d.created_at).getTime(), d.bicycle_count]);

	const current_people_count = sensor.data.at(0).people_count;
	const current_car_count = sensor.data.at(0).car_count + sensor.data.at(0).truck_count; // Updated
	const current_bicycle_count = sensor.data.at(0).bicycle_count;
	let loading = true;

	// Get Highcharts configuration
	const tempChartConfig = getChartConfig(people_count, bicycle_count, car_count);

	let value = {
		from: moment.utc().utcOffset('+0900').startOf('month').toDate(),
		to: moment.utc().utcOffset('+0900').endOf('month').toDate(),
		periodType: PeriodType.Day
	};
	let plugins = [TimeGrid];
	let options = {
		view: 'dayGridMonth',
		date: value.from,
		events: [],
		prev: () => {
			debugger;
		},
		locale: 'ja-jp',
	};

	onMount(() => {
		loadCountsForCalendar();
	});

	const loadCountsForCalendar = async () => {
		fetch(
			`/api/v1/devices/${$page.params.dev_eui}/data?firstDataDate=${moment.utc(value.from).utcOffset('+0000').startOf('month').toDate()}&lastDataDate=${moment.utc(value.to).utcOffset('+0000').toDate()}`
		)
			.then((res) => res.json())
			.then((data) => {
				// Group data by day
				const groupedData = {};

				data.data.forEach((counts) => {
					const date = moment(counts.created_at).format('YYYY-MM-DD');
					if (!groupedData[date]) {
						groupedData[date] = { people_count: 0, car_count: 0, bicycle_count: 0 };
					}
					groupedData[date].people_count += counts.people_count;
					groupedData[date].car_count += counts.car_count + counts.truck_count; // Updated
					groupedData[date].bicycle_count += counts.bicycle_count;
				});

				// Create calendar events from grouped data
				Object.entries(groupedData).forEach(([date, counts], i) => {
					options.events.push({
						id: i,
						title: `人: ${counts.people_count.toLocaleString()}`,
						editable: false,
						allDay: true,
						backgroundColor: '#a90f0f',
						start: date,
						end: date
					});
					options.events.push({
						id: i + 1,
						title: `車: ${counts.car_count.toLocaleString()}`, // Includes truck_count now
						editable: false,
						allDay: true,
						backgroundColor: '#0f8aa9',
						start: date,
						end: date
					});
					options.events.push({
						id: i + 2,
						title: `自転車: ${counts.bicycle_count.toLocaleString()}`,
						editable: false,
						allDay: true,
						backgroundColor: '#0fa93a',
						start: date,
						end: date
					});
				});

				console.log(options);
				loading = false;
			});
	};
</script>

<div class="grid grid-flow-row grid-cols-1 gap-2 md:grid-cols-3">
	<DarkCard title={$_('traffic.people_count')} value={current_people_count} unit="/hr" />
	<DarkCard title={$_('traffic.car_count')} value={current_car_count} unit="/hr" />
	<DarkCard title={$_('traffic.bicycle_count')} value={current_bicycle_count} unit="/hr" />
</div>

<DarkCard title="24h {$_('traffic.count')}">
	<div class="chart-container" use:highcharts={tempChartConfig}></div>
</DarkCard>

<DarkCard title={$_('traffic.calendar')}>
	{#if loading}
		<p>Loading...</p>
	{:else}
		<Calendar {plugins} {options} />
	{/if}
</DarkCard>
