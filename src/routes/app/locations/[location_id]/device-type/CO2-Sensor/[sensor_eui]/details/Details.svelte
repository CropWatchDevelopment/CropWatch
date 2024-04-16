<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { format, isWithinInterval, subSeconds } from 'date-fns';
	import CWStatCard from '$lib/components/stat-card/CWStatCard.svelte';
	import { mdiGauge, mdiMoleculeCo2, mdiThermometer, mdiWater } from '@mdi/js';
	import { scaleBand, scaleTime } from 'd3-scale';
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

	export let sensor;

	// Assuming sensor.sensor.data is sorted by created_at in ascending order
    // If not, you may need to sort it first
    let earliestData = sensor.sensor.data.at(-1);
    let latestData = sensor.sensor.data.at(0);

	// Convert earliest and latest data points to moment objects for consistency
    let earliestTime = moment(earliestData.created_at);
    let latestTime = moment(latestData.created_at);

	// Calculate the maximum hours difference between the earliest and latest data points
    let maxHours = latestTime.diff(earliestTime, 'hours');

	// Use the maximum hours as the range to ensure all data points are considered
    // The range is set from 0 to maxHours to cover the full range of your data
	
	$: co2Data = sensor.sensor.data.filter((f) => {
		const createdAt = moment(f.created_at);
        return isWithinInterval(createdAt.toDate(), {
			start: moment().subtract(value[0], 'hours').toDate(), // More hours ago, based on the maxHours
            end: moment().subtract(value[1], 'hours').toDate() // Fewer hours ago, more recent
        });
    });
	let value = [0, maxHours];
</script>

<div class="grid grid-cols-{latestData.pressure !== null ? 4 : 3} mt-10 gap-4 mb-2">
	<CWStatCard
		icon={mdiMoleculeCo2}
		title="{$_('detail.CO2')}"
		value={latestData.co2_level}
		optimal={24.33}
		notation=" PPM"
		counterStartTime={subSeconds(sensor.sensor.data?.at(0).created_at, 0)}
	/>
	<CWStatCard
		icon={mdiThermometer}
		title="{$_('detail.Air Temperature')}"
		value={latestData.temperature}
		optimal={24.33}
		notation="°c"
		counterStartTime={subSeconds(sensor.sensor.data?.at(0).created_at, 0)}
	/>
	<CWStatCard
		icon={mdiWater}
		title="{$_('detail.Relative Humidity')}"
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
	<Header title="{$_('detail.CO2 History')}" subheading="{$_('detail.CO2 Over Time')}" slot="header">
		<div slot="avatar">
			<Avatar class="bg-primary text-primary-content font-bold">
				<Icon data={mdiMoleculeCo2} />
			</Avatar>
		</div>
	</Header>
	<div class="h-[300px] p-4 border rounded">
		<Chart
			data={co2Data.map((d) => {
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
					format={(d) => formatDate(d, PeriodType.DayTime, { variant: 'short' })}
					rule
				/>
				<Bars radius={4} strokeWidth={1} class="fill-primary" />
			</Svg>
		</Chart>
		<RangeSlider bind:value min={0} max={maxHours}/>
	</div>
</Card>

<div class="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
	<Card>
		<Header title="{$_('detail.Air Temperature History')}" subheading="{$_('detail.Air Temperature Over Time')}" slot="header">
			<div slot="avatar">
				<Avatar class="bg-primary text-primary-content font-bold">
					<Icon data={mdiThermometer} />
				</Avatar>
			</div>
		</Header>
		<div class="h-[300px] p-4 border rounded">
			<Chart
				data={co2Data.map((d) => {
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
			<RangeSlider bind:value min={0} max={maxHours}/>
		</div>
	</Card>

	<Card>
		<Header title="{$_('detail.Humidity History')}" subheading="{$_('detail.Relative Humidity Over Time')}" slot="header">
			<div slot="avatar">
				<Avatar class="bg-primary text-primary-content font-bold">
					<Icon data={mdiWater} />
				</Avatar>
			</div>
		</Header>
		<div class="h-[300px] p-4 border rounded">
			<Chart
				data={co2Data.map((d) => {
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
			<RangeSlider bind:value min={0} max={maxHours}/>
		</div>
	</Card>
</div>
