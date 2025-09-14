<script lang="ts">
	import Button from '$lib/components/UI/buttons/Button.svelte';
	import MaterialIcon from '$lib/components/UI/icons/MaterialIcon.svelte';
	import { DateRangePicker } from 'bits-ui';
	import { CalendarDate, CalendarDateTime } from '@internationalized/date';
	import { DateTime } from 'luxon';
	import { _ } from 'svelte-i18n';
	import type { DateRange } from 'bits-ui';

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

	// Helper functions to convert between Date and @internationalized/date
	function dateToCalendarDate(date: Date): CalendarDate {
		return new CalendarDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
	}

	function calendarDateToDate(calendarDate: CalendarDate, setToEndOfDay = false): Date {
		const date = new Date(calendarDate.year, calendarDate.month - 1, calendarDate.day);
		if (setToEndOfDay) {
			date.setHours(23, 59, 59, 999);
		} else {
			date.setHours(0, 0, 0, 0);
		}
		return date;
	}

	// Initialize dates - ensure end defaults to end-of-today and start to 24h before end
	let __initialized = $state(false);
	$effect(() => {
		if (!__initialized) {
			const end = new Date();
			end.setHours(23, 59, 59, 999); // end of current local day
			endDateInput = end;
			startDateInput = new Date(end.getTime() - 24 * 60 * 60 * 1000);
			__initialized = true;
		}
	});

	// Convert Date objects to DateRange for Bits UI
	let dateRangeValue = $state<DateRange | undefined>(undefined);

	// Sync the DateRange value with Date props
	$effect(() => {
		if (startDateInput && endDateInput) {
			dateRangeValue = {
				start: dateToCalendarDate(startDateInput),
				end: dateToCalendarDate(endDateInput)
			};
		}
	});

	// Handle date range changes from Bits UI
	function handleValueChange(newValue: DateRange | undefined) {
		if (newValue?.start && newValue?.end) {
			startDateInput = calendarDateToDate(newValue.start, false);
			endDateInput = calendarDateToDate(newValue.end, true);
			error = undefined;
			onDateChange();
		}
	}

	const handleDateChange = () => {
		if (startDateInput && endDateInput) {
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
	<!-- Previous date range button -->
	<div class="sm:order-1">
		<Button
			variant="tertiary"
			class="h-[45px] w-[25px]"
			onclick={() => {
				let dayDiff = DateTime.fromJSDate(endDateInput).diff(
					DateTime.fromJSDate(startDateInput),
					'days'
				).days;
				startDateInput = DateTime.fromJSDate(startDateInput).minus({ days: dayDiff }).toJSDate();
				endDateInput = DateTime.fromJSDate(endDateInput).minus({ days: dayDiff }).toJSDate();
				handleDateChange();
			}}
		>
			<MaterialIcon name="fast_rewind" />
		</Button>
	</div>

	<!-- Bits UI DateRangePicker -->
	<div class="flex w-full flex-col sm:order-2">
		<DateRangePicker.Root
			bind:value={dateRangeValue}
			onValueChange={handleValueChange}
			weekdayFormat="short"
			fixedWeeks={true}
			pagedNavigation={true}
			maxValue={dateToCalendarDate(new Date())}
			class="flex w-full flex-col gap-1.5"
		>
			<!-- <DateRangePicker.Label class="text-xs text-gray-600 dark:text-gray-400">
				{$_('Date Range:')}
			</DateRangePicker.Label> -->

			<div
				class="relative flex w-full rounded border border-gray-300 bg-white px-2 py-1 text-lg text-gray-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
			>
				{#each ['start', 'end'] as const as type (type)}
					<DateRangePicker.Input {type}>
						{#snippet children({ segments })}
							{#each segments as { part, value }, i (part + i)}
								<div class="inline-block select-none">
									{#if part === 'literal'}
										<DateRangePicker.Segment {part} class="p-1 text-gray-500 dark:text-gray-400">
											{value}
										</DateRangePicker.Segment>
									{:else}
										<DateRangePicker.Segment
											{part}
											class="rounded px-1 py-1 hover:bg-gray-100 focus:bg-gray-100 focus:text-gray-900 focus-visible:ring-0! focus-visible:ring-offset-0! aria-[valuetext=Empty]:text-gray-400 dark:hover:bg-zinc-700 dark:focus:bg-zinc-700 dark:focus:text-white dark:aria-[valuetext=Empty]:text-gray-500"
										>
											{value}
										</DateRangePicker.Segment>
									{/if}
								</div>
							{/each}
						{/snippet}
					</DateRangePicker.Input>
					{#if type === 'start'}
						<div aria-hidden="true" class="px-1 text-gray-500 dark:text-gray-400">–</div>
					{/if}
				{/each}

				<DateRangePicker.Trigger
					class="ml-auto inline-flex size-8 items-center justify-center rounded text-gray-600 transition-all hover:bg-gray-100 active:bg-gray-200 dark:text-gray-400 dark:hover:bg-zinc-700 dark:active:bg-zinc-600"
				>
					<MaterialIcon name="calendar_month" />
				</DateRangePicker.Trigger>
			</div>

			<DateRangePicker.Content sideOffset={6} class="z-50">
				<DateRangePicker.Calendar
					class="mt-2 rounded-lg border border-gray-300 bg-white p-4 shadow-lg dark:border-zinc-700 dark:bg-zinc-800"
				>
					{#snippet children({ months, weekdays })}
						<DateRangePicker.Header class="mb-4 flex items-center justify-between">
							<DateRangePicker.PrevButton
								class="inline-flex size-8 items-center justify-center rounded transition-all hover:bg-gray-100 dark:hover:bg-zinc-700"
							>
								<MaterialIcon name="chevron_left" />
							</DateRangePicker.PrevButton>
							<DateRangePicker.Heading class="text-sm font-medium text-gray-900 dark:text-white" />
							<DateRangePicker.NextButton
								class="inline-flex size-8 items-center justify-center rounded transition-all hover:bg-gray-100 dark:hover:bg-zinc-700"
							>
								<MaterialIcon name="chevron_right" />
							</DateRangePicker.NextButton>
						</DateRangePicker.Header>

						<div class="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4">
							{#each months as month (month.value)}
								<DateRangePicker.Grid class="w-full border-collapse space-y-1 select-none">
									<DateRangePicker.GridHead>
										<DateRangePicker.GridRow class="mb-1 flex w-full justify-between">
											{#each weekdays as day (day)}
												<DateRangePicker.HeadCell
													class="w-8 rounded text-center text-xs font-normal! text-gray-600 dark:text-gray-400"
												>
													<div>{day.slice(0, 2)}</div>
												</DateRangePicker.HeadCell>
											{/each}
										</DateRangePicker.GridRow>
									</DateRangePicker.GridHead>
									<DateRangePicker.GridBody>
										{#each month.weeks as weekDates (weekDates)}
											<DateRangePicker.GridRow class="flex w-full">
												{#each weekDates as date (date)}
													<DateRangePicker.Cell
														{date}
														month={month.value}
														class="relative m-0 size-8 overflow-visible p-0! text-center text-sm focus-within:relative focus-within:z-20"
													>
														<DateRangePicker.Day
															class="size-8 rounded border border-transparent text-xs font-normal text-gray-900 transition-all hover:border-gray-900 focus-visible:ring-1 focus-visible:ring-gray-900 focus-visible:ring-offset-1 data-disabled:pointer-events-none data-disabled:text-gray-400 data-highlighted:rounded-none data-highlighted:bg-gray-100 data-outside-month:pointer-events-none data-selected:bg-gray-100 data-selected:font-medium data-selected:text-gray-900 data-selection-end:rounded data-selection-end:bg-gray-900 data-selection-end:font-medium data-selection-end:text-white data-selection-start:rounded data-selection-start:bg-gray-900 data-selection-start:font-medium data-selection-start:text-white data-selection-start:focus-visible:ring-2 data-selection-start:focus-visible:ring-offset-2! data-unavailable:text-gray-400 data-unavailable:line-through dark:text-white dark:hover:border-white dark:focus-visible:ring-white! dark:data-disabled:text-gray-500 dark:data-highlighted:bg-zinc-700 dark:data-selected:bg-zinc-700 dark:data-selected:text-white dark:data-selection-end:bg-white dark:data-selection-end:text-gray-900 dark:data-selection-start:bg-white dark:data-selection-start:text-gray-900 dark:data-unavailable:text-gray-500 data-selected:[&:not([data-selection-start])]:[&:not([data-selection-end])]:rounded-none data-selected:[&:not([data-selection-start])]:[&:not([data-selection-end])]:focus-visible:ring-0!"
														>
															{date.day}
														</DateRangePicker.Day>
													</DateRangePicker.Cell>
												{/each}
											</DateRangePicker.GridRow>
										{/each}
									</DateRangePicker.GridBody>
								</DateRangePicker.Grid>
							{/each}
						</div>
					{/snippet}
				</DateRangePicker.Calendar>
			</DateRangePicker.Content>
		</DateRangePicker.Root>
	</div>

	<!-- Next date range button -->
	<div class="sm:order-4">
		<Button
			class="mr-2 h-[45px] w-[25px]"
			variant="tertiary"
			disabled={endDateInput >= new Date(new Date().setHours(23, 59, 59, 999))}
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
		<p class="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
	{/if}
</div>
