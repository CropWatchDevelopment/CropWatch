<script lang="ts">
	import { page } from '$app/stores';
	import { PUBLIC_EXPORTS_CROPWATCH_API_URL } from '$env/static/public';
	import { nameToJapaneseName } from '$lib/utilities/nameToJapanese';
	import { PeriodType } from '@layerstack/utils';
	import { mdiCalendar, mdiCheck, mdiClose, mdiDownload, mdiMicrosoftExcel } from '@mdi/js';
	import { isAfter } from 'date-fns';
	import moment from 'moment';
	import { Dialog, Icon, DateRange, Button } from 'svelte-ux';
	let loading = $state(false);

	let dateRangeDialog: boolean = $state(false);
	let selected: {
		from: Date | null;
		to: Date | null;
		periodType?: PeriodType | null;
	} = $state({
		from: new Date(),
		to: new Date()
	});

	const handleRangeSelect = async (e) => {
		e.preventDefault();
		try {
			loading = true;
			const reportsApiEndpoint = `/api/export?devEui=${$page.params.dev_eui}&from=${moment(selected.from).format('YYYY-MM-DD')}&to=${moment(selected.to).format('YYYY-MM-DD')}`;
			const response = await fetch(reportsApiEndpoint, {
				method: 'GET',
				headers: {
					Accept: 'text/csv'
				}
			});
			debugger;
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			const contentType = response.headers.get('content-type');
			if (!contentType || !contentType.includes('text/csv')) {
				throw new Error('Received non-PDF response');
			}

			const blob = await response.blob();
			if (blob.size === 0) {
				throw new Error('No data found for the selected month.');
			}

			const url = window.URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.href = url;
			link.setAttribute(
				'download',
				`report-${moment(selected.from).format('YYYY-MM')}-${moment(selected.to).format('YYYY-MM')}.csv`
			);
			document.body.appendChild(link);
			link.click();
			link.remove();
			window.URL.revokeObjectURL(url); // Clean up
			dateRangeDialog = false; // Close dialog after successful download
		} catch (error) {
			console.error('Error downloading report:', error);
			alert(error.message || 'Error downloading report');
		} finally {
			loading = false;
		}
	};
</script>

<Button
	icon={mdiMicrosoftExcel}
	on:click={() => (dateRangeDialog = !dateRangeDialog)}
	variant="fill-light"
	rounded="full"
/>

<Dialog open={dateRangeDialog} on:close={() => (dateRangeDialog = false)}>
	<div slot="title" class="flex items-center gap-2">
		<Icon data={mdiCalendar} size="2em" variant="fill-fight" />
		<span>Export CSV Data</span>
	</div>

	<DateRange
		bind:selected
		disabledDates={(date) => isAfter(date, new Date())}
		periodTypes={[PeriodType.Day]}
		getPeriodTypePresets={() => []}
	/>

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
			icon={mdiDownload}
			color="success"
			{loading}
			on:click={handleRangeSelect}
		>
			{nameToJapaneseName('Download CSV')}
		</Button>
	</div>
</Dialog>
