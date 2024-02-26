<script lang="ts">
	import { Card, Icon } from 'svelte-ux';
	import SunnySky from '$lib/images/sunnySky.jpg';
	import OvercastSky from '$lib/images/overcastSky.jpg';
	import { mdiArrowUpThin, mdiCloud, mdiGauge, mdiLumx, mdiWater, mdiWeatherSunny, mdiWeatherWindy, mdiWindPower } from '@mdi/js';

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
	<!-- Component Start -->
	<div class="w-full p-5 rounded-xl z-20" style="background-image: URL({OvercastSky})">
		<div class="flex justify-between">
			<div class="flex flex-col">
				<span class="text-6xl font-bold">{TemperatureC != undefined ? TemperatureC : '--'}°C</span>
				<span class="font-semibold mt-1 text-gray-500">西都市,宮崎</span>
			</div>
			<svg
				class="h-24 w-24 fill-current text-yellow-400"
				xmlns="http://www.w3.org/2000/svg"
				height="24"
				viewBox="0 0 24 24"
				width="24"
				><path d="M0 0h24v24H0V0z" fill="none" /><path
					d="M6.76 4.84l-1.8-1.79-1.41 1.41 1.79 1.79zM1 10.5h3v2H1zM11 .55h2V3.5h-2zm8.04 2.495l1.408 1.407-1.79 1.79-1.407-1.408zm-1.8 15.115l1.79 1.8 1.41-1.41-1.8-1.79zM20 10.5h3v2h-3zm-8-5c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm-1 4h2v2.95h-2zm-7.45-.96l1.41 1.41 1.79-1.8-1.41-1.41z"
				/></svg
			>
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

	<!-- Component End  -->
</div>
