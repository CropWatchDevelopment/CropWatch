<script lang="ts">
	import Button from '$lib/components/UI/buttons/Button.svelte';
	import TextInput from '$lib/components/UI/form/TextInput.svelte';
	import MaterialIcon from '$lib/components/UI/icons/MaterialIcon.svelte';
	import { DateTime } from 'luxon';
	import { _ } from 'svelte-i18n';

	type Props = {
		startDateInput: Date;
		endDateInput: Date;
		loadingHistoricalData: boolean;
		error?: string;
		onDateChange: () => void;
	};

	let {
		startDateInput = $bindable(),
		endDateInput = $bindable(),
		loadingHistoricalData = false,
		error,
		onDateChange
	}: Props = $props();

	let startDateInputString = $state(startDateInput.toISOString().split('T')[0]);
	let endDateInputString = $state(endDateInput.toISOString().split('T')[0]);

	const handleDateChange = () => {
		if (startDateInput && endDateInput) {
			// Validate that end date is not in the future (allow today)
			debugger;
			const today = new Date();
			today.setHours(23, 59, 59, 999); // Set to end of today

			if (endDateInput > today) {
				error = 'End date cannot be in the future.';
				// Reset to today
				endDateInput = new Date();
				return;
			}

			// Validate that start date is not after end date
			if (startDateInput > endDateInput) {
				error = 'Start date cannot be after end date.';
				// Reset start date to match end date
				startDateInput = new Date(endDateInput);
				return;
			}

			// Clear any previous error
			error = undefined;
			// Call the parent's callback
			onDateChange();
		} else {
			error = 'Please select both start and end dates.';
		}
	};
</script>

<div class="flex flex-nowrap items-end justify-between gap-2">
	<!-- Date range selector -->
	<!-- <div class="flex flex-wrap items-end gap-2"> -->
	<div class="sm:order-1">
		<Button variant="tertiary" class="h-[45px] w-[25px]" iconic onclick={() => handleDateChange()}>
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
			onchange={() => {
				const newStartDate = new Date(startDateInputString);

				// Validate the date is not invalid
				if (isNaN(newStartDate.getTime())) {
					error = 'Invalid start date format.';
					return;
				}

				startDateInput = newStartDate;

				// If start date is after end date, adjust end date
				if (startDateInput > endDateInput) {
					endDateInput = new Date(startDateInput);
				}

				handleDateChange();
			}}
			max={endDateInputString}
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
			onchange={() => {
				const newEndDate = new Date(endDateInputString);

				// Validate the date is not invalid
				if (isNaN(newEndDate.getTime())) {
					error = 'Invalid end date format.';
					return;
				}

				// Check if end date is in the future
				const today = new Date();
				today.setHours(23, 59, 59, 999);

				if (newEndDate > today) {
					error = 'End date cannot be in the future.';
					// Reset to today
					endDateInput = new Date();
					return;
				}

				endDateInput = newEndDate;

				// If end date is before start date, adjust start date
				if (endDateInput < startDateInput) {
					startDateInput = new Date(endDateInput);
				}

				handleDateChange();
			}}
			min={startDateInputString}
			max={new Date().toISOString().split('T')[0]}
			class="relative flex w-full rounded border border-gray-300 bg-white px-2 py-2 pr-10 text-sm text-xl text-gray-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
		/>
	</div>

	<div class="sm:order-4">
		<Button
			class="h-[45px] w-[25px]"
			variant="tertiary"
			iconic
			disabled={new Date(endDateInput) >= DateTime.now().minus({ days: 1 }).toJSDate()}
			onclick={() => {
				let dayDiff = DateTime.fromJSDate(endDateInput).diff(
					DateTime.fromJSDate(startDateInput),
					'days'
				).days;
				startDateInput = DateTime.fromJSDate(startDateInput).plus({ days: dayDiff }).toJSDate();
				endDateInput = DateTime.fromJSDate(endDateInput).plus({ days: dayDiff }).toJSDate();
				handleDateChange();
			}}
		>
			<MaterialIcon name="fast_forward" />
		</Button>
	</div>
	{#if error}
		<p class="mt-2 text-sm text-red-600">{error}</p>
	{/if}
	<!-- </div> -->
</div>
