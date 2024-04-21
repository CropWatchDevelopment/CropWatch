<script lang="ts">
	import Highcharts from '$lib/actions/highcharts.action';

	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { HighChartsTimeSeriesChart } from '$lib/charts/highcharts/timeseries';

	let config: any = [];

	onMount(async () => {
		if (browser)
			await fetch(`/api/v1/devices/${$page.params.dev_eui}/data?=page=0&count=1000`)
				.then((res) => res.json())
				.then((data) => {
					console.log(data);
                    const tempData = data.map((d: any) => [new Date(d.created_at).valueOf(), d.temperatureC]);
                    const humidityData = data.map((d: any) => [new Date(d.created_at).valueOf(), d.humidity]);
					config = HighChartsTimeSeriesChart([
						{
							type: 'line',
                            yAxis: 0,
							name: 'Temperature',
                            color: 'red',
							data: tempData,
						},
                        {
							type: 'line',
                            yAxis: 1,
							name: 'Humidity',
                            color: 'blue',
							data: humidityData,
						}
					], 'Temperature');
				})
				.catch((err) => {
					console.log(err);
				});
	});
</script>

<div class="chart" use:Highcharts={config} />
