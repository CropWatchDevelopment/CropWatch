<script lang="ts">
	import { browser } from '$app/environment';
	import { page } from '$app/stores';
	import Back from '$lib/components/ui/Back.svelte';
	import moment from 'moment';

	import { mdiCog, mdiDownload, mdiFileChart } from '@mdi/js';
	import { Button, Dialog, Icon, MonthListByYear, Toggle, Tooltip } from 'svelte-ux';
	import { goto } from '$app/navigation';
	import SensorHeader from '$lib/components/ui/Sensors/SensorHeader.svelte';
	import { _ } from 'svelte-i18n';
	import { startOfYear, subYears } from 'date-fns';

	// Import pdfmake
	import pdfMake from 'pdfmake/build/pdfmake';

	let sensorName = 'NS';
	let devEui = $page.params.dev_eui;
	let lastSeen = new Date();
	let upload_interval = 0;
	let data_table: string;
	let today: Date = new Date();
	let yesterday: Date = moment(today).subtract(1, 'day').toDate();
	let report_endpoint: string | null = null;
	let openAi = false;
	let AIResult;
	let pdfLoading = false;
	let selectedMonth: Date = moment().startOf('month').subtract(1).toDate();

	const runAI = async () => {
		openAi = true;
		let result = await fetch('/api/v1/ai/chatgpt');
		AIResult = await result.json();
	};

	async function loadFonts() {
		const fontUrl = '/fonts/NotoSansJP/NotoSansJP-Regular.ttf';

		const response = await fetch(fontUrl);
		if (!response.ok) {
			throw new Error('Failed to load font');
		}
		const fontArrayBuffer = await response.arrayBuffer();
		const fontBase64 = arrayBufferToBase64(fontArrayBuffer);

		// Add the font to pdfMake's virtual file system
		pdfMake.vfs = pdfMake.vfs || {};
		pdfMake.vfs['NotoSansJP-Regular.ttf'] = fontBase64;

		// Define the font mappings
		pdfMake.fonts = {
			NotoSansJP: {
				normal: 'NotoSansJP-Regular.ttf',
				bold: 'NotoSansJP-Regular.ttf',
				italics: 'NotoSansJP-Regular.ttf',
				bolditalics: 'NotoSansJP-Regular.ttf'
			}
		};
	}

	function arrayBufferToBase64(buffer) {
		let binary = '';
		const bytes = new Uint8Array(buffer);
		const len = bytes.byteLength;
		for (let i = 0; i < len; i++) {
			binary += String.fromCharCode(bytes[i]);
		}
		return window.btoa(binary);
	}

	const makePdf = async () => {
		try {
			pdfLoading = true;
			await loadFonts(); // Load fonts before generating PDF

			let response;

			let buildPdfDefinition, generateChartImage;
			if (report_endpoint == 'cold-storage-01') {
                debugger;
				const imported = await import(`./reports/${report_endpoint}`);
				buildPdfDefinition = imported.buildPdfDefinition;
				generateChartImage = imported.generateChartImage;
				response = await fetch(
					`/api/v1/devices/${$page.params.dev_eui}/reports/?month=${selectedMonth.toISOString()}&variable=temperatureC&thresholdValues=-18,-18.1,0&thresholdLabels=Low,Moderate,High,Very High&thresholdColors=white,yellow,orange,red`
				);
			}
			if (report_endpoint == 'cold-storage-02') {
                debugger;
				const imported = await import(`./reports/cold-storage-01`);
				buildPdfDefinition = imported.buildPdfDefinition;
				generateChartImage = imported.generateChartImage;
                response = await fetch(
					`/api/v1/devices/${$page.params.dev_eui}/reports/?month=${selectedMonth.toISOString()}&variable=temperature&thresholdValues=-18,-18.1,0&thresholdLabels=Low,Moderate,High,Very High&thresholdColors=white,yellow,orange,red`
				);
			}

			if (!response.ok) {
				throw new Error('Failed to fetch the PDF data');
			}
			const data = await response.json();

			// Generate the chart image
			const chartImageBase64 = await generateChartImage(data.chartData);

			// Build the PDF definition using the data
			const docDefinition: pdfMake.TCreatedPdf = buildPdfDefinition(data, chartImageBase64);

			// Generate the PDF and download it
			pdfMake
				.createPdf(docDefinition)
				.download(`${moment(selectedMonth).format('yyyy-MM')}-report.pdf`);

			pdfLoading = false;
		} catch (error) {
			console.error('Error generating the PDF:', error);
			pdfLoading = false;
		}
	};

	const sensorPromise = browser
		? fetch(
				`/api/v1/devices/${devEui}/data?firstDataDate=${yesterday.toISOString()}&lastDataDate=${today.toISOString()}&variable=humidity&thresholdValues=30,60,90&thresholdLabels=Low,Moderate,High,Very High&thresholdColors=blue,green,yellow,red`
			)
				//? fetch(`/api/v1/devices/${devEui}/data?firstDataDate=${yesterday.toISOString()}&lastDataDate=${today.toISOString()}`)
				.then((res) => res.json())
				.then((sensor) => {
					if (sensor && sensor.device && sensor.device.name) {
						sensorName = sensor.device.name;
					}
					if (sensor.data.length === 0) {
						throw new Error('No (recent) data found for this device');
					}
					let newestData = sensor.data?.[0];
					lastSeen = new Date(newestData.created_at || Date());
					data_table = sensor.deviceType.data_table;
					upload_interval = sensor.deviceType.default_upload_interval;
					report_endpoint = sensor?.device?.report_endpoint;
					return sensor;
				})
		: null;
</script>

<div class="relative m-1">
	<div class="mx-2 flex flex-row">
		<SensorHeader {sensorName} {lastSeen} {upload_interval} />
		<span class="flex-grow" />
		<Tooltip class="hidden md:flex" title={`${sensorName} ${$_('download')}`}>
			<Button icon={mdiDownload} size="lg" on:click={() => goto(`history`)} />
		</Tooltip>
		<Tooltip title={`${sensorName}'s ${$_('devices.settings.settings')}`}>
			<Button icon={mdiCog} size="lg" on:click={() => goto(`settings`)} />
		</Tooltip>
		{#if report_endpoint}
			<Toggle let:on={open} let:toggle let:toggleOff>
				<Tooltip title="Reports">
					<Button icon={mdiFileChart} on:click={toggle} />
				</Tooltip>
				<Dialog {open} on:close={toggleOff} class="w-1/2">
					<div slot="title">{$_('devices.reports.DownloadTitle')}</div>
					<MonthListByYear
						class="w-full"
						selected={selectedMonth}
						on:dateChange={(e) => {
							if (moment(e.detail).isBefore(moment().startOf('month'))) {
								selectedMonth = e.detail;
							}
						}}
						minDate={startOfYear(subYears(new Date(), 3))}
						maxDate={new Date()}
					/>
					<div slot="actions">
						<Button
							variant="fill"
							icon={mdiDownload}
							color="success"
							loading={pdfLoading}
							on:click={() => {
								toggleOff();
								makePdf();
							}}>{$_('download')}</Button
						>
						<Button variant="fill" color="primary" on:click={toggleOff}>Close</Button>
					</div>
				</Dialog>
			</Toggle>
		{/if}
	</div>
	{#if sensorPromise !== null}
		{#await sensorPromise}
			loading
		{:then sensor}
			<!-- Your component or content that uses the sensor data -->
			<slot />
		{:catch error}
			<p>{error.message}</p>
		{/await}
	{/if}
</div>
