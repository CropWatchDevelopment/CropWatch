<script lang="ts">
	import { page } from '$app/stores';
	import { mdiCalendarRange, mdiFileExcel, mdiFilePdfBox } from '@mdi/js';
	import { subDays } from 'date-fns';
	import { Button, Card, DateRangeField, PeriodType } from 'svelte-ux';
	import { _ } from 'svelte-i18n';

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

<h1>{$_('devices.history.title')}:</h1>

<DateRangeField bind:value icon={mdiCalendarRange} />

<div class="my-4 grid w-full grid-flow-col grid-cols-2 gap-2">
	<Button
		on:click={() => {
			download('csv=1');
		}}
		icon={mdiFileExcel}
		variant="fill"
		classes={{ icon: 'text-[#177841]' }}>
		{$_('devices.history.downloadExcel')}
		</Button
	>
		<Button
			on:click={() => {
				download(1);
			}}
			icon={mdiFilePdfBox}
			variant="fill"
			disabled
			classes={{ icon: 'text-[#ed1c24]' }}>{$_('devices.history.downloadPDF')}</Button
		>
</div>

<Card>
	<h2>{$_('devices.history.customReports')}:</h2>
	<p class="text-center">{$_('devices.history.noCustomReports')}</p>
</Card>
