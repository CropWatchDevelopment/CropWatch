<script lang="ts">
	import { format, subSeconds } from 'date-fns';
	import CWStatCard from '$lib/components/stat-card/CWStatCard.svelte';
	import { mdiGauge, mdiMoleculeCo2, mdiThermometer, mdiWater } from '@mdi/js';
	import { scaleBand, scaleTime } from 'd3-scale';
	import { Axis, Bars, Chart, Svg, Spline, Highlight, Tooltip, TooltipItem, Labels } from 'layerchart';
	import { Avatar, Card, Header, PeriodType, formatDate, Icon } from 'svelte-ux';

	export let sensor;

	let latestData = sensor.sensor.data.at(-1);
</script>

<div class="grid grid-cols-{latestData.pressure !== null ? 4 : 3} mt-10 gap-4 mb-2">
	<CWStatCard
		icon={mdiMoleculeCo2}
		title="CO²"
		value={latestData.co2_level}
		optimal={24.33}
		notation=" PPM"
		counterStartTime={subSeconds(sensor.sensor.data?.at(0).created_at, 0)}
	/>
	<CWStatCard
		icon={mdiThermometer}
		title="Temperature"
		value={latestData.temperature}
		optimal={24.33}
		notation="°c"
		counterStartTime={subSeconds(sensor.sensor.data?.at(0).created_at, 0)}
	/>
	<CWStatCard
		icon={mdiWater}
		title="Humidity"
		value={latestData.humidity}
		optimal={25}
		notation="%"
		counterStartTime={subSeconds(sensor.sensor.data?.at(0).created_at, 0)}
	/>
	{#if latestData.pressure !== null}
		<CWStatCard
			icon={mdiGauge}
			title="Pressure"
			value={latestData.pressure}
			optimal={25}
			notation="hPa"
			counterStartTime={subSeconds(sensor.sensor.data?.at(0).created_at, 0)}
		/>
	{/if}
</div>

<Card>
	<Header title="CO² History" subheading="CO² Over time" slot="header">
		<div slot="avatar">
			<Avatar class="bg-primary text-primary-content font-bold">
				<Icon data={mdiMoleculeCo2} />
			</Avatar>
		</div>
	</Header>
	<div class="h-[300px] p-4 border rounded">
		<Chart
			data={sensor.sensor.data.map((d) => {
				return {
					date: new Date(d.created_at),
					value: d.co2_level
				};
			})}
			x="date"
			xScale={scaleBand().padding(0.4)}
			y="value"
			yDomain={[0, null]}
			yNice={4}
			padding={{ left: 16, bottom: 24 }}
		>
			<Svg>
				<Axis placement="left" grid rule />
				<Axis
					placement="bottom"
					format={(d) => formatDate(d, PeriodType.Day, { variant: 'short' })}
					rule
				/>
				<Bars radius={4} strokeWidth={1} class="fill-primary" />
			</Svg>
		</Chart>
	</div>
</Card>

<div class="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
	<Card>
		<Header title="Temperature History" subheading="Temp Over time" slot="header">
			<div slot="avatar">
				<Avatar class="bg-primary text-primary-content font-bold">
					<Icon data={mdiThermometer} />
				</Avatar>
			</div>
		</Header>
		<div class="h-[300px] p-4 border rounded">
			<Chart
				data={sensor.sensor.data.map((d) => {
					return {
						date: new Date(d.created_at),
						value: d.temperature
					};
				})}
				x="date"
				xScale={scaleTime()}
				y="value"
				yDomain={[0, null]}
				yNice
				padding={{ left: 16, bottom: 24 }}
			>
				<Svg>
					<Axis placement="left" grid rule />
					<Axis
						placement="bottom"
						format={(d) => formatDate(d, PeriodType.Day, { variant: 'short' })}
						rule
					/>
					<Spline class="stroke-2 stroke-primary" />
					<Labels format="integer" />
				</Svg>
			</Chart>
		</div>
	</Card>

	<Card>
		<Header title="Humidity History" subheading="Temp Over time" slot="header">
			<div slot="avatar">
				<Avatar class="bg-primary text-primary-content font-bold">
					<Icon data={mdiWater} />
				</Avatar>
			</div>
		</Header>
		<div class="h-[300px] p-4 border rounded">
			<Chart
				data={sensor.sensor.data.map((d) => {
					return {
						date: new Date(d.created_at),
						value: d.humidity
					};
				})}
				x="date"
				xScale={scaleTime()}
				y="value"
				yDomain={[0, null]}
				yNice
				padding={{ left: 16, bottom: 24 }}
			>
				<Svg>
					<Axis placement="left" grid rule />
					<Axis
						placement="bottom"
						format={(d) => formatDate(d, PeriodType.Day, { variant: 'short' })}
						rule
					/>
					<Spline class="stroke-2 stroke-primary" />
					<Labels format="integer" />
				</Svg>
			</Chart>
		</div>
	</Card>
</div>
