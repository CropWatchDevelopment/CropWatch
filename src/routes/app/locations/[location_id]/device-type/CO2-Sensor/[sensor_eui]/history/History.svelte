<script lang="ts">
	import { page } from '$app/stores';
	import { supabase } from '$lib/supabaseClient';
	import { mdiCalendarRange, mdiDotsVertical, mdiDownload, mdiHistory } from '@mdi/js';
	import { scaleOrdinal, scaleTime } from 'd3-scale';
	import {
		AreaStack,
		Axis,
		Chart,
		Highlight,
		Labels,
		Spline,
		Svg,
		Tooltip,
		TooltipItem
	} from 'layerchart';
	import { Button, DateRangeField, PeriodType, format, formatDate } from 'svelte-ux';
	import { flatten } from 'svelte-ux/utils/array';
	import type { DateRange } from 'svelte-ux/utils/dateRange';

	export let sensor;
	$: multiSeriesFlatData = getFilteredData();

	const keys = ['temperature', 'humidity', 'co2_level'];

	const dateRangeUpdate = () => {
		supabase.from('seeed_co2_lorawan_uplinks').select('*').eq('dev_eui', $page.params.sensor_eui).then(({ data, error }) => {
			if (error) {
				console.error('Error fetching data:', error);
			} else {
				sensor.sensor.data = data;
				multiSeriesFlatData = getFilteredData();
			}
		});
	};

	function transformDataForChart(data) {
		// Map each data point to the required format
		const chartData = data.map((entry) => {
			// For each entry, create three pairs for the series, and a data object with the detailed measurements
			const pointStructure = [
				[0, entry.temperature], // Assuming temperature is plotted as the first series
				[0, entry.humidity], // Assuming humidity is plotted as the second series
				[0, entry.co2_level] // Assuming CO2 level is plotted as the third series
			];

			// Adding the data object with date and measurements
			pointStructure.forEach(
				(point) =>
					(point.data = {
						date: new Date(entry.created_at),
						temperature: entry.temperature, // Mapping temperature to apples
						humidity: entry.humidity, // Mapping humidity to bananas
						co2_level: entry.co2_level // Mapping CO2 level to oranges
					})
			);

			return pointStructure;
		});

		// Since the structure needs to separate these into series, we'll reorganize the data
		const series = [0, 1, 2].map((index) => chartData.map((entry) => entry[index]));

		return series;
	}

	let selectedDateRange: DateRange = {
		from: new Date(),
		to: new Date(),
		periodType: PeriodType.Day
	};

	let fruitColors = {
		temperature: '#ff0000', // Example color for temperature
		humidity: '#00ff00', // Example color for humidity
		co2_level: '#0000ff' // Example color for CO2 levels
	};

	const download = async () => {
		try {
			const response = await fetch(
				`/api/co2-data?dev_eui=${$page.params.sensor_eui}&from=${selectedDateRange.from}&to=${selectedDateRange.to}`
			);
			const blob = await response.blob();
			const url = URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.href = url;
			link.download = 'data.csv';
			link.click();
			URL.revokeObjectURL(url);
		} catch (error) {
			console.error('Error downloading file:', error);
		}
	};

	let selectedMetrics = {
		temperature: true,
		humidity: true,
		co2_level: true
	};

	function getFilteredData() {
		const filteredData = transformDataForChart(sensor.sensor.data);
		return filteredData.filter((_, index) => selectedMetrics[keys[index]]);
	}

	
</script>

<div class="m-4">
	<h2>History list</h2>

	<ol class="mt-2">
		<div class="grid grid-cols-2 gap-4">
			<DateRangeField bind:value={selectedDateRange} on:change={() => dateRangeUpdate()} icon={mdiCalendarRange} />
			<Button variant="outline" icon={mdiDownload} on:click={() => download()}>Download</Button>
		</div>

		<div class="h-[300px] p-4 border rounded">
			<Chart
				data={multiSeriesFlatData}
				flatData={flatten(multiSeriesFlatData)}
				x={(d) => d.data.date}
				xScale={scaleTime()}
				y={[0, 1]}
				yNice
				r="key"
				rScale={scaleOrdinal()}
				rDomain={keys}
				rRange={['hsl(var(--color-danger))', 'hsl(var(--color-success))', 'hsl(var(--color-info))']}
				padding={{ left: 16, bottom: 24 }}
				tooltip={{ mode: 'bisect-x' }}
			>
				<Svg>
					<Axis placement="left" grid rule />
					<Axis
						placement="bottom"
						format={(d) => formatDate(d, PeriodType.Day, { variant: 'short' })}
						rule
					/>
					<AreaStack line={{ 'stroke-width': 2 }} />
					<Highlight points lines />
				</Svg>
				<Tooltip header={(data) => format(data.data.date, 'eee, MMMM do')} let:data>
					{#each keys as key}
						<TooltipItem label={key} value={data.data[key]} />
					{/each}
				</Tooltip>
			</Chart>
		</div>
		<div class="checkbox-group">
			{#each keys as key}
				<label>
					<input type="checkbox" bind:checked={selectedMetrics[key]} on:click={() => {getFilteredData()}} />
					{key}
				</label>
			{/each}
		</div>
	</ol>
</div>
