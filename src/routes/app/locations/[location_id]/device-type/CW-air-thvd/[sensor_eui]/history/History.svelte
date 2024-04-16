<script lang="ts">
	import { page } from '$app/stores';
	import { sensorDataState } from '$lib/stores/CW-SS-TMEPNPK';
	import { mdiCalendarRange, mdiDotsVertical, mdiDownload, mdiHistory } from '@mdi/js';
	import moment from 'moment';
	import {
		Avatar,
		Button,
		Card,
		DateRangeField,
		Header,
		Icon,
		ListItem,
		Menu,
		MenuItem,
		PeriodType,
		Toggle
	} from 'svelte-ux';
	import type { DateRange } from 'svelte-ux/utils/dateRange';

	let selectedDateRange: DateRange = {
		from: moment().startOf('day').toDate(),
		to: moment().endOf('day').toDate(),
		periodType: PeriodType.Day
	};
	$: data = $sensorDataState;

	const download = async () => {
		try {
			const response = await fetch(`/api/cw-air-thvd-data?dev_eui=${$page.params.sensor_eui}&from=${selectedDateRange.from}&to=${selectedDateRange.to}`);
			const blob = await response.blob();
			const url = URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.href = url;
			link.download = 'data.csv';
			link.click();
			URL.revokeObjectURL(url);
		} catch (error) {
			console.error('Error downloading file:', error);
		}
	};
</script>

<div class="m-4">
	<h2>History list</h2>

	<div class="grid grid-cols-2 gap-4">
		<DateRangeField bind:value={selectedDateRange} icon={mdiCalendarRange} />
		<Button variant="outline" icon={mdiDownload} on:click={() => download()}>Download</Button>
	</div>

</div>
