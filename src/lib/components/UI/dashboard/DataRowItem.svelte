<script lang="ts">
	import { Button, Collapse, Progress, ProgressCircle, stringify, TweenedValue } from 'svelte-ux';
	import { goto } from '$app/navigation';
	import { mdiArrowRight, mdiTimerSand } from '@mdi/js';
	import moment from 'moment';
	import DeviceDataList from './DeviceDataList.svelte';
	import type { ILocation } from '$lib/interfaces/ILocation.interface';
	import { nameToEmoji } from '$lib/utilities/NameToEmoji';
	import { m } from '$lib/paraglide/messages';

	let {
		device,
		location
	}: {
		device: any;
		location: ILocation;
	} = $props();

	let localStorageOpenState = localStorage.getItem(`${device.dev_eui}-collapseState`);
	let defaultCollapse: boolean = $state(
		localStorageOpenState ? JSON.parse(localStorageOpenState) : false
	);

	function collapseStateChange(e: CustomEvent) {
		defaultCollapse = e.detail.open;
		localStorage.setItem(`${device.dev_eui}-collapseState`, JSON.stringify(e.detail.open));
	}
</script>

<Collapse
	classes={{ root: 'shadow-md pr-2 bg-surface-200/50', icon: 'data-[open=true]:rotate-90' }}
	open={defaultCollapse}
	on:change={(e) => collapseStateChange(e)}
>
	<div
		slot="trigger"
		class="flex-1 border-l-8
				        {device.upload_interval === -1
			? '!border-l-green-500'
			: device.latest_data
				? moment(device.latest_data.created_at).isBefore(
						moment().subtract(device.upload_interval, 'minutes')
					)
					? '!border-l-red-500'
					: '!border-l-green-500'
				: '!border-l-yellow-500'}"
	>
		<div class="my-1 mr-2 border-r-2">
			<div class="flex flex-col text-center text-base">
				<div class="justify-left flex flex-row">
					<b class="ml-4 text-sm">{device.name}</b>
				</div>
				<div class="flex flex-row justify-center">
					{#if device.latest_data}
						<p class="m-auto justify-center">
							<span>
								{nameToEmoji(device.cw_device_type.primary_data_v2 ?? '')}
								<TweenedValue
									value={device.latest_data[device.cw_device_type.primary_data_v2]}
									format="decimal"
								/>
							</span>
							<small class="text-secondary-900">
								<sup>{device.cw_device_type.primary_data_notation}</sup>
							</small>
						</p>
						<p class="m-auto justify-center">
							<span>
								{#if device.cw_device_type.secondary_data_v2}
									{nameToEmoji(device.cw_device_type.secondary_data_v2 ?? '')}
									<TweenedValue
										value={device.latest_data[device.cw_device_type.secondary_data_v2]}
										format="decimal"
									/>
								{/if}
							</span>
							<small class="text-secondary-900">
								<sup>{device.cw_device_type.secondary_data_notation}</sup>
							</small>
						</p>
					{/if}
				</div>
			</div>
		</div>
	</div>
	{#if device.latest_data}
		<DeviceDataList {device} />
	{/if}
	<div
		class="border-l-8 pl-1 {device.upload_interval === -1
			? '!border-l-green-500'
			: device.latest_data
				? moment(device.latest_data.created_at).isBefore(
						moment().subtract(device.upload_interval, 'minutes')
					)
					? '!border-l-red-500'
					: '!border-l-green-500'
				: '!border-l-yellow-500'}"
	>
		{#if location}
			<Button
				on:click={() =>
					goto(`/app/location/${location.location_id}/devices/${device.dev_eui}/detail`)}
				variant="fill"
				color="info"
				class="mb-1 w-full"
				icon={mdiArrowRight}
			>
				{m.component_dataRowItem_detail_button()}
			</Button>
		{/if}
	</div>
</Collapse>

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
