<script lang="ts">
	import { nameToJapaneseName } from '$lib/utilities/nameToJapanese';
	import { mdiCalendar, mdiCheck, mdiClose } from '@mdi/js';
	import { Dialog, Icon, DateRange, Button, PeriodType, DateRangeField } from 'svelte-ux';

	let dateRangeDialog: boolean = $state(false);
	let selected: {
		from: Date | null;
		to: Date | null;
		periodType?: PeriodType | null;
	} = $state({
		from: new Date(),
		to: new Date()
	});

	// Create a custom event dispatcher
	const dispatch = $props<{
		onrangeselect: (range: {
			from: Date | null;
			to: Date | null;
			periodType?: PeriodType | null;
		}) => void;
	}>();

	function handleRangeSelect() {
		// Dispatch the custom event with the selected range
		dispatch.onrangeselect(selected);
		// Close the dialog
		dateRangeDialog = false;
	}
</script>

<Button
	icon={mdiCalendar}
	on:click={() => (dateRangeDialog = !dateRangeDialog)}
	variant="fill-light"
	rounded="full"
/>

<Dialog open={dateRangeDialog} on:close={() => (dateRangeDialog = false)}>
	<div slot="title" class="flex items-center gap-2">
		<Icon data={mdiCalendar} size="2em" variant="fill-fight" />
		<span>{nameToJapaneseName('Data Date Range')}</span>
	</div>

	<DateRange bind:selected />
	 <!-- <DateRangeField bind:selected /> -->

	<div slot="actions" class="flex gap-2">
		<Button
			variant="fill"
			icon={mdiClose}
			color="warning"
			on:click={() => (dateRangeDialog = false)}
		>
			{nameToJapaneseName('Close')}
		</Button>
		<Button
			type="button"
			variant="fill"
			icon={mdiCheck}
			color="success"
			on:click={handleRangeSelect}
		>
			{nameToJapaneseName('Load Selected Range')};
		</Button>
	</div>
</Dialog>
