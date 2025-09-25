<script lang="ts">
	import { goto } from '$app/navigation';
	import type { Device } from '$lib/models/Device';
	import type { Location } from '$lib/models/Location';
	import { nameToEmoji } from '$lib/utilities/NameToEmoji';
	import { formatNumber } from '$lib/utilities/stats';
	import { mdiArrowDown, mdiArrowRight, mdiArrowUp } from '@mdi/js';
	import { _ } from 'svelte-i18n';
	import Collapse from '$lib/components/ui/base/Collapse.svelte';
	import Button from '$lib/components/UI/buttons/Button.svelte';
	import type { Database } from '../../../../../database.types';

	type deviceType = Database['public']['Tables']['cw_devices']['Row'];

	let { device, location, isActive, detailHref, children } = $props<{
		device: Device & {
			cw_device_type: deviceType;
			primaryValue?: number;
			secondaryValue?: number;
			primaryDataKey?: string;
			secondaryDataKey?: string;
			primaryNotation?: string;
			secondaryNotation?: string;
			latestData: Record<string, any>;
		};
		location?: Location;
		isActive?: boolean;
		detailHref?: string;
		children?: any; // snippet passed by parent
	}>();

	let localStorageOpenState =
		typeof localStorage !== 'undefined'
			? localStorage.getItem(`${device.dev_eui}-collapseState`)
			: null;
	let defaultCollapse = $state(localStorageOpenState ? JSON.parse(localStorageOpenState) : false);
	function collapseStateChange(e: CustomEvent) {
		defaultCollapse = e.detail.open;
		if (typeof localStorage !== 'undefined')
			localStorage.setItem(`${device.dev_eui}-collapseState`, JSON.stringify(e.detail.open));
	}
</script>

{#snippet triggerSnippet()}
	<div class="relative flex flex-1 shadow-md" role="listitem">
		<div
			class="absolute top-0 bottom-0 left-0 my-1 w-1.5 rounded-full opacity-70 transition-all duration-200"
			class:bg-blue-300={isActive === null}
			class:bg-green-500={isActive === true}
			class:bg-red-500={isActive === false}
			role="button"
		></div>
		<div class="my-1 mr-2 ml-2 flex-1 border-r-2">
			<div class="flex w-full flex-row text-base">
				<div class="justify-left flex flex-row pl-0">
					<b class="ml-4 pb-1 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300"
						>{device.name || `Device ${device.dev_eui}`}</b
					>
				</div>
				<div class="flex w-full flex-col flex-row justify-between justify-center space-x-5">
					{#if device.cw_device_type?.primary_data_notation}
						<div class="flex items-center">
							<span class="mr-1.5 text-lg text-gray-600 dark:text-gray-400">
								{nameToEmoji(device.cw_device_type?.primary_data_v2)}
							</span>
							<div class="flex flex-col items-start">
								<span
									class="text-lg leading-tight font-bold whitespace-nowrap text-gray-900 dark:text-white"
								>
									{formatNumber({
										key: device.cw_device_type?.primary_data_v2,
										value: device.latestData[device.cw_device_type?.primary_data_v2]
									})}
									<span
										class="text-accent-700 dark:text-accent-400 ml-0.5 align-top text-xs font-normal"
										>{device.cw_device_type?.primary_data_notation}</span
									>
								</span>
							</div>
						</div>
						{#if device.cw_device_type?.secondary_data_notation}
							<span class="flex flex-grow-[0.2]"></span>
							<div class="flex items-center">
								<span class="mr-1.5 text-lg text-gray-600 dark:text-gray-400"
									>{nameToEmoji(device.cw_device_type?.secondary_data_v2)}</span
								>
								<div class="no-wrap flex flex-col items-start">
									<span
										class="flex flex-nowrap items-baseline text-lg leading-tight font-bold text-gray-900 dark:text-white"
									>
										<span
											>{formatNumber({
												key: device.cw_device_type?.secondary_data_v2,
												value: device.latestData[device.cw_device_type?.secondary_data_v2]
											})}</span
										>
										<span class="text-accent-700 dark:text-accent-400 ml-0.5 text-xs font-normal"
											>{device.cw_device_type?.secondary_data_notation}</span
										>
									</span>
								</div>
							</div>
						{/if}
					{/if}
				</div>
			</div>
		</div>
		<div class="flex items-center pr-2">
			<svg
				viewBox="0 0 24 24"
				class="h-5 w-5 text-gray-600 dark:text-gray-400"
				fill="currentColor"
				aria-hidden="true"
			>
				{#if defaultCollapse}
					<path d={mdiArrowUp} />
				{:else}
					<path d={mdiArrowDown} />
				{/if}
			</svg>
		</div>
	</div>
{/snippet}

{#snippet collapseChildren()}
	<div class="space-y-2">
		{#if children}
			{@render children()}
		{/if}
		{#if detailHref || location}
			<Button
				variant="secondary"
				size="sm"
				class="w-full justify-center"
				onclick={() =>
					goto(`/app/dashboard/location/${device.location_id}/devices/${device.dev_eui}`)}
			>
				<span class="flex items-center gap-2">
					{$_('View Details')}
					<svg viewBox="0 0 24 24" class="h-5 w-5" fill="currentColor" aria-hidden="true">
						<path d={mdiArrowRight} />
					</svg>
				</span>
			</Button>
		{/if}
	</div>
{/snippet}

<Collapse
	classes={{
		root: 'mb-1 bg-gray-200 dark:bg-gray-800/30 w-full ',
		icon: 'text-gray-600 dark:text-gray-500 data-[open=true]:rotate-90'
	}}
	open={defaultCollapse}
	on:change={(e) => collapseStateChange(e)}
	trigger={triggerSnippet}
	children={collapseChildren}
/>
