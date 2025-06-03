<script lang="ts">
	import { DateRangePicker, type DateRange } from "bits-ui";
	// import { CalendarDateTime } from "@internationalized/date";
	// import type { DateValue } from "@internationalized/date";
	import CalendarIcon from "$lib/components/UI/icons/CalendarIcon.svelte";
	import ChevronLeftIcon from "$lib/components/UI/icons/ChevronLeftIcon.svelte";
	import ChevronRightIcon from "$lib/components/UI/icons/ChevronRightIcon.svelte";
	
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
		disabled={disabled}
		weekdayFormat="short"
		fixedWeeks={true}
		closeOnRangeSelect={true}
		class="flex w-full flex-col gap-1.5"
	>
		<DateRangePicker.Label class="block text-sm font-medium mb-1">
			{label}
		</DateRangePicker.Label>
		
		<div class="date-field flex w-full items-center rounded border border-gray-300 px-2 py-1.5 text-sm focus-within:border-primary hover:border-gray-400">
			{#each ["start", "end"] as type}
				<DateRangePicker.Input {type} class="flex">
					{#snippet children({ segments })}
						{#each segments as { part, value }, i (part + i)}
							<div class="inline-block">
								{#if part === "literal"}
									<DateRangePicker.Segment {part} class="text-gray-500 px-1">
										{value}
									</DateRangePicker.Segment>
								{:else}
									<DateRangePicker.Segment 
										{part} 
										class="px-1 py-0.5 rounded hover:bg-gray-100 focus:bg-gray-100 
											aria-[valuetext=Empty]:text-gray-400"
									>
										{value}
									</DateRangePicker.Segment>
								{/if}
							</div>
						{/each}
					{/snippet}
				</DateRangePicker.Input>
				
				{#if type === "start"}
					<div aria-hidden="true" class="text-gray-500 px-1">to</div>
				{/if}
			{/each}
			
			<DateRangePicker.Trigger class="ml-auto flex items-center justify-center h-6 w-6 rounded hover:bg-gray-100">
				<CalendarIcon />
			</DateRangePicker.Trigger>
		</div>
		
		<DateRangePicker.Content 
			sideOffset={6} 
			class="z-50 bg-white rounded-md border border-gray-200 shadow-md p-4"
		>
			<DateRangePicker.Calendar class="select-none">
				{#snippet children({ months, weekdays })}
					<DateRangePicker.Header class="flex items-center justify-between mb-4">
						<DateRangePicker.PrevButton class="flex items-center justify-center h-7 w-7 rounded hover:bg-gray-100">
							<!-- <ChevronLeftIcon /> -->
						</DateRangePicker.PrevButton>
						
						<DateRangePicker.Heading class="text-sm font-medium" />
						
						<DateRangePicker.NextButton class="flex items-center justify-center h-7 w-7 rounded hover:bg-gray-100">
							<!-- <ChevronRightIcon /> -->
						</DateRangePicker.NextButton>
					</DateRangePicker.Header>
					
					<div class="flex flex-col space-y-4 pt-1 sm:flex-row sm:space-x-4 sm:space-y-0">
						{#each months as month (month.value)}
							<DateRangePicker.Grid class="w-full border-collapse space-y-1">
								<DateRangePicker.GridHead>
									<DateRangePicker.GridRow class="mb-1 flex w-full justify-between">
										{#each weekdays as day (day)}
											<DateRangePicker.HeadCell class="text-gray-500 w-8 text-center text-xs">
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
													class="relative m-0 p-0 w-8 text-center text-sm"
												>
													<DateRangePicker.Day
														class="
															inline-flex items-center justify-center w-8 h-8 rounded-full 
															hover:bg-gray-100
															data-selected:bg-primary data-selected:text-white
															data-selection-start:bg-primary data-selection-start:text-white
															data-selection-end:bg-primary data-selection-end:text-white
															data-highlighted:bg-gray-100
															data-today:font-bold
															data-disabled:opacity-50
															data-outside-month:opacity-40
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
	
	.date-range-picker :global([data-selected]:not([data-selection-start]):not([data-selection-end])) {
		border-radius: 0;
	}
</style>