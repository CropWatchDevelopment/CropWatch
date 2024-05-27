<script lang="ts">
	import { _ } from 'svelte-i18n';
	export let title;
	export let value;
	export let optimalValue;
	export let unit;

	const differenceValue = (value - optimalValue).toFixed(2);

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
			<p class="text-lg">{title}</p>
			{#if value != null && unit != null}<p class="text-3xl">{value}<span class="text-2xl">{unit}</span></p>{/if}
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
				<p
					class="text-sm {checkValue(differenceValue) == 'greater'
						? 'greater'
						: checkValue(differenceValue) == 'equal'
							? ''
							: 'less'}"
				>
					{differenceValue > 0 ? '+' : ''}{differenceValue}<span class="text-xs">{unit}</span>
				</p>
			</div>
		</div>
	{/if}
	<slot />
</div>

<style>
	.greater {
		color: #5bf7ac;
	}
	.less {
		color: #fe5e5e;
	}
</style>
