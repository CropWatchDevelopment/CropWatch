<script lang="ts">
  import DataRowItem from './DataRowItem.svelte';

	import { Button } from 'svelte-ux';
	import { goto } from '$app/navigation';
	import { mdiArrowRight, mdiTimerSand } from '@mdi/js';
	import type { ILocation } from '$lib/interfaces/ILocation.interface';
	import { draggable } from '@thisux/sveltednd';

	let {
		location
	}: {
		location: ILocation;
	} = $props();
</script>

<div
	use:draggable={{
		container: location.location_id.toString(),
		dragData: location
	}}
	class={`
		svelte-dnd-touch-feedback
		cursor-move
		rounded-lg
		bg-gradient-to-br
		shadow-lg
		transition-all
		duration-300
		hover:scale-[1.02]
		hover:shadow-xl
		active:scale-95
		active:brightness-110
	`}
>
	<div class="border-[rgb(121 121 121)] rounded-2xl border-[0.1em] bg-surface-content/30 p-0.5">
		<div
			class="custom-bg rounded-4xl relative h-20 w-full bg-cover bg-bottom bg-no-repeat bg-blend-overlay"
		>
			<div
				class="absolute right-0 top-0 h-full w-1/2 rounded-2xl bg-gradient-to-l from-black"
			></div>
			<!-- <div class="absolute right-3 top-4 space-y-1 text-xs text-white drop-shadow-md">
				<p>5: --mm/h</p>
				<p>5: --%</p>
				<p>5: -- km/h</p>
			</div>
			<div class="absolute left-3 top-5">
				<p class="text-shadow flex text-3xl text-white">
					22<span class="text-xl text-neutral-content drop-shadow-md">ºC</span>
				</p>
			</div> -->
		</div>
	</div>
	</div>

	<h2 class="text-primary-content my-3 flex flex-row items-center overflow-hidden text-ellipsis text-xl">
		{location.name}
		<span class="flex flex-grow"></span>
		<!-- COMING BACK SOON!!!-->
		<!-- <Button
			variant="fill"
			color="primary"
			icon={mdiArrowRight}
			on:click={() => goto(`/app/location/${location.location_id}`)}
		/> -->
	</h2>
	<div class="flex flex-col gap-1 px-1 pb-4 text-sm text-primary-content">
		{#each location.cw_devices as device}
			<DataRowItem {device} {location}></DataRowItem>
		{/each}
	</div>


<style>
	.text-shadow {
		text-shadow: black 5px 5px 3px;
	}
	.custom-bg::before {
		content: ' ';
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background-image: url($lib/images/weather/sunny_clouds.png);
		background-size: cover;
		background-position: center;
		-webkit-border-radius: 15px;
		-moz-border-radius: 15px;
		border-radius: 15px;
		filter: blur(1px) grayscale(20%);
	}
</style>
