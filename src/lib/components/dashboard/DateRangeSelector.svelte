<script lang="ts">
	import Button from '$lib/components/UI/buttons/Button.svelte';
	import TextInput from '$lib/components/UI/form/TextInput.svelte';
	import MaterialIcon from '$lib/components/UI/icons/MaterialIcon.svelte';
	import { DateTime } from 'luxon';
	import { _ } from 'svelte-i18n';

	type Props = {
		startDateInputString: string;
		endDateInputString: string;
		loadingHistoricalData: boolean;
		error?: string;
		onDateChange: () => void;
	};

	let {
		startDateInputString = $bindable(),
		endDateInputString = $bindable(),
		onDateChange,
		loadingHistoricalData,
		error
	}: Props = $props();
</script>

<div class="flex flex-nowrap items-end justify-between gap-2">
	<!-- Date range selector -->
	<!-- <div class="flex flex-wrap items-end gap-2"> -->
	<div class="sm:order-1">
		<Button variant="tertiary" class="h-[45px] w-[25px]" iconic onclick={() => onDateChange()}>
			<MaterialIcon name="fast_rewind" />
		</Button>
	</div>
	<!-- Date inputs -->
	<div class="flex w-full flex-col sm:order-2">
		<label for="startDate" class="mb-1 text-xs text-gray-600 dark:text-gray-400">
			{$_('Start Date:')}
		</label>
		<TextInput
			id="startDate"
			type="date"
			bind:value={startDateInputString}
			max={endDateInputString}
			onclick={() => onDateChange()}
			class="relative flex w-full rounded border border-gray-300 bg-white px-2 py-2 pr-10 text-sm text-xl text-gray-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
		/>
	</div>
	<div class="flex w-full flex-col sm:order-3">
		<label for="endDate" class="mb-1 text-xs text-gray-600 dark:text-gray-400">
			{$_('End Date:')}
		</label>
		<TextInput
			id="endDate"
			type="date"
			bind:value={endDateInputString}
			min={startDateInputString}
			max={new Date().toISOString().split('T')[0]}
			onclick={() => onDateChange()}
			class="relative flex w-full rounded border border-gray-300 bg-white px-2 py-2 pr-10 text-sm text-xl text-gray-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
		/>
	</div>
	<!-- <div class="sm:order-5">
			<Button
				variant="tertiary"
				iconic
				onclick={() => handleDateRangeSubmit()}
				disabled={loadingHistoricalData}
			>
				<MaterialIcon name="refresh" aria-label={$_('refresh')} />
			</Button>
		</div> -->

	<div class="sm:order-4">
		<Button
			class="h-[45px] w-[25px]"
			variant="tertiary"
			iconic
			disabled={new Date(endDateInputString) >= DateTime.now().minus({ days: 1 }).toJSDate()}
			onclick={() => handleDateRangeSubmit(1)}
		>
			<MaterialIcon name="fast_forward" />
		</Button>
	</div>
	{#if error}
		<p class="mt-2 text-sm text-red-600">{'error'}</p>
	{/if}
	<!-- </div> -->
</div>
