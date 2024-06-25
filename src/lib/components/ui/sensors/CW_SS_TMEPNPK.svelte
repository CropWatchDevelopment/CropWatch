<script lang="ts">
	import { Duration } from 'svelte-ux';
	import DarkCard from '$lib/components/ui/DarkCard.svelte';
	import SensorFooterControls from '../SensorFooterControls.svelte';
	import ActiveImage from '$lib/images/UI/cw-10.svg';
	import inActiveImage from '$lib/images/UI/cw_sensor_status_inactive.svg';
	import moment from 'moment';
	import { HighChartsTimeSeriesChart } from '$lib/charts/highcharts/timeseries';
	import Highcharts from '$lib/actions/highcharts.action';
	import { scaleBand, scaleUtc } from 'd3-scale';
	import { curveLinearClosed } from 'd3-shape';
	import { Chart, Svg, Group, Axis, Spline, Points } from 'layerchart';
	import { _ } from 'svelte-i18n';
	import EditSensorNameDialog from '../EditSensorNameDialog.svelte';

	export let data;

	let dev_eui = data.at(0).dev_eui;
	let temperature = data.at(0).soil_temperatureC;
	let moisture = data.at(0).soil_moisture;
	let soil_ec = data.at(0).soil_EC;
	let N = data.at(0).soil_N;
	let P = data.at(0).soil_P;
	let K = data.at(0).soil_K;
	let soil_ph = data.at(0).soil_PH;
	let npk_array = [
		{ name: 'N', value: data.at(0).soil_N },
		{ name: 'P', value: data.at(0).soil_P },
		{ name: 'K', value: data.at(0).soil_K }
	];
	let lastSeen = data.at(0).created_at;
	let isActiveRecently = moment().diff(moment(lastSeen), 'minutes') < 31;
	let curve = curveLinearClosed;

	$: tempConfig = HighChartsTimeSeriesChart(
		[
			{
				type: 'line',
				yAxis: 0,
				name: 'Temperature',
				color: 'red',
				data: data.map((d: any) => [new Date(d.created_at).valueOf(), d.soil_temperatureC])
			}
		],
		[
			{
				labels: {
					format: '{value}°C',
					style: {
						color: 'red'
					}
				},
				title: {
					text: $_('temperature'),
					style: {
						color: 'red'
					}
				},
				plotLines: []
			}
		],
		$_('soil_temperature')
	);

	$: moistureConfig = HighChartsTimeSeriesChart(
		[
			{
				type: 'line',
				yAxis: 0,
				name: $_('soil_moisture'),
				color: 'lightblue',
				data: data.map((d: any) => [new Date(d.created_at).valueOf(), d.soil_moisture])
			}
		],
		[
			{
				// Secondary yAxis
				title: {
					text: $_('humidity'),
					style: {
						color: 'lightblue'
					}
				},
				labels: {
					format: '{value} %',
					style: {
						color: 'lightblue'
					}
				},
				opposite: true
			}
		],
		$_('')
	);
</script>

<DarkCard title={$_('soil_temperature')} value={temperature} optimalValue={-20} unit={'ºC'}>
	<div class="chart" use:Highcharts={tempConfig} />
</DarkCard>

<DarkCard title={$_('soil_moisture')} value={moisture} optimalValue={20} unit={'%'}>
	<div class="chart" use:Highcharts={moistureConfig} />
</DarkCard>

<DarkCard title={$_('soil_EC')} value={soil_ec} unit={'µS/m'} optimalValue={null}></DarkCard>

<DarkCard title={$_('soil_PH')} value={soil_ph} unit={''} optimalValue={null}></DarkCard>

<DarkCard title={`${$_('soil_N')} / ${$_('soil_P')} / ${$_('soil_K')}`}>
	<!-- <div class="flex flex-row w-full justify-between flex-wrap mt-3">
			<p class="text-surface-100 text-xl">{$_('soil_N')}: {N}</p>
			<p class="text-surface-100 text-xl">{$_('soil_P')}: {P}</p>
			<p class="text-surface-100 text-xl">{$_('soil_K')}: {K}</p>
		</div> -->
	<div class="flex flex-col justify-between">
		<DarkCard title={$_('soil_N')} value={N} unit={'µS/m'} optimalValue={null}></DarkCard>
		<DarkCard title={$_('soil_P')} value={P} unit={'µS/m'} optimalValue={null}></DarkCard>
		<DarkCard title={$_('soil_K')} value={K} unit={'µS/m'} optimalValue={null}></DarkCard>
	</div>
	<div class="h-[300px] p-4 border rounded">
		<Chart
			data={npk_array}
			x="name"
			xScale={scaleBand()}
			xDomain={npk_array.map((d) => d.name)}
			xRange={[0, 2 * Math.PI]}
			y="value"
			yRange={({ height }) => [0, height / 2]}
			yPadding={[0, 10]}
			padding={{ top: 32, bottom: 8 }}
		>
			<Svg>
				<Group center>
					<Axis
						placement="radius"
						grid={{ class: 'stroke-surface-content/20 fill-surface-200/50' }}
						ticks={[0, 5, 10]}
						format={(d) => ''}
					/>
					<Axis placement="angle" grid={{ class: 'stroke-surface-content/20' }} />
					<Spline radial {curve} class="stroke-primary fill-primary/20" />
					<Points radial class="fill-primary stroke-surface-200" />
				</Group>
			</Svg>
		</Chart>
	</div>
</DarkCard>
