<script lang="ts">
	import { page } from '$app/stores';
	import { mdiCalendarRange, mdiFileExcel, mdiFilePdfBox } from '@mdi/js';
	import { subDays } from 'date-fns';
	import { Button, Card, DateRangeField, Icon, PeriodType, Tooltip } from 'svelte-ux';
	let today = new Date();
	let value = {
		from: subDays(today, 7),
		to: today,
		periodType: PeriodType.Day
	};
	const download = async (type: string) => {
		try {
			const response = await fetch(
				`/api/v1/devices/${$page.params.dev_eui}/data?firstDataDate=${value.from.toISOString()}&lastDataDate=${value.to.toISOString()}&${type}`
			);
			if (!response.ok) {
				throw new Error('Failed to fetch data');
			}
			const blob = await response.blob();
			debugger;
			const url = window.URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.href = url;

			// Set the file name based on the type
			if ((type = 'csv')) {
				link.download = 'report.xlsx';
			} else {
				link.download = 'report.pdf';
			}

			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			window.URL.revokeObjectURL(url);
		} catch (error) {
			console.error('Download failed', error);
		}
	};
</script>

<h1>Downloads:</h1>

<DateRangeField bind:value icon={mdiCalendarRange} />

<div class="my-4 grid w-full grid-flow-col grid-cols-2 gap-2">
	<Button
		on:click={() => {
			download('csv=1');
		}}
		icon={mdiFileExcel}
		variant="fill"
		classes={{ icon: 'text-[#177841]' }}>Download Excel</Button
	>
		<Button
			on:click={() => {
				download(1);
			}}
			icon={mdiFilePdfBox}
			variant="fill"
			disabled
			classes={{ icon: 'text-[#ed1c24]' }}>Download PDF (Future Feature)</Button
		>
</div>

<Card>
	<h2>Custom Reports:</h2>
	<p class="text-center">You have no custom reports. (Coming Soon)</p>
</Card>
