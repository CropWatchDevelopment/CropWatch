<script lang="ts">
	import Button from '$lib/components/UI/buttons/Button.svelte';
	import TextInput from '$lib/components/UI/form/TextInput.svelte';
	import MaterialIcon from '$lib/components/UI/icons/MaterialIcon.svelte';
	import { DateTime } from 'luxon';
	import { _ } from 'svelte-i18n';

	type Props = {
		startDateInputString: string;
		endDateInputString: string;
		handleDateRangeSubmit: (units?: number) => void;
		loadingHistoricalData: boolean;
		error?: string;
	};

	let {
		startDateInputString = $bindable(),
		endDateInputString = $bindable(),
		handleDateRangeSubmit,
		loadingHistoricalData,
		error
	}: Props = $props();
</script>

<div class="flex flex-wrap items-end gap-2 sm:flex-row-reverse">
	<!-- Date range selector -->
	<div class="flex flex-wrap items-end gap-2">
		<!-- Date inputs -->
		<div class="flex flex-col sm:order-2">
			<label for="startDate" class="mb-1 text-xs text-gray-600 dark:text-gray-400">
				{$_('Start Date:')}
			</label>
			<TextInput
				id="startDate"
				type="date"
				bind:value={startDateInputString}
				max={endDateInputString}
				class="text-sm"
			/>
		</div>
		<div class="flex flex-col sm:order-3">
			<label for="endDate" class="mb-1 text-xs text-gray-600 dark:text-gray-400">
				{$_('End Date:')}
			</label>
			<TextInput
				id="endDate"
				type="date"
				bind:value={endDateInputString}
				min={startDateInputString}
				max={new Date().toISOString().split('T')[0]}
				class="text-sm"
			/>
		</div>
		<div class="sm:order-5">
			<Button
				variant="tertiary"
				iconic
				onclick={() => handleDateRangeSubmit()}
				disabled={loadingHistoricalData}
			>
				<MaterialIcon name="refresh" aria-label={$_('refresh')} />
			</Button>
		</div>
		<div class="flex gap-2 sm:contents">
			<div class="sm:order-1">
				<Button variant="tertiary" iconic onclick={() => handleDateRangeSubmit(-1)}>
					<MaterialIcon name="fast_rewind" />
				</Button>
			</div>
			<div class="sm:order-4">
				<Button
					variant="tertiary"
					iconic
					disabled={new Date(endDateInputString) >= DateTime.now().minus({ days: 1 }).toJSDate()}
					onclick={() => handleDateRangeSubmit(1)}
				>
					<MaterialIcon name="fast_forward" />
				</Button>
			</div>
		</div>
		{#if error}
			<p class="mt-2 text-sm text-red-600">{'error'}</p>
		{/if}
	</div>
</div>
