<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { HighChartsTimeSeriesChart } from '$lib/charts/highcharts/timeseries';
	import DarkCard from '../DarkCard.svelte';
	import Highcharts from '$lib/actions/highcharts.action';

	export let data;
	// ALERM! 010A011C0100012C000000
	$: status = data.at(-1).fireAlarm;
	$: temperature = data.at(-1).temperatureC;
	$: tempConfig = HighChartsTimeSeriesChart(
		[
			{
				type: 'line',
				yAxis: 0,
				name: '',
				color: 'red',
				data: data.map((d: any) => [new Date(d.created_at).valueOf(), d.temperatureC])
			}
		],
		[
			{
				// Secondary yAxis
				title: {
					text: '',
					style: {
						color: 'red'
					}
				},
				labels: {
					format: '{value} °C',
					style: {
						color: 'red'
					}
				},
				opposite: false
			}
		],
		''
	);
</script>

<div class="m-4">
	<div class="w-full">
		{#if status > 0}
		<div class="flex justify-center items-center">
			<svg
			  class="w-1/2 lg:w-1/12"
			  id="Layer_1"
			  data-name="Layer 1"
			  xmlns="http://www.w3.org/2000/svg"
			  viewBox="0 0 140 120"
			  preserveAspectRatio="xMidYMid meet"
			>
			  <defs>
				<style>
				  .cls-1 {
					fill: #b71616;
				  }
				  .cls-2 {
					fill: #e21b1b;
					fill-rule: evenodd;
				  }
				  .cls-3 {
					fill: #fff;
				  }
				</style>
			  </defs>
			  <title>red-alert</title>
			  <path
				class="cls-1"
				d="M2.35,84.43,45.29,10.2l.17-.27h0a22.92,22.92,0,0,1,7-7.23A17,17,0,0,1,61.58,0a16.78,16.78,0,0,1,9.11,2.69,22.79,22.79,0,0,1,7,7.26c.13.21.25.42.36.64l42.24,73.34.23.44h0a22.22,22.22,0,0,1,2.37,10.19,17.59,17.59,0,0,1-2.16,8.35,16,16,0,0,1-6.94,6.61l-.58.26a21.34,21.34,0,0,1-9.11,1.74v0H17.62c-.23,0-.44,0-.66,0a18.07,18.07,0,0,1-6.2-1.15A16.46,16.46,0,0,1,3,104.26a17.59,17.59,0,0,1-3-9.58,23,23,0,0,1,1.57-8.74,8.24,8.24,0,0,1,.77-1.51Z"
			  />
			  <path
				class="cls-2"
				d="M9,88.76l43.15-74.6c5.23-8.25,13.53-8.46,18.87,0l42.44,73.7c3.38,6.81,1.7,16-9.34,15.77H17.62c-7.27.18-12-6.19-8.64-14.87Z"
			  />
			  <path
				class="cls-3"
				d="M57.57,82.7a5.51,5.51,0,0,1,3.48-1.58,5.75,5.75,0,0,1,2.4.35,5.82,5.82,0,0,1,2,1.31,5.53,5.53,0,0,1,1.62,3.55,6.05,6.05,0,0,1-.08,1.4,5.54,5.54,0,0,1-5.64,4.6,5.67,5.67,0,0,1-2.27-.52,5.56,5.56,0,0,1-2.82-2.94,5.65,5.65,0,0,1-.35-1.27,5.83,5.83,0,0,1-.06-1.31h0a6.19,6.19,0,0,1,.57-2,4.57,4.57,0,0,1,1.13-1.56Zm8.16-10.24c-.2,4.79-8.31,4.8-8.5,0-.82-8.21-2.92-29.39-2.85-37.1.07-2.38,2-3.79,4.56-4.33a12.83,12.83,0,0,1,5,0c2.61.56,4.65,2,4.65,4.44v.24L65.73,72.46Z"
			  />
			</svg>
		  </div>
			<p class="w-full text-4xl text-white text-center">ALARM!</p>
		{:else}
			<svg
				class="mx-auto w-1/2 lg:w-1/12"
				id="Layer_1"
				style="enable-background:new 0 0 512 512;"
				version="1.1"
				viewBox="0 0 512 512"
				xml:space="preserve"
				xmlns="http://www.w3.org/2000/svg"
				xmlns:xlink="http://www.w3.org/1999/xlink"
				><style type="text/css">
					.st0 {
						fill: #2bb673;
					}
					.st1 {
						fill: none;
						stroke: #ffffff;
						stroke-width: 30;
						stroke-miterlimit: 10;
					}
				</style><path
					class="st0"
					d="M489,255.9c0-0.2,0-0.5,0-0.7c0-1.6,0-3.2-0.1-4.7c0-0.9-0.1-1.8-0.1-2.8c0-0.9-0.1-1.8-0.1-2.7  c-0.1-1.1-0.1-2.2-0.2-3.3c0-0.7-0.1-1.4-0.1-2.1c-0.1-1.2-0.2-2.4-0.3-3.6c0-0.5-0.1-1.1-0.1-1.6c-0.1-1.3-0.3-2.6-0.4-4  c0-0.3-0.1-0.7-0.1-1C474.3,113.2,375.7,22.9,256,22.9S37.7,113.2,24.5,229.5c0,0.3-0.1,0.7-0.1,1c-0.1,1.3-0.3,2.6-0.4,4  c-0.1,0.5-0.1,1.1-0.1,1.6c-0.1,1.2-0.2,2.4-0.3,3.6c0,0.7-0.1,1.4-0.1,2.1c-0.1,1.1-0.1,2.2-0.2,3.3c0,0.9-0.1,1.8-0.1,2.7  c0,0.9-0.1,1.8-0.1,2.8c0,1.6-0.1,3.2-0.1,4.7c0,0.2,0,0.5,0,0.7c0,0,0,0,0,0.1s0,0,0,0.1c0,0.2,0,0.5,0,0.7c0,1.6,0,3.2,0.1,4.7  c0,0.9,0.1,1.8,0.1,2.8c0,0.9,0.1,1.8,0.1,2.7c0.1,1.1,0.1,2.2,0.2,3.3c0,0.7,0.1,1.4,0.1,2.1c0.1,1.2,0.2,2.4,0.3,3.6  c0,0.5,0.1,1.1,0.1,1.6c0.1,1.3,0.3,2.6,0.4,4c0,0.3,0.1,0.7,0.1,1C37.7,398.8,136.3,489.1,256,489.1s218.3-90.3,231.5-206.5  c0-0.3,0.1-0.7,0.1-1c0.1-1.3,0.3-2.6,0.4-4c0.1-0.5,0.1-1.1,0.1-1.6c0.1-1.2,0.2-2.4,0.3-3.6c0-0.7,0.1-1.4,0.1-2.1  c0.1-1.1,0.1-2.2,0.2-3.3c0-0.9,0.1-1.8,0.1-2.7c0-0.9,0.1-1.8,0.1-2.8c0-1.6,0.1-3.2,0.1-4.7c0-0.2,0-0.5,0-0.7  C489,256,489,256,489,255.9C489,256,489,256,489,255.9z"
					id="XMLID_3_"
				/><g id="XMLID_1_"
					><line class="st1" id="XMLID_2_" x1="213.6" x2="369.7" y1="344.2" y2="188.2" /><line
						class="st1"
						id="XMLID_4_"
						x1="233.8"
						x2="154.7"
						y1="345.2"
						y2="266.1"
					/></g
				></svg
			>
			<p class="w-full text-4xl text-white text-center">Normal</p>
		{/if}
	</div>
	<DarkCard title="24h {$_('air_temperature')}" value={temperature} unit={'ºC'}>
		<div class="chart mt-4" use:Highcharts={tempConfig} />
	</DarkCard>
	
</div>
