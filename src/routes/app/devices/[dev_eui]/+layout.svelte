<script lang="ts">
	import { browser } from '$app/environment';
	import { page } from '$app/stores';
	import Back from '$lib/components/ui/Back.svelte';
	import moment from 'moment';

	import { mdiCog, mdiDownload, mdiFileChart, mdiRobot } from '@mdi/js';
	import { Button, Dialog, Icon, MonthListByYear, Toggle, Tooltip } from 'svelte-ux';
	import { goto } from '$app/navigation';
	import SensorHeader from '$lib/components/ui/Sensors/SensorHeader.svelte';
	import { _ } from 'svelte-i18n';
	import { startOfYear, subYears } from 'date-fns';
	import pdfMake from 'pdfmake/build/pdfmake';
	import pdfFonts from 'pdfmake/build/vfs_fonts';
	import * as d3 from 'd3';

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
	let selectedMonth: Date = new Date();

	const runAI = async () => {
		openAi = true;
		let result = await fetch('/api/v1/ai/chatgpt');
		AIResult = await result.json();
	};

	// Set the fonts for pdfMake
	pdfMake.fonts = {
		NotoSansJP: {
			normal: 'https://crop-watch-git-reports-crop-watch-team.vercel.app/fonts/NotoSansJP/NotoSansJP-Regular.ttf',
			bold: 'https://crop-watch-git-reports-crop-watch-team.vercel.app/fonts/NotoSansJP/NotoSansJP-Regular.ttf',
		}
	};

	// Function to generate the chart image using D3.js
	async function generateChartImage(chartData) {
		const width = 800;
		const height = 600;

		// Create an SVG element
		const svg = d3
			.create('svg')
			.attr('xmlns', 'http://www.w3.org/2000/svg')
			.attr('width', width)
			.attr('height', height);

		// Set up chart margins, scales, and draw the chart (example with line chart)
		const margin = { top: 40, right: 80, bottom: 100, left: 60 };
		const innerWidth = width - margin.left - margin.right;
		const innerHeight = height - margin.top - margin.bottom;

		const x = d3
			.scaleTime()
			.range([0, innerWidth])
			.domain(d3.extent(chartData, (d) => d.date));

		const y = d3
			.scaleLinear()
			.range([innerHeight, 0])
			.domain([d3.min(chartData, (d) => d.value) - 5, d3.max(chartData, (d) => d.value) + 5]);

		const line = d3
			.line()
			.x((d) => x(d.date))
			.y((d) => y(d.value));

		const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

		// X Axis
		g.append('g')
			.attr('transform', `translate(0,${innerHeight})`)
			.call(d3.axisBottom(x).ticks(d3.timeDay.every(2)).tickFormat(d3.timeFormat('%Y-%m-%d')))
			.selectAll('text')
			.attr('transform', 'rotate(90)')
			.attr('x', 10)
			.attr('y', -5)
			.style('text-anchor', 'start')
			.style('font-family', 'sans-serif')
			.style('font-size', '8px');

		// Y Axis
		g.append('g')
			.call(d3.axisLeft(y))
			.selectAll('text')
			.style('font-family', 'sans-serif')
			.style('font-size', '10px');

		// Line path
		g.append('path')
			.datum(chartData)
			.attr('fill', 'none')
			.attr('stroke', 'steelblue')
			.attr('stroke-width', 2)
			.attr('d', line);

		// Convert the SVG to a data URL for pdfMake
		const svgString = svg.node().outerHTML;
		const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
		const url = URL.createObjectURL(svgBlob);

		// Convert SVG URL to data URL for pdfMake
		const dataUrl = await new Promise((resolve, reject) => {
			const img = new Image();
			img.onload = function () {
				const canvas = document.createElement('canvas');
				canvas.width = width;
				canvas.height = height;
				const context = canvas.getContext('2d');
				context.drawImage(img, 0, 0);
				const pngDataUrl = canvas.toDataURL('image/png');
				resolve(pngDataUrl);
			};
			img.onerror = function (err) {
				reject(err);
			};
			img.src = url;
		});

		return dataUrl;
	}

	// Function to build the PDF document definition
	function buildDocDefinition(data, chartImageDataUrl) {
		return {
			content: [
				{
					text: '週次 温度データレポート',
					style: 'title',
					alignment: 'center',
					margin: [0, 0, 0, 0]
				},
				{
					columns: [
						{
							width: '50%',
							stack: [
								{
									style: 'table',
									table: {
										widths: ['auto', '*'],
										body: data.reportDetails
									},
									layout: 'noBorders'
								},
								{
									style: 'sensorTable',
									table: {
										widths: ['*', '*'],
										body: data.sensorDetails
									},
									layout: 'lightHorizontalLines'
								}
							]
						}
					]
				},
				{
					image: chartImageDataUrl,
					width: 500,
					margin: [0, 0, 0, 40]
				}
			],
			styles: {
				title: {
					fontSize: 18,
					bold: true
				},
				table: {
					margin: [0, 0, 0, 10],
					fontSize: 10
				},
				sensorTable: {
					margin: [0, 0, 0, 0],
					fontSize: 10
				}
			},
			defaultStyle: { font: 'NotoSansJP' }
		};
	}

	// Function to fetch data from the server and generate the PDF
	const makePdf = async () => {
		try {
			pdfLoading = true;

			// Fetch the data from the server
			const response = await fetch(
				`/api/v1/devices/${$page.params.dev_eui}/reports/${report_endpoint}?month=${selectedMonth.toISOString()}`
			);

			if (!response.ok) {
				throw new Error('Failed to fetch the report data');
			}

			const data = await response.json();

			// Generate the chart image using D3.js
			const chartImageDataUrl = await generateChartImage(data.chartData);

			// Build the PDF document definition
			const docDefinition = buildDocDefinition(data, chartImageDataUrl);

			// Generate and download the PDF
			pdfMake.createPdf(docDefinition).download(`report_${data.devEui}.pdf`);

			pdfLoading = false;
		} catch (error) {
			console.error('Error generating the PDF:', error);
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
					report_endpoint = sensor?.device?.report_endpoint;
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
		{#if report_endpoint}
			<Toggle let:on={open} let:toggle let:toggleOff>
				<Tooltip title="Reports">
					<Button icon={mdiFileChart} on:click={toggle} />
				</Tooltip>
				<Dialog {open} on:close={toggleOff} class="w-1/2">
					<div slot="title">Select report Month</div>
					<MonthListByYear
						class="w-full"
						selected={selectedMonth}
						on:dateChange={(e) => {
							selectedMonth = e.detail;
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
							on:click={() => makePdf()}>Download</Button
						>
						<Button variant="fill" color="primary" on:click={toggle}>Close</Button>
					</div>
				</Dialog>
			</Toggle>
		{/if}
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
