<script lang="ts">
	import { mdiCalendarRange, mdiDotsVertical, mdiDownload, mdiHistory } from '@mdi/js';
	import { scaleOrdinal, scaleTime } from 'd3-scale';
	import { AreaStack, Axis, Chart, Svg } from 'layerchart';
	import {
		DateRangeField,
		PeriodType,
		formatDate,
		keys

	} from 'svelte-ux';
	import { flatten } from 'svelte-ux/utils/array';
	import type { DateRange } from 'svelte-ux/utils/dateRange';

	export let sensor;

	const stackData = stack().keys(keys)(sensor.sensor.data);

	let selectedDateRange: DateRange = {
		from: new Date(),
		to: new Date(),
		periodType: PeriodType.Day
	};
	// $: data = $sensorDataState;
	console.log(sensor.sensor.data);
</script>

<div class="m-4">
	<h2>History list</h2>

	<ol class="mt-2">
		<DateRangeField bind:value={selectedDateRange} stepper icon={mdiCalendarRange} />

		<div class="h-[300px] p-4 border rounded">
			<Chart
				data={stackData}
				flatData={flatten(stackData)}
				x={(d) => d.data.date}
				xScale={scaleTime()}
				y={[0, 1]}
				yNice
				r="key"
				rScale={scaleOrdinal()}
				rDomain={keys}
				rRange={['hsl(var(--color-danger))', 'hsl(var(--color-success))', 'hsl(var(--color-info))']}
				padding={{ left: 16, bottom: 24 }}
			>
				<Svg>
					<Axis placement="left" grid rule />
					<Axis
						placement="bottom"
						format={(d) => formatDate(d, PeriodType.Day, { variant: 'short' })}
						rule
					/>
					<AreaStack line={{ 'stroke-width': 2 }} />
				</Svg>
			</Chart>
		</div>

		<ol class="">
			{#each sensor.sensor.data as dat}
				<li>
					{dat.created_at}
					{dat.temperature}
					{dat.humidity} - {dat.co2_level}
				</li>
			{/each}
		</ol>
	</ol>
</div>
