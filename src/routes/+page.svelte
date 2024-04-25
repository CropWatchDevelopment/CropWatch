<script lang="ts">
	import DashboardCard from '$lib/components/ui/dashboardCard.svelte';
import { Card, Collapse } from 'svelte-ux';
	export let data;
	const {locations, weatherJSON} = data;

	// console.log("Data from Server:", data.locations)
	// console.log("Data from Server WEATHER:", weatherJSON.properties.timeseries.slice(-1)[0].data.instant)
</script>

<svelte:head>
	<title>Home</title>
	<meta name="description" content="CropWatch" />
</svelte:head>

<!-- <section>
	<div class="bg-surface-100 w-full p-4">
		<h1 class="text-3xl my-8 w-3/4">Get real time data from your crops</h1>
		<h2 class="my-10 text-xl w-3/4">
			Knowing what your crops need is not easy. Making it accessible to you is our job.
		</h2>
	</div>
</section> -->
<section>
	<!-- JSON -->
	<div>
		<!-- {JSON.stringify(data.locations)} -->
		<!-- {JSON.stringify(data.weatherJSON)} -->
	</div>
	<div class="bg-neutral p-4 h-screen" >
		<!-- BELL -->
		<div class="py-1  my-5">
			<div class="flex justify-end w-full h-7">
				<img src="/icons/UI/cw-bell.png" alt="" >
			</div>
		</div>


		<!-- TITLE and Filter -->
		<div class="flex justify-between mb-6">
			
			<!-- TITLE -->
			<h2 class=" font-light text-2xl text-surface-100">Dashboard</h2>

			<!-- Filter -->
			<div class="flex align-baseline justify-center items-center">
				<div class="w-4">
					<img src="/icons/UI/cw_filter_button.png" alt="">
				</div>
				<p class="text-surface-100 px-1">Filter</p>
			</div>
		</div>
		<!-- CARDS -->
		{#each locations as location}
			<DashboardCard data={location} />
		{/each}
		<!-- ONE CARD -->
		<div class="bg-white p-3 rounded-2xl border-[#D2D2D2] border-[0.1em]">
			<div class="w-full h-20">
				<img
					src="https://images.rawpixel.com/image_800/cHJpdmF0ZS9sci9pbWFnZXMvd2Vic2l0ZS8yMDIyLTA1L2ZsMzYyNjkxODE2NDItcHVibGljLWltYWdlLWtvbnFxczZlLmpwZw.jpgs"
					alt=""
					class="object-cover rounded-2xl w-full h-full"
				/>
			</div>
			<div class="pl-2 pt-2">
				<h2 class="text-xl my-3">Takasue's GreenHouse</h2>
				<div class="flex">
					<p class="basis-1/3"></p>
					<div class="basis-1/3 text-xs flex">
						<img src="/icons/UI/cw_thermometer.png" alt="" class="w-4">
						<p>Temperature</p>	
					</div>
					<div class="basis-1/3 text-xs flex">
						<img src="/icons/UI/cw_moisture.png" alt="" class="w-4">
						<p>Humidity</p>	</div>
				</div>
				<div class="text-sm">
					<Card
						class="divide-y bg-[#F7FAFF] border-[#FBFBFB] border-[0.1em] rounded-md elevation-none my-2"
					>
						<Collapse>
							<!-- Outside -->
							<div slot="trigger" class="flex-1 px-3 py-2">
								<div class="flex text-center">
									<div class="basis-1/3 flex items-center space-x-2">
										<div class="w-2">
											<img src="/icons/UI/cw_active.png" alt="">
										</div>
										<p>Sensor 1</p>
									</div>
									<p class="basis-1/3">25ºC</p>
									<p class="basis-1/3">34%</p>
								</div>
							</div>
							<!-- Inside -->
							<div class="pl-4">
								<div class="flex px-3 mt-3">
									<h3 class="text-lg basis-1/3 font-medium mb-2">Soil Details</h3>
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
					<Card
						class="divide-y bg-[#F7FAFF] border-[#FBFBFB] border-[0.1em] rounded-md elevation-none my-2"
					>
						<Collapse>
							<div slot="trigger" class="flex-1 px-3 py-2">
								<div class="flex text-center">
									<div class="basis-1/3 flex items-center space-x-2">
										<div class="w-2">
											<img src="/icons/UI/cw_active.png" alt="">
										</div>
										<p>Sensor 1</p>
									</div>
									<p class="basis-1/3">25ºC</p>
									<p class="basis-1/3">34%</p>
								</div>
							</div>
							<div class="px-3 pb-3 border-t">
								Lorem ipsum dolor sit amet consectetur adipisicing elit. Reiciendis quod culpa et,
								dolores omnis, ipsum in perspiciatis porro ut nihil molestiae molestias tenetur
								delectus velit! Inventore laborum rerum at id?
							</div>
						</Collapse>
					</Card>
				</div>
			</div>
		</div>
	</div>
</section>
