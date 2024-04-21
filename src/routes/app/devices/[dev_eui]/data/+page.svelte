<script lang="ts">
	import Highcharts from '$lib/actions/highcharts.action';

    import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import { PUBLIC_SITE_BASE } from '$env/static/public';
	import { page } from '$app/stores';
	import { HighChartsTimeSeriesChart } from '$lib/charts/highcharts/timeseries';

    let config: any = [];

    onMount(async () => {
        await fetch(`${PUBLIC_SITE_BASE}/api/v1/devices/${$page.params.dev_eui}/data?=page=0&count=1000`).then(res => res.json()).then(data => {
            console.log(data);
            config = HighChartsTimeSeriesChart(data.map((d: any) => [new Date(d.created_at), d.temperatureC]));
        }).catch(err => {
            console.log(err)
        })
    })
</script>

<div class="chart" use:Highcharts={config} />