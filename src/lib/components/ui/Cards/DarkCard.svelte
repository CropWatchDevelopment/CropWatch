<script lang="ts">
	import { _ } from 'svelte-i18n';
	export let title: string | null = null;
	export let value: number | string | null = null;
	export let optimalValue: number | string | null = null;
	export let unit: string | null = null;

	// const differenceValue = value ? (+value - +(optimalValue ?? 0)).toFixed(2) : null;

	function checkValue(value: number) {
		if (value > 0) {
			return 'greater';
		} else if (value == 0) {
			return 'equal';
		} else {
			return 'less';
		}
	}
</script>

<div class="bg-[#34393f] bg-opacity-50 rounded-xl py-5 px-2 text-surface-100 my-3">
	{#if title}
		<div class="flex justify-between items-center">
			<p class="text-2xl">{title}</p>
			{#if value != null && unit != null}<p class="text-3xl">
					{value}<span class="text-2xl">{unit}</span>
				</p>{/if}
		</div>
	{/if}
	{#if optimalValue}
		<div class="mt-4 text-[#C3C3C3] space-y-1 text-left">
			<div class="flex justify-between">
				<p class="text-sm">{$_('optimal')}</p>
				<p class="text-sm">{optimalValue}<span class="text-xs">{unit}</span></p>
			</div>
			<div class="flex justify-between">
				<p class="text-sm">{$_('difference')}</p>
			</div>
		</div>
	{/if}
	<div class="mt-5">
		<slot />
	</div>
</div>

<style>
	.greater {
		color: #5bf7ac;
	}
	.less {
		color: #fe5e5e;
	}
</style>