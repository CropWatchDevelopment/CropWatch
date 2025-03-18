<script lang="ts">
	import { PUBLIC_DOMAIN } from '$env/static/public';
	import { mdiFileDocument } from '@mdi/js';
	import { startOfYear } from 'date-fns';
	import moment from 'moment';
	import { Button, Dialog, MonthListByYear } from 'svelte-ux';

	let { devEui } = $props();

	let open: boolean = $state(false);
	let selectedDate: Date = $state(new Date());
	let loading: boolean = $state(false);

	const getReportFromCropWatchAPI = async (e) => {
		e.preventDefault();
		try {
			loading = true;
			const reportsApiEndpoint = `${PUBLIC_DOMAIN}/api/reports?date=${moment(selectedDate).format('YYYY-MM-DD')}&devEui=${devEui}`;
			const response = await fetch(reportsApiEndpoint, {
				method: 'GET',
				headers: {
					Accept: 'application/pdf'
				}
			});
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			const contentType = response.headers.get('content-type');
			if (!contentType || !contentType.includes('application/pdf')) {
				throw new Error('Received non-PDF response');
			}

			const blob = await response.blob();
			if (blob.size === 0) {
				throw new Error('No data found for the selected month.');
			}

			const url = window.URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.href = url;
			link.setAttribute('download', `report-${moment(selectedDate).format('YYYY-MM')}.pdf`);
			document.body.appendChild(link);
			link.click();
			link.remove();
			window.URL.revokeObjectURL(url); // Clean up
			open = false; // Close dialog after successful download
		} catch (error) {
			console.error('Error downloading report:', error);
			alert(error.message || 'Error downloading report');
		} finally {
			loading = false;
		}
	};
</script>

<Button icon={mdiFileDocument} variant="fill-light" rounded="full" on:click={() => (open = true)}
></Button>

<Dialog bind:open on:close={() => (open = false)}>
	<div slot="title">Select the month you want to generate a report for.</div>
	<MonthListByYear
		minDate={startOfYear(new Date('2024-01-01'))}
		maxDate={new Date()}
		selected={selectedDate}
		on:dateChange={(e) => (selectedDate = e.detail)}
	/>
	<div slot="actions">
		<Button variant="fill" color="primary" on:click={() => (open = false)}>Close</Button>
		<Button
			type="button"
			variant="fill"
			color="primary"
			on:click={getReportFromCropWatchAPI}
			disabled={!selectedDate || loading || !devEui}
			{loading}
		>
			Download Report</Button
		>
		{#if !devEui}
			<p class="text-error">Error Finding Device reporter... Please try again later or contact support</p>
		{/if}
	</div>
</Dialog>
