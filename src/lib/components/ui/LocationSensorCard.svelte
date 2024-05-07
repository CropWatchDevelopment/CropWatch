<script lang="ts">
	export let sensor;
	import Active from '$lib/images/UI/cw_active.svg';
	import Inactive from '$lib/images/UI/cw_inactive_circle.svg';
	import SensorArrow from '$lib/images/UI/cw_get into arrow.svg';
	import { CW_AIR_THVD_DATA } from '$lib/sensor-dto/convert_cw_air_thvd';

	let data = CW_AIR_THVD_DATA(sensor.cw_devices);
	debugger;
</script>

<div class="flex bg-[#34393f] bg-opacity-50 rounded-xl text-surface-100 my-3 justify-between">
	<!-- Content -->
	<div class="py-4 pl-6 flex items-center space-x-3">
		<!-- image -->
		<div class="h-full rounded-md ">
                <img src="https://cdn.discordapp.com/attachments/1225451615851511859/1225611174570364948/AP1GczO-BAVI9axULXMs6D1wzR3H4PGxxOKp63Ihc8vj9prhwta5fGwdZb-sS4dFjyi6_myI17GxaDr_KS9Lqei6RH8Z-c7A1o-u-PcVTG2D9KleqvXULFfumeldq9pK9UFSms8Pcw3a2-EjZD3AKqqYXa1QP0KdFkNru4Ecy-N6NlKtdnMhy7brW_VTeMkDe2kWtYRSbDJQHq4RSHxiI4DDOp4CBsz5FXoapCnnw52IGgOHhq11OB5NTrdrsDoHOXFMMWSh1Yy4wHzsVURsSCvSdCfETiat-fmZFtaP79WTfKh-oJ3gSGkwATa2LZWULKn9QVUBf1cMfqH_C0KxK9vrEWacaMdcQQ5kV9akW4MXAYHW1blatioFr5l4pBZ69BaSNGZF1be6AqNI733691DXiutJIAAzmOkePyvx3Iv31xrHkVhyKD7qaEncsPuKnB7i193SMQRCUYK5oNMqXjMIk3lBVIrFb8SLhPVZ86QOXfGomDfszgpGCdal..png?ex=66382bda&is=6636da5a&hm=9b098ccb04a094d46776f729753538aedc91f51416feef56ff8ce0be595a5ad8&" alt="" class="object-cover w-20 h-full rounded-xl">
		</div>
		<!-- data -->
		<div>
			<!-- Title and status -->
			<div class="flex space-x-1 items-center">
				<div class="w-2">
					{#if sensor.status == 'active'}
						<img src={Active} alt="active" />
					{:else}
						<img src={Inactive} alt="inactive" />
					{/if}
				</div>
				<div>
					<p class="text-lg">{sensor.name}</p>
				</div>
			</div>
			<div class="grid grid-cols-2 gap-1 text-sm text-left mt-2">
				<p>Temperature</p>
				<p class="ml-6">{sensor.temperature}<span class="text-xs">ºC</span></p>
				<p>Moisture</p>
				<p class="ml-6">{sensor.moisture}<span class="text-xs">%</span></p>
				<p>pH</p>
				<p class="ml-6">{sensor.ph}<span class="text-xs"></span></p>
				<p>EC</p>
				<p class="ml-6">{sensor.ec}<span class="text-xs">µs/cm</span></p>
			</div>
		</div>
	</div>
	<!-- href arrow -->

	<!-- <a href="/locations/{location.id}/sensors/{sensors.id}"> -->
	<a href="/" class="bg-[#3A393F] mix-blend-soft-light px-3 rounded-xl flex items-center">
		<div class="w-5">
			<img src={SensorArrow} alt="" />
		</div>
	</a>
</div>
