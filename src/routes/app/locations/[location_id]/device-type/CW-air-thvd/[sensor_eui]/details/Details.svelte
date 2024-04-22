<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { format, isWithinInterval, subSeconds } from 'date-fns';
	import CWStatCard from '$lib/components/stat-card/CWStatCard.svelte';
	import { mdiGauge, mdiMoleculeCo2, mdiThermometer, mdiWater } from '@mdi/js';
	import { scaleBand, scaleTime } from 'd3-scale';
	import Highcharts from '$lib/actions/highcharts.action';
	import { HighChartsTimeSeriesChart } from '$lib/charts/highcharts/timeseries';
	import {
		Axis,
		Bars,
		Chart,
		Svg,
		Spline,
		Highlight,
		Tooltip,
		TooltipItem,
		Labels
	} from 'layerchart';
	import { Avatar, Card, Header, PeriodType, formatDate, Icon, RangeSlider } from 'svelte-ux';
	import moment from 'moment';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';

	export let sensor;
	
	const tempData = sensor.sensor.data.map((d: any) => [
		new Date(d.created_at).valueOf(),
		d.temperatureC
	]);
	const humidityData = sensor.sensor.data.map((d: any) => [
		new Date(d.created_at).valueOf(),
		d.humidity
	]);
	
	let config = HighChartsTimeSeriesChart(
				[
					{
						type: 'line',
						yAxis: 0,
						name: 'Temperature',
						color: 'red',
						data: tempData
					},
					{
						type: 'line',
						yAxis: 1,
						name: 'Humidity',
						color: 'blue',
						data: humidityData
					}
				],
				'Temperature'
			);

	// Assuming sensor.sensor.data is sorted by created_at in ascending order
	// If not, you may need to sort it first
	let earliestData = sensor.sensor.data.at(-1);
	let latestData = sensor.sensor.data.at(0);

	// Convert earliest and latest data points to moment objects for consistency
	let earliestTime = moment(earliestData.created_at);
	let latestTime = moment(latestData.created_at);

	// Calculate the maximum hours difference between the earliest and latest data points
	let maxHours = latestTime.diff(earliestTime, 'minutes');

	// Use the maximum hours as the range to ensure all data points are considered
	// The range is set from 0 to maxHours to cover the full range of your data

	let value = [0, maxHours];
	$: TempData = sensor.sensor.data.filter((f) => {
		const createdAt = moment(f.created_at);
		return isWithinInterval(createdAt.toDate(), {
			start: moment().subtract(value[0], 'minutes').toDate(), // More hours ago, based on the maxHours
			end: moment().subtract(value[1], 'minutes').toDate() // Fewer hours ago, more recent
		});
	});
</script>

<div class="grid grid-cols-1 mt-10 gap-4 mb-2">
	<CWStatCard
		icon={mdiMoleculeCo2}
		title={$_('Detail.Air Temperature')}
		value={latestData.temperatureC}
		optimal={24.33}
		notation="°c"
		counterStartTime={subSeconds(sensor.sensor.data?.at(0).created_at, 0)}
	/>
	<CWStatCard
		icon={mdiThermometer}
		title={$_('Detail.Relative Humidity')}
		value={latestData.humidity}
		optimal={24.33}
		notation="%"
		counterStartTime={subSeconds(sensor.sensor.data?.at(0).created_at, 0)}
	/>
	<CWStatCard
		icon={mdiWater}
		title={$_('Detail.VPD')}
		value={latestData.vpd}
		optimal={25}
		notation="kPa"
		counterStartTime={subSeconds(sensor.sensor.data?.at(0).created_at, 0)}
	/>
	{#if latestData.dew !== null}
		<CWStatCard
			icon={mdiGauge}
			title={$_('Detail.Dew Point')}
			value={latestData.dewPointC}
			optimal={25}
			notation="°c"
			counterStartTime={subSeconds(sensor.sensor.data?.at(0).created_at, 0)}
		/>
	{/if}
</div>

<Card>
	<Header
		title={$_('Detail.Temperature History')}
		subheading={$_('Detail.Air Temperature Over Time')}
		slot="header"
	>
		<div slot="avatar">
			<Avatar class="bg-primary text-primary-content font-bold">
				<Icon data={mdiMoleculeCo2} />
			</Avatar>
		</div>
	</Header>
	<div class="h-[300px] p-4 border rounded">
		<div class="chart" use:Highcharts={config} />
	</div>
</Card>
