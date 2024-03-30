<script>
	import { mdiThermometer, mdiWaterPercent, mdiBrightness7, mdiWeatherWindy, mdiGauge, mdiWeatherRainy, mdiWeatherSunnyAlert } from '@mdi/js';
	import { Icon, Card } from 'svelte-ux';
  
	export let environmentalData = {
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
  
	<div class="single-line-layout gap-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-8 overflow-x-auto">
	  <Card class="data-item flex flex-row md:flex-col items-center p-4 rounded-lg shadow-md">
		<Icon data={mdiThermometer} size="32" color="#ff6347" />
		<div class="ml-2 grid grid-flow-col md:grid-flow-row grid-cols-2 md:grid-cols-1">
		  <div class="data-label font-bold">Temperature</div>
		  <div class="data-value text-end md:text-center">{environmentalData.temperature}°C</div>
		</div>
	  </Card>
	  <Card class="data-item flex flex-row md:flex-col items-center md:mb-0 p-4 rounded-lg shadow-md">
		<Icon data={mdiWaterPercent} size="32" color="#00bfff" />
		<div class="ml-2 grid grid-flow-col md:grid-flow-row grid-cols-2 md:grid-cols-1">
		  <div class="data-label font-bold">Humidity</div>
		  <div class="data-value text-end md:text-center">{environmentalData.humidity}%</div>
		</div>
	  </Card>
	  <Card class="data-item flex flex-row md:flex-col items-center md:mb-0 p-4 rounded-lg shadow-md">
		<Icon data={mdiBrightness7} size="32" color="#ffd700" />
		<div class="ml-2 grid grid-flow-col md:grid-flow-row grid-cols-2 md:grid-cols-1">
		  <div class="data-label font-bold text-center">Lux</div>
		  <div class="data-value text-end md:text-center">{environmentalData.lux} lux</div>
		</div>
	  </Card>
	  <Card class="data-item flex flex-row md:flex-col items-center md:mb-0 p-4 rounded-lg shadow-md">
		<Icon data={mdiWeatherSunnyAlert} size="32" color="#8b008b" />
		<div class="ml-2 grid grid-flow-col md:grid-flow-row grid-cols-2 md:grid-cols-1">
		  <div class="data-label font-bold">UV</div>
		  <div class="data-value text-end md:text-center">{environmentalData.uv}</div>
		</div>
	  </Card>
	  <Card class="data-item flex flex-row md:flex-col items-center md:mb-0 p-4 rounded-lg shadow-md">
		<Icon data={mdiGauge} size="32" color="#008000" />
		<div class="ml-2 grid grid-flow-col md:grid-flow-row grid-cols-2 md:grid-cols-1">
		  <div class="data-label font-bold">Pressure</div>
		  <div class="data-value text-end md:text-center">{environmentalData.pressure} hPa</div>
		</div>
	  </Card>
	  <Card class="data-item flex flex-row md:flex-col items-center md:mb-0 p-4 rounded-lg shadow-md">
		<Icon data={mdiWeatherWindy} size="32" color="#708090" />
		<div class="ml-2 grid grid-flow-col md:grid-flow-row grid-cols-2 md:grid-cols-1">
		  <div class="data-label font-bold">Wind Speed</div>
		  <div class="data-value text-end md:text-center">{environmentalData.windSpeed} km/h</div>
		</div>
	  </Card>
	  <Card class="data-item flex flex-row md:flex-col items-center md:mb-0 p-4 rounded-lg shadow-md">
		<Icon data={mdiWeatherWindy} size="32" color="#708090" />
		<div class="ml-2 grid grid-flow-col md:grid-flow-row grid-cols-2 md:grid-cols-1">
		  <div class="data-label font-bold">Wind Direction</div>
		  <div class="data-value text-end md:text-center">{environmentalData.windDirection}</div>
		</div>
	  </Card>
	  <Card class="data-item flex flex-row md:flex-col items-center mb-4 md:mb-0 p-4 rounded-lg shadow-md">
		<Icon data={mdiWeatherRainy} size="32" color="#4169e1" />
		<div class="ml-2 grid grid-flow-col md:grid-flow-row grid-cols-2 md:grid-cols-1">
		  <div class="data-label font-bold">Rainfall</div>
		  <div class="data-value text-end md:text-center">{environmentalData.rainfall} mm</div>
		</div>
	  </Card>
	</div>
  </div>