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
	import { flatGroup } from 'd3-array';
	import { curveLinearClosed, curveCatmullRomClosed, curveCatmullRom } from 'd3-shape';
	import { Field, PeriodType, ToggleGroup, ToggleOption, cls } from 'svelte-ux';
    import { Chart, Svg, Group, Axis, Spline, Points } from 'layerchart';

	export let data;
	export let sensorName = 'NS';

	let temperature = data.at(0).soil_temperatureC;
	let moisture = data.at(0).soil_moisture;
	let soil_ec = data.at(0).soil_EC;
    let npk_array = [
        { name: 'N', value: data.at(0).soil_N },
        { name: 'P', value: data.at(0).soil_P },
        { name: 'K', value: data.at(0).soil_K },
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
		'Soil Temperature'
	);

	$: moistureConfig = HighChartsTimeSeriesChart(
		[
			{
				type: 'line',
				yAxis: 0,
				name: 'Moisture',
				color: 'blue',
				data: data.map((d: any) => [new Date(d.created_at).valueOf(), d.soil_moisture])
			}
		],
		'Soil Moisture'
	);
</script>

<div class="m-4">
	<div class="flex flex-row">
		<img
			src={isActiveRecently ? ActiveImage : inActiveImage}
			alt={isActiveRecently ? 'Active Image' : 'in-active Image'}
			class="w-14 h-14 mr-4"
		/>
		<div class="flex flex-col">
			<p class="text-surface-100 text-4xl">{sensorName}</p>
			<p class="text-slate-500">Last Seen: <Duration start={lastSeen} totalUnits={1} /> ago</p>
		</div>
	</div>
	<DarkCard title={'Temperature'} value={temperature} optimalValue={-20} unit={'ºC'}>
		<div class="chart" use:Highcharts={tempConfig} />
		{data.length}
	</DarkCard>

	<DarkCard title={'Moisture'} value={moisture} optimalValue={20} unit={'%'}>
		<div class="chart" use:Highcharts={moistureConfig} />
	</DarkCard>

	<DarkCard title={'EC'} value={soil_ec} unit={'µS/m'} optimalValue={1}></DarkCard>

	<DarkCard title={'NPK'}>
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

	<SensorFooterControls />
</div>
