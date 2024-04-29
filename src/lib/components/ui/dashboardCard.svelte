<script lang="ts">
	import { Card, Collapse } from 'svelte-ux';
	// export let locationName = 'Location Name'
	export let data;
	const locationId = data.location_id;
	const locationName = data.locationName;
	const temperature = data.weatherJSON.temperature;
	const rainfall = data.weatherJSON.rainfall;
	const humidity = data.weatherJSON.humidity;
	const windSpeed = data.weatherJSON.windSpeed;
</script>

<div class="bg-white p-3 mb-4 rounded-2xl border-[#D2D2D2] border-[0.1em]">
	<div class="w-full h-20 relative rounded-2xl">
		<a href="/locations/{locationId}">
			<img
				src="https://images.rawpixel.com/image_800/cHJpdmF0ZS9sci9pbWFnZXMvd2Vic2l0ZS8yMDIyLTA1L2ZsMzYyNjkxODE2NDItcHVibGljLWltYWdlLWtvbnFxczZlLmpwZw.jpgs"
				alt=""
				class="object-cover w-full h-full absolute top-0 rounded-2xl"
			/>
		</a>
		<div class="w-1/2 h-full bg-gradient-to-l from-black absolute top-0 rounded-2xl right-0"></div>
		<div class="absolute top-4 text-[0.5em] text-surface-100 drop-shadow-md right-3 space-y-1">
			<!-- <p>Temperature:{temperature}</p> -->
			<p>Rainfall: {rainfall}%</p>
			<p>Humidity: {humidity}%</p>
			<p>Windspeed: {windSpeed} km/h</p>
		</div>
		<div class="absolute left-3 top-5">
			<p class="text-surface-100 text-3xl text-shadow">
				{temperature}<span class="text-xl text-gray-100">ºC</span>
			</p>
		</div>
	</div>
	<div class="pl-2 pt-2">
		<h2 class="text-xl my-3">{locationName}</h2>
		<div class="flex">
			<p class="basis-1/3"></p>
			<div class="basis-1/3 text-xs flex">
				<img src="/icons/UI/cw_thermometer.png" alt="" class="w-4" />
				<p>Primary Data</p>
			</div>
			<div class="basis-1/3 text-xs flex">
				<img src="/icons/UI/cw_moisture.png" alt="" class="w-4" />
				<p>Secondary Data</p>
			</div>
		</div>
		<div class="text-sm">
			{#each data.devices as device}
			<!-- {JSON.stringify(device, null, 2)} -->
				<Card
					class="divide-y bg-[#F7FAFF] border-[#FBFBFB] border-[0.1em] rounded-md elevation-none my-2"
				>
					<Collapse>
						<!-- Outside -->
						<div slot="trigger" class="flex-1 px-3 py-2">
							<div class="flex text-center">
								<div class="basis-1/3 flex items-center space-x-2">
									<div class="w-2">
										<img src={device.isPastDue ? "/icons/UI/cw_inactive_circle.png" : "/icons/UI/cw_active.png"} alt="" />
									</div>
									<p>{device.cw_devices.name}</p>
								</div>
								<p class="basis-1/3">{device.cw_devices.primary_data}{device.cw_devices.primary_data_notation}</p>
								<p class="basis-1/3">{device.cw_devices.secondary_data}{device.cw_devices.secondary_data_notation}</p>
							</div>
						</div>
						<!-- Inside -->
						<div class="pl-4">
							<div class="flex px-3 mt-3">
								<h3 class="text-lg basis-1/3 font-medium mb-2">Details</h3>
							</div>
							<div class="px-3 pb-3 flex text-left">
								<p class="basis-1/2 text-sm">Temperature</p>
								<p class="basis-1/2 text-sm">27ºC</p>
							</div>
							<div class="px-3 pb-3 flex text-left">
								<p class="basis-1/2 text-sm">Moisture</p>
								<p class="basis-1/2 text-sm">23%</p>
							</div>
							<div class="px-3 pb-3 flex text-left">
								<p class="basis-1/2 text-sm">pH</p>
								<p class="basis-1/2 text-sm">3.4</p>
							</div>
							<div class="px-3 pb-3 flex text-left">
								<p class="basis-1/2 text-sm">EC</p>
								<p class="basis-1/2 text-sm">7.6</p>
							</div>

							<!-- NPK -->
							<div class="mt-4">
								<div class="px-3 pb-3 flex text-left">
									<p class="basis-1/2 text-sm">N</p>
									<p class="basis-1/2 text-sm">23%</p>
								</div>
								<div class="px-3 pb-3 flex text-left">
									<p class="basis-1/2 text-sm">P</p>
									<p class="basis-1/2 text-sm">3.4</p>
								</div>
								<div class="px-3 pb-3 flex text-left">
									<p class="basis-1/2 text-sm">K</p>
									<p class="basis-1/2 text-sm">7.6</p>
								</div>
							</div>
						</div>
					</Collapse>
				</Card>
			{/each}
		</div>
	</div>
</div>

<style>
	.text-shadow {
		text-shadow: 0px 1px 5px gray;
	}
</style>
