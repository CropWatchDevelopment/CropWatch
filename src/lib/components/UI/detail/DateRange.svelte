<script lang="ts">
	import { DateRangePicker, type DateRange } from 'bits-ui';
	// import { CalendarDateTime } from "@internationalized/date";
	// import type { DateValue } from "@internationalized/date";
	import CalendarIcon from '$lib/components/UI/icons/CalendarIcon.svelte';
	import ChevronLeftIcon from '$lib/components/UI/icons/ChevronLeftIcon.svelte';
	import ChevronRightIcon from '$lib/components/UI/icons/ChevronRightIcon.svelte';

	// Define props for component
	let { startDate, endDate, label, disabled } = $props();

	// Setup internal reactive state
	let dateRange = $state<DateRange>({
		start: startDate,
		end: endDate
	});

	// Update parent component when date range changes
	$effect(() => {
		startDate = dateRange?.start;
		endDate = dateRange?.end;
	});

	// Update internal state when props change
	$effect(() => {
		if (startDate !== dateRange?.start || endDate !== dateRange?.end) {
			dateRange = {
				start: startDate,
				end: endDate
			};
		}
	});

	// Function binding for fully controlled state management
	function getValue() {
		return dateRange;
	}

	function setValue(newValue: DateRange) {
		dateRange = newValue;
	}

	// Open state management
	let isOpen = $state(false);
</script>

<div class="date-range-picker">
	<DateRangePicker.Root
		bind:value={getValue, setValue}
		bind:open={isOpen}
		{disabled}
		weekdayFormat="short"
		fixedWeeks={true}
		closeOnRangeSelect={true}
		class="flex w-full flex-col gap-1.5"
	>
		<DateRangePicker.Label class="mb-1 block text-sm font-medium">
			{label}
		</DateRangePicker.Label>

		<div
			class="date-field flex w-full items-center rounded border border-[var(--color-border-subtle)] bg-[var(--color-card)] px-2 py-1.5 text-sm text-[var(--color-text)] shadow-sm focus-within:border-[var(--color-primary)] focus-within:ring-1 focus-within:ring-[var(--color-primary)] hover:border-[var(--color-border)]"
		>
			{#each ['start', 'end'] as const as type}
				<DateRangePicker.Input {type} class="flex">
					{#snippet children({ segments })}
						{#each segments as { part, value }, i (part + i)}
							<div class="inline-block">
								{#if part === 'literal'}
									<DateRangePicker.Segment {part} class="px-1 text-[var(--color-text-muted)]">
										{value}
									</DateRangePicker.Segment>
								{:else}
									<DateRangePicker.Segment
										{part}
										class="rounded px-1 py-0.5 hover:bg-[var(--color-surface-emphasis)] focus:bg-[var(--color-surface-emphasis)]
											aria-[valuetext=Empty]:text-[var(--color-text-muted)]"
									>
										{value}
									</DateRangePicker.Segment>
								{/if}
							</div>
						{/each}
					{/snippet}
				</DateRangePicker.Input>

				{#if type === 'start'}
					<div aria-hidden="true" class="px-1 text-[var(--color-text-muted)]">to</div>
				{/if}
			{/each}

			<DateRangePicker.Trigger
				class="ml-auto flex h-6 w-6 items-center justify-center rounded hover:bg-[var(--color-surface-emphasis)]"
			>
				<CalendarIcon />
			</DateRangePicker.Trigger>
		</div>

		<DateRangePicker.Content
			sideOffset={6}
			class="z-50 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-lg"
		>
			<DateRangePicker.Calendar class="select-none">
				{#snippet children({ months, weekdays })}
					<DateRangePicker.Header
						class="mb-4 flex items-center justify-between text-[var(--color-text)]"
					>
						<DateRangePicker.PrevButton
							class="flex h-7 w-7 items-center justify-center rounded hover:bg-[var(--color-surface-emphasis)]"
						>
							<!-- <ChevronLeftIcon /> -->
						</DateRangePicker.PrevButton>

						<DateRangePicker.Heading class="text-sm font-medium text-[var(--color-text)]" />

						<DateRangePicker.NextButton
							class="flex h-7 w-7 items-center justify-center rounded hover:bg-[var(--color-surface-emphasis)]"
						>
							<!-- <ChevronRightIcon /> -->
						</DateRangePicker.NextButton>
					</DateRangePicker.Header>

					<div class="flex flex-col space-y-4 pt-1 sm:flex-row sm:space-y-0 sm:space-x-4">
						{#each months as month (month.value)}
							<DateRangePicker.Grid class="w-full border-collapse space-y-1">
								<DateRangePicker.GridHead>
									<DateRangePicker.GridRow class="mb-1 flex w-full justify-between">
										{#each weekdays as day (day)}
											<DateRangePicker.HeadCell
												class="w-8 text-center text-xs text-[var(--color-text-muted)]"
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
													class="relative m-0 w-8 p-0 text-center text-sm"
												>
													<DateRangePicker.Day
														class="
															inline-flex h-8 w-8 items-center justify-center rounded-full 
															hover:bg-[var(--color-surface-emphasis)]
															data-disabled:opacity-50 data-highlighted:bg-[var(--color-surface-emphasis)]
															data-outside-month:opacity-40 data-selected:bg-[var(--color-primary)]
															data-selected:text-white data-selection-end:bg-[var(--color-primary)]
															data-selection-end:text-white
															data-selection-start:bg-[var(--color-primary)]
															data-selection-start:text-white
															data-today:font-bold
														"
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

<style>
	.date-range-picker :global([data-selection-start]:not([data-selection-end])),
	.date-range-picker :global([data-selection-end]:not([data-selection-start])) {
		border-radius: 9999px;
	}

	.date-range-picker
		:global([data-selected]:not([data-selection-start]):not([data-selection-end])) {
		border-radius: 0;
	}
</style>
