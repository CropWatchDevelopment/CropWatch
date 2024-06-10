<script lang="ts">
	import Back from '$lib/components/ui/Back.svelte';
	import historyImage from '$lib/images/UI/cw_history.svg';
	import { Button, DateRangeField, MultiSelect, PeriodType } from 'svelte-ux';
	import { subDays, subWeeks } from 'date-fns';
	import { mdiDownload } from '@mdi/js';
	import { _ } from 'svelte-i18n';
	import { HighChartsTimeSeriesChart } from '$lib/charts/highcharts/timeseries.js';
	import Highcharts from '$lib/actions/highcharts.action';
	import { page } from '$app/stores';
	import DarkCard2 from '$lib/components/ui/DarkCard2.svelte';

	export let data;
	export let sensorName = 'NS';

	let today = new Date();
	let value = {
		from: subWeeks(today, 1),
		to: today,
		periodType: PeriodType.Day
	};
    let isLoading: boolean = false;
	let chartKey = 0;

	let options = Object.keys(data.sensorData).map((key) => {
		return {
			value: key,
			name: $_(key)
		};
	});
	let selectedDataPoints: string[] = [];

	$: chartConfig = HighChartsTimeSeriesChart(chartData.series, chartData.yAxes, '');

	let chartData = {
		series: [],
		yAxes: []
	};

	// Define a list of colors for the chart lines and Y-axes
	const colors = [
		'lightblue',
		'lightgreen',
		'red',
		'purple',
		'orange',
		'grey',
		'pink',
		'cyan',
		'yellow',
		'magenta'
	];

	function createChartSeries(res) {
		const series = {};
		const yAxes = {};

		res.forEach((d) => {
			Object.keys(d).forEach((key, i) => {
				if (key !== 'created_at') {
					if (!series[key]) {
						let colorIndex = Object.keys(yAxes).length % colors.length; // Cycle through colors
						series[key] = {
							type: 'line',
							yAxis: colorIndex, // Assign to new yAxis index
							name: $_(key),
							data: [],
							color: colors[colorIndex] // Use color from the array
						};
						yAxes[key] = {
							title: {
								text: $_(key),
								style: { color: colors[colorIndex] }
							},
							labels: {
								format: '{value}', // Customize if needed
								style: { color: colors[colorIndex] }
							},
							opposite: i % 2 === 0
						};
					}
					series[key].data.push([new Date(d.created_at).valueOf(), d[key]]);
				}
			});
		});

		return {
			series: Object.values(series),
			yAxes: Object.values(yAxes)
		};
	}

	const loadSelectedDataRange = async () => {
		const response = await fetch(
			`/api/v1/devices/${$page.params.dev_eui}/data?from=${value.from}&to=${value.to}&data-points=${selectedDataPoints}&page=0&count=10000`,
			{
				method: 'GET',
				headers: {
					'Content-Type': 'application/json'
				}
			}
		);
		const res = await response.json();
		chartData = createChartSeries(res);
		chartKey++; // Increment key to force re-render
	};

	const downloadCSV = (sensorName) => {
        isLoading = true;
		const date = new Date();
		const formattedDate = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
		const fileName = `${sensorName}-${formattedDate}.csv`;

		fetch(
			`/api/v1/devices/${$page.params.dev_eui}/data?from=${value.from}&to=${value.to}&data-points=${selectedDataPoints}&no-limit=1&csv=1`,
			{
				method: 'GET',
				headers: {
					'Content-Type': 'application/json'
				}
			}
		)
			.then((response) => response.blob())
			.then((blob) => {
				const url = window.URL.createObjectURL(blob);
				const a = document.createElement('a');
				a.style.display = 'none';
				a.href = url;
				a.download = fileName;
				document.body.appendChild(a);
				a.click();
				window.URL.revokeObjectURL(url);
                isLoading = false;
			})
			.catch((error) => {
                console.error('Error downloading the file:', error);
                isLoading = false;
            });
	};
</script>

<div class="flex flex-row bg-emerald-300 p-4 text-center justify-center">
	<img src={historyImage} alt="History" class="w-10 h-10" />
	<p class="text-surface-100 text-3xl ml-2">{$_('history.title')}</p>
</div>

<div class="mt-4 mx-2 flex justify-between">
	<Back />
</div>

<div class="m-6">
	<div>
		<DateRangeField bind:value label="" stepper rounded center />
	</div>

	<div class="grid lg:grid-flow-col grid-flow-rowgrid-cols-1 md:grid-cols-2 my-4 gap-2 text-white">
		<DarkCard2>
			<MultiSelect
				{options}
				value={selectedDataPoints}
				on:change={(e) => {
					selectedDataPoints = e.detail.value;
					selectedDataPoints.push('created_at');
					loadSelectedDataRange();
				}}
				inlineSearch
			/>
		</DarkCard2>
		<DarkCard2>
			<h2 class="text-xl text-neutral-content">{$_('history.data_preview')}:</h2>
			{#if chartKey === 0}
				<p class="text-center text-neutral-content">{$_('history.no_data')}</p>
			{/if}
			{#key chartKey}
				<div class="chart" use:Highcharts={chartConfig} />
			{/key}
		</DarkCard2>
	</div>

	<div class="mt-4">
		<Button
			variant="fill"
			color="info"
			icon={mdiDownload}
			on:click={() => downloadCSV('sensor')}
			size="lg"
			class="w-full"
            loading={isLoading}
            disabled={isLoading}
			rounded>{$_('history.download_selected')}</Button
		>
	</div>
</div>
