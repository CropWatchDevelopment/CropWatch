<!-- <script lang="ts">
	import { Card, Icon } from 'svelte-ux';
	import SunnySky from '$lib/images/sunnySky.jpg';
	import OvercastSky from '$lib/images/overcastSky.jpg';
	import { mdiArrowUpThin, mdiCloud, mdiGauge, mdiWater, mdiWeatherSunny, mdiWeatherWindy, mdiWindPower } from '@mdi/js';

	export let TemperatureC: number | undefined;
	export let Humidity: number | undefined;
	export let WindSpeed: number | undefined;
	export let WindDirection: number | undefined = 50;
	export let Pressure: number | undefined;
	export let UVI: number | undefined;
	export let LUX: number | undefined;
	export let Rainfall: number | undefined = 0;
</script>

<div class="flex flex-col items-center justify-center">

	<div class="w-full p-5 rounded-xl z-20" style="background-image: URL({OvercastSky})">
		<div class="flex justify-between">
			<div class="flex flex-col">
				<span class="text-6xl font-bold">{TemperatureC != undefined ? TemperatureC : '--'}°C</span>
				<span class="font-semibold mt-1 text-gray-500">西都市,宮崎</span>
			</div>
			
		</div>
		<div class="flex justify-between mt-3">
			<div class="flex flex-col items-center">
				<span class="font-semibold text-lg">{Humidity != undefined ? Humidity : '--'}%</span>
				<Icon data={mdiWater} classes={{root: 'w-12 h-12'}} />
				<span class="text-xs font-semibold text-gray-400">Air Humdity</span>
			</div>
			<div class="flex flex-col items-center">
				<span class="font-semibold text-lg">{Rainfall != undefined ? Rainfall : '--'} mm/h</span>
				<Icon data={mdiCloud} classes={{root: 'w-12 h-12'}} />
				<span class="text-xs font-semibold text-gray-400">Rainfall</span>
			</div>
			<div class="flex flex-col items-center">
				<span class="font-semibold text-lg">{WindSpeed != undefined ? WindSpeed : '--'} mph (
					<Icon data={mdiArrowUpThin} style="transform: rotate({WindDirection}deg)" />
				)</span>
				<Icon data={mdiWeatherWindy} classes={{root: 'w-12 h-12'}} />
				<span class="text-xs font-semibold text-gray-400">Wind Speed</span>
			</div>
			<div class="flex flex-col items-center">
				<span class="font-semibold text-lg">{LUX != undefined ? LUX : '--'} ({UVI != undefined ? UVI : '--'}UVI)</span>
				<Icon data={mdiWeatherSunny} classes={{root: 'w-12 h-12'}} />
				<span class="text-xs font-semibold text-gray-400">LUX/UV</span>
			</div>
			<div class="flex flex-col items-center">
				<span class="font-semibold text-lg">{Pressure != undefined ? Pressure : '--'}hPa</span>
				<Icon data={mdiGauge} classes={{root: 'w-12 h-12'}} />
				<span class="text-xs font-semibold text-gray-400">Pressure</span>
			</div>
		</div>
	</div>

</div> -->

<script>
	import { mdiThermometer, mdiWaterPercent, mdiBrightness7, mdiWeatherWindy, mdiGauge, mdiWeatherRainy, mdiWeatherSunnyAlert } from '@mdi/js';
	import { Icon, Card } from 'svelte-ux';
  
	const environmentalData = {
	  temperature: 24,
	  humidity: 65,
	  lux: 45000,
	  uv: 5,
	  pressure: 1015,
	  windSpeed: 12,
	  windDirection: 'NW',
	  rainfall: 2.5
	};
  </script>












  
  <div class="dashboard container mx-auto max-w-full">
	<h2 class="text-2xl font-bold">Outdoor Environmental Data</h2>
  
	<div class="single-line-layout gap-2 grid grid-cols-1 md:grid-cols-4 lg:grid-cols-8 overflow-x-auto">
	  <Card class="data-item flex items-center p-4 rounded-lg shadow-md">
		<Icon data={mdiThermometer} size="32" color="#ff6347" />
		<div class="ml-2">
		  <div class="data-label font-bold">Temperature</div>
		  <div class="data-value">{environmentalData.temperature}°C</div>
		</div>
	  </Card>
	  <Card class="data-item flex items-center md:mb-0 p-4 rounded-lg shadow-md">
		<Icon data={mdiWaterPercent} size="32" color="#00bfff" />
		<div class="ml-2">
		  <div class="data-label font-bold">Humidity</div>
		  <div class="data-value">{environmentalData.humidity}%</div>
		</div>
	  </Card>
	  <Card class="data-item flex items-center md:mb-0 p-4 rounded-lg shadow-md">
		<Icon data={mdiBrightness7} size="32" color="#ffd700" />
		<div class="ml-2">
		  <div class="data-label font-bold">Lux</div>
		  <div class="data-value">{environmentalData.lux} lux</div>
		</div>
	  </Card>
	  <Card class="data-item flex items-center md:mb-0 p-4 rounded-lg shadow-md">
		<Icon data={mdiWeatherSunnyAlert} size="32" color="#8b008b" />
		<div class="ml-2">
		  <div class="data-label font-bold">UV</div>
		  <div class="data-value">{environmentalData.uv}</div>
		</div>
	  </Card>
	  <Card class="data-item flex items-center md:mb-0 p-4 rounded-lg shadow-md">
		<Icon data={mdiGauge} size="32" color="#008000" />
		<div class="ml-2">
		  <div class="data-label font-bold">Pressure</div>
		  <div class="data-value">{environmentalData.pressure} hPa</div>
		</div>
	  </Card>
	  <Card class="data-item flex items-center md:mb-0 p-4 rounded-lg shadow-md">
		<Icon data={mdiWeatherWindy} size="32" color="#708090" />
		<div class="ml-2">
		  <div class="data-label font-bold">Wind Speed</div>
		  <div class="data-value">{environmentalData.windSpeed} km/h</div>
		</div>
	  </Card>
	  <Card class="data-item flex items-center md:mb-0 p-4 rounded-lg shadow-md">
		<Icon data={mdiWeatherWindy} size="32" color="#708090" />
		<div class="ml-2">
		  <div class="data-label font-bold">Wind Direction</div>
		  <div class="data-value">{environmentalData.windDirection}</div>
		</div>
	  </Card>
	  <Card class="data-item flex items-center mb-4 md:mb-0 p-4 rounded-lg shadow-md">
		<Icon data={mdiWeatherRainy} size="32" color="#4169e1" />
		<div class="ml-2">
		  <div class="data-label font-bold">Rainfall</div>
		  <div class="data-value">{environmentalData.rainfall} mm</div>
		</div>
	  </Card>
	</div>
  </div>