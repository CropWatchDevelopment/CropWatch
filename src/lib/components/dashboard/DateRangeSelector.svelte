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

	// Helpers to format/parse dates for <input type="date"> in LOCAL time
	function toInputDateString(d: Date): string {
		const y = d.getFullYear();
		const m = String(d.getMonth() + 1).padStart(2, '0');
		const day = String(d.getDate()).padStart(2, '0');
		return `${y}-${m}-${day}`;
	}
	function parseInputDateLocal(value: string): Date | null {
		if (!value) return null;
		const [y, m, d] = value.split('-').map(Number);
		if (!y || !m || !d) return null;
		return new Date(y, m - 1, d); // local midnight
	}

	// Ensure end defaults to end-of-today and start to 24h before end (only once at initial mount)
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

	let startDateInputString = $derived(toInputDateString(startDateInput));
	let endDateInputString = $derived(toInputDateString(endDateInput));
	const todayString = $derived(toInputDateString(new Date()));

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
				const parsed = parseInputDateLocal(startDateInputString);

				if (!parsed) {
					error = 'Invalid start date format.';
					return;
				}

				// Normalize start to start-of-day
				parsed.setHours(0, 0, 0, 0);
				startDateInput = parsed;

				// If start date is after end date, align end to end-of-day of start
				if (startDateInput > endDateInput) {
					const end = new Date(startDateInput);
					end.setHours(23, 59, 59, 999);
					endDateInput = end;
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
				const parsed = parseInputDateLocal(endDateInputString);
				if (!parsed) {
					return;
				}
				// Normalize end to end-of-day
				parsed.setHours(23, 59, 59, 999);

				// Cap to today end-of-day
				const todayEnd = new Date();
				todayEnd.setHours(23, 59, 59, 999);
				endDateInput = parsed > todayEnd ? todayEnd : parsed;

				// If end before start, align start to start-of-day of end
				if (endDateInput < startDateInput) {
					const start = new Date(endDateInput);
					start.setHours(0, 0, 0, 0);
					startDateInput = start;
				}

				handleDateChange();
			}}
			min={startDateInputString}
			max={todayString}
			class="relative flex w-full rounded border border-gray-300 bg-white px-2 py-2 pr-10 text-sm text-xl text-gray-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
		/>
	</div>

	<div class="sm:order-4">
		<Button
			class="h-[45px] w-[25px]"
			variant="tertiary"
			iconic
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
		<p class="mt-2 text-sm text-red-600">{error}</p>
	{/if}
	<!-- </div> -->
</div>
