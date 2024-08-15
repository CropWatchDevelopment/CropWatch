<script lang="ts">
	import DarkCard from "../../Cards/DarkCard.svelte";
	import highcharts from '$lib/actions/highcharts.action';
	import { getChartConfig } from "./chart_tempHumidityConfig";

	export let sensor = null;

	const people_count = sensor.data.map((d) => [new Date(d.created_at).getTime(), d.people_count]);
	const car_count = sensor.data.map((d) => [new Date(d.created_at).getTime(), d.car_count]);
	const bicycle_count = sensor.data.map((d) => [new Date(d.created_at).getTime(), d.bicycle_count]);

    const current_people_count = sensor.data.at(0).people_count;
	const current_car_count = sensor.data.at(0).car_count;
	const current_bicycle_count = sensor.data.at(0).bicycle_count;

	// Get Highcharts configuration
	const tempChartConfig = getChartConfig(people_count, car_count, bicycle_count);
</script>

<div class="grid grid-flow-row grid-cols-1 gap-2 md:grid-cols-3">
	<DarkCard title="People Count" value="{current_people_count}" unit="/hr" />
	<DarkCard title="People Count" value="{current_car_count}" unit="/hr" />
	<DarkCard title="People Count" value="{current_bicycle_count}" unit="/hr" />
</div>

<DarkCard title="Temperature & Humidity">
	<div class="chart-container" use:highcharts={tempChartConfig}></div>
</DarkCard>

