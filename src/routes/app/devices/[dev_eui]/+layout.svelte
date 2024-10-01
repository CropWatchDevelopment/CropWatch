<script lang="ts">
	import { browser } from '$app/environment';
	import { page } from '$app/stores';
	import Back from '$lib/components/ui/Back.svelte';
	import moment from 'moment';

	import { mdiCog, mdiDownload, mdiFileChart, mdiRobot } from '@mdi/js';
	import { Button, Dialog, Icon, Toggle, Tooltip } from 'svelte-ux';
	import { goto } from '$app/navigation';
	import SensorHeader from '$lib/components/ui/Sensors/SensorHeader.svelte';
	import { _ } from 'svelte-i18n';

	let sensorName = 'NS';
	let devEui = $page.params.dev_eui;
	let lastSeen = new Date();
	let upload_interval = 0;
	let data_table: string;
	let today: Date = new Date();
	let yesterday: Date = moment(today).subtract(1, 'day').toDate();
	let openAi = false;
	let AIResult;
	let pdfLoading = false;

	const runAI = async () => {
		openAi = true;
		let result = await fetch('/api/v1/ai/chatgpt');
		AIResult = await result.json();
	};

	const makePdf = async () => {
		try {
			pdfLoading = true;
			const response = await fetch(`/api/v1/devices/${$page.params.dev_eui}/reports/cold-storage-01`);

			if (!response.ok) {
				throw new Error('Failed to fetch the PDF');
			}

			// Convert response stream into a Blob
			const blob = await response.blob();

			// Create a URL for the Blob object
			const url = window.URL.createObjectURL(blob);

			// Create a link element
			const link = document.createElement('a');
			link.href = url;
			link.download = 'report.pdf'; // Set the name for the downloaded file

			// Append link to the body, click it to trigger download, and remove it afterward
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);

			// Optionally, revoke the URL after the download
			window.URL.revokeObjectURL(url);
			pdfLoading = false;
		} catch (error) {
			console.error('Error downloading the PDF:', error);
			pdfLoading = false;
		}
	};

	const sensorPromise = browser
		? fetch(`/api/v1/devices/${devEui}/data?firstDataDate=${yesterday}&lastDataDate=${today}`)
				.then((res) => res.json())
				.then((sensor) => {
					if (sensor && sensor.device && sensor.device.name) {
						sensorName = sensor.device.name;
					}
					if (sensor.data.length === 0) {
						throw new Error('No (recent) data found for this device');
					}
					let newestData = sensor.data?.at(0);
					lastSeen = new Date(newestData.created_at || Date());
					data_table = sensor.deviceType.data_table;
					upload_interval = sensor.deviceType.default_upload_interval;
					return sensor;
				})
		: null;
</script>

<div class="relative m-1">
	<div class="mx-2 flex flex-row">
		<SensorHeader {sensorName} {lastSeen} {upload_interval} />
		<span class="flex-grow" />
		<Tooltip class="hidden md:flex" title={`${sensorName} ${$_('devices.history.title')}`}>
			<Button icon={mdiDownload} size="lg" on:click={() => goto(`history`)} />
		</Tooltip>
		<Tooltip title={`${sensorName}'s ${$_('devices.settings.settings')}`}>
			<Button icon={mdiCog} size="lg" on:click={() => goto(`settings`)} />
		</Tooltip>
		<!-- <Tooltip title="AI">
				<Button icon={mdiRobot} on:click={() => runAI()} />
				<Dialog open={openAi} on:close={() => openAI = false}>
				  <div class="px-6 py-3">
					<pre>{JSON.stringify(AIResult ?? {}, null, 2)}</pre>
				  </div>
				</Dialog>
		</Tooltip> -->
		<Tooltip title="Reports">
			<Button icon={mdiFileChart} loading={pdfLoading} on:click={() => makePdf()} />
		</Tooltip>
	</div>
	{#if sensorPromise !== null}
		{#await sensorPromise}
			loading
		{:then sensor}
			<slot />
		{:catch error}
			<p>{error.message}</p>
		{/await}
	{/if}
</div>
