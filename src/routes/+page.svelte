<script lang="ts">
	import { Card, Collapse } from 'svelte-ux';
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
	<div class="bg-neutral p-2 h-screen" >
		
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
				<h2 class="text-xl">Takasue's GreenHouse</h2>
				<div class="flex">
					<p class="basis-1/3"></p>
					<p class="basis-1/3">Temperature</p>
					<p class="basis-1/3">Humidity</p>
				</div>
				<div class="">
					<Card
						class="divide-y bg-[#F7FAFF] border-[#FBFBFB] border-[0.1em] rounded-md elevation-none my-2"
					>
						<Collapse>
							<!-- Outside -->
							<div slot="trigger" class="flex-1 px-3 py-2">
								<div class="flex text-center">
									<p class="basis-1/3">Sensor 1</p>
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
									<p class="basis-1/3">Sensor 1</p>
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
