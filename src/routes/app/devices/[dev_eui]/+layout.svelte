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

    // Import D3.js
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
                bolditalics: 'NotoSansJP-Regular.ttf',
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

            const response = await fetch(
                `/api/v1/devices/${$page.params.dev_eui}/reports/${report_endpoint}?month=${selectedMonth.toISOString()}`
            );

            if (!response.ok) {
                throw new Error('Failed to fetch the PDF data');
            }

            const data = await response.json();

            // Generate the chart image
            const chartImageBase64 = await generateChartImage(data.chartData);

            // Build the PDF definition using the data
            const docDefinition = buildPdfDefinition(data, chartImageBase64);

            // Generate the PDF and download it
            pdfMake.createPdf(docDefinition).download('report.pdf');

            pdfLoading = false;
        } catch (error) {
            console.error('Error generating the PDF:', error);
            pdfLoading = false;
        }
    };

    function buildPdfDefinition(data, chartImageBase64) {
        const docDefinition = {
            pageSize: 'A4',
            pageOrientation: 'portrait',
            pageMargins: [40, 40, 0, 0],
            content: [
                {
                    text: '週次 温度データレポート',
                    style: 'title',
                    alignment: 'center',
                    margin: [0, 0, 0, 0]
                },
                {
                    columns: [
                        // Left column (report-details)
                        {
                            width: '50%',
                            stack: [
                                // Report Details Table
                                {
                                    style: 'table',
                                    table: {
                                        widths: ['auto', '*'],
                                        body: data.reportDetails
                                    },
                                    layout: 'noBorders',
                                },
                                // Sensor Details Table
                                {
                                    style: 'sensorTable',
                                    table: {
                                        widths: ['*', '*'],
                                        body: data.sensorDetails
                                    },
                                    layout: 'lightHorizontalLines',
                                }
                            ]
                        },
                        // Right column (name-section)
                        {
                            width: '35%',
                            stack: [
                                // Date box
                                {
                                    table: {
                                        widths: ['*'],
                                        body: [
                                            [{ text: '日付:', alignment: 'left', margin: [5, 5, 5, 5] }]
                                        ]
                                    },
                                    layout: {
                                        defaultBorder: true,
                                        hLineWidth: () => 1,
                                        vLineWidth: () => 1,
                                    },
                                    margin: [0, 0, 0, 10]
                                },
                                // Name boxes
                                {
                                    columns: [
                                        {
                                            width: '33%',
                                            table: {
                                                widths: ['*'],
                                                body: [
                                                    [{ text: '承認', alignment: 'center', border: [true, true, true, false], margin: [0, 5, 0, 5] }],
                                                    [{ text: '', border: [true, false, true, true], margin: [0, 20, 0, 20] }]
                                                ]
                                            },
                                            layout: {
                                                defaultBorder: false,
                                                hLineWidth: () => 1,
                                                vLineWidth: () => 1,
                                                hLineColor: () => '#000',
                                                vLineColor: () => '#000',
                                            }
                                        },
                                        {
                                            width: '33%',
                                            table: {
                                                widths: ['*'],
                                                body: [
                                                    [{ text: '確認', alignment: 'center', border: [true, true, true, false], margin: [0, 5, 0, 5] }],
                                                    [{ text: '', border: [true, false, true, true], margin: [0, 20, 0, 20] }]
                                                ]
                                            },
                                            layout: {
                                                defaultBorder: false,
                                                hLineWidth: () => 1,
                                                vLineWidth: () => 1,
                                                hLineColor: () => '#000',
                                                vLineColor: () => '#000',
                                            }
                                        },
                                        {
                                            width: '34%',
                                            table: {
                                                widths: ['*'],
                                                body: [
                                                    [{ text: '作成', alignment: 'center', border: [true, true, true, false], margin: [0, 5, 0, 5] }],
                                                    [{ text: '', border: [true, false, true, true], margin: [0, 20, 0, 20] }]
                                                ]
                                            },
                                            layout: {
                                                defaultBorder: false,
                                                hLineWidth: () => 1,
                                                vLineWidth: () => 1,
                                                hLineColor: () => '#000',
                                                vLineColor: () => '#000',
                                            }
                                        }
                                    ],
                                    columnGap: 2,
                                    margin: [0, 0, 0, 10]
                                },
                                // Comment line
                                { text: 'コメント:', margin: [0, 15, 0, 0] }
                            ],
                            margin: [20, 0, 0, 0]
                        }
                    ],
                    columnGap: 20,
                    margin: [0, 0, 0, 20]
                },
                // Chart image
                {
                    image: chartImageBase64,
                    width: 500,
                    margin: [0, 0, 0, 40],
                },
                // Data table legend
                {
                    style: 'tableLegend',
                    columns: [
                        { text: 'Normal: <= -18', border: [true, true, true, true], alignment: 'center' },
                        { text: 'Notice: >= -18.1 黄色', fillColor: 'yellow', border: [true, true, true, true], alignment: 'center' },
                        { text: 'Warning: >= -15.1 オレンジ', fillColor: 'orange', border: [true, true, true, true], alignment: 'center' },
                        { text: 'Alert: >= 0 赤', fillColor: 'red', border: [true, true, true, true], alignment: 'center' }
                    ],
                    margin: [0, 35, 0, 5]
                },
                // The data tables
                ...data.tableBodies.map((tableBody, index) => ({
                    layout: 'horizontalLines',
                    style: 'dataTable',
                    table: {
                        headerRows: 2,
                        widths: Array(4 * 3).fill('auto'),
                        body: tableBody
                    },
                    margin: [0, 0, 0, 0],
                    pageBreak: index < data.tableBodies.length - 1 ? 'after' : undefined
                })),
            ],
            styles: {
                title: {
                    fontSize: 18,
                    bold: true,
                    font: 'NotoSansJP'
                },
                text: {
                    fontSize: 10,
                    font: 'NotoSansJP'
                },
                table: {
                    margin: [0, 0, 0, 10],
                    fontSize: 10,
                    font: 'NotoSansJP'
                },
                sensorTable: {
                    margin: [0, 0, 0, 0],
                    fontSize: 10,
                    font: 'NotoSansJP'
                },
                tableLegend: {
                    fontSize: 10,
                    font: 'NotoSansJP'
                },
                dataTable: {
                    fontSize: 7,
                    font: 'NotoSansJP'
                },
                tableHeader: {
                    bold: true,
                    fontSize: 8,
                    color: 'black',
                    alignment: 'center',
                    font: 'NotoSansJP'
                },
                tableSubHeader: {
                    bold: true,
                    fontSize: 7,
                    color: 'black',
                    alignment: 'center',
                    font: 'NotoSansJP'
                },
            },
            defaultStyle: {
                font: 'NotoSansJP' // Use the custom font
            },
        };

        return docDefinition;
    }

    async function generateChartImage(chartData) {
        const width = 800;
        const height = 600;

        // Create SVG element
        const svg = d3.create("svg")
            .attr("width", width)
            .attr("height", height);

        // Adjusted margins to accommodate rotated labels and legend
        const margin = { top: 40, right: 80, bottom: 100, left: 60 };
        const innerWidth = width - margin.left - margin.right;
        const innerHeight = height - margin.top - margin.bottom;

        const x = d3.scaleTime()
            .range([0, innerWidth])
            .domain(d3.extent(chartData, d => new Date(d.date)));

        const y = d3.scaleLinear()
            .range([innerHeight, 0])
            .domain([
                d3.min(chartData, d => d.value) - 5,
                d3.max(chartData, d => d.value) + 5
            ]);

        const line = d3.line()
            .x(d => x(new Date(d.date)))
            .y(d => y(d.value));

        const g = svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        // X Axis
        g.append('g')
            .attr('transform', `translate(0,${innerHeight})`)
            .call(
                d3.axisBottom(x)
                    .ticks(d3.timeDay.every(2))
                    .tickFormat(d3.timeFormat('%Y-%m-%d'))
            )
            .selectAll('text')
            .attr('transform', 'rotate(90)')
            .attr('x', 10)
            .attr('y', -5)
            .style('text-anchor', 'start')
            .style('font-family', 'sans-serif')
            .style('font-size', '8px'); // Adjust font size as needed

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

        // X Axis Label
        svg.append('text')
            .attr('x', margin.left + innerWidth / 2)
            .attr('y', height - 20)
            .attr('text-anchor', 'middle')
            .text('Date')
            .style('font-size', '12px')
            .style('font-family', 'sans-serif');

        // Y Axis Label
        svg.append('text')
            .attr(
                'transform',
                `translate(${margin.left - 40}, ${margin.top + innerHeight / 2
                }) rotate(-90)`
            )
            .attr('text-anchor', 'middle')
            .text('Temperature (℃)')
            .style('font-size', '12px')
            .style('font-family', 'sans-serif');

        // Title
        svg.append('text')
            .attr('x', margin.left + innerWidth / 2)
            .attr('y', margin.top - 20)
            .attr('text-anchor', 'middle')
            .style('font-size', '16px')
            .style('font-family', 'sans-serif')
            .text('Temperature Over Time');

        // Legend
        const legend = svg
            .append('g')
            .attr('class', 'legend')
            .attr(
                'transform',
                `translate(${width - margin.right + 10}, ${margin.top})`
            );

        legend
            .append('rect')
            .attr('x', 0)
            .attr('y', 0)
            .attr('width', 20)
            .attr('height', 10)
            .style('fill', 'steelblue');

        legend
            .append('text')
            .attr('x', 25)
            .attr('y', 10)
            .text('Temperature')
            .style('font-size', '12px')
            .style('font-family', 'sans-serif')
            .attr('alignment-baseline', 'middle');

        // Serialize the SVG and convert it to base64
        const serializer = new XMLSerializer();
        const svgString = serializer.serializeToString(svg.node());

        // Create a canvas and draw the SVG onto it
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");

        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'Anonymous'; // Important for cross-origin data
            img.onload = function () {
                ctx.drawImage(img, 0, 0);
                const pngDataUrl = canvas.toDataURL('image/png');
                resolve(pngDataUrl);
            };
            img.onerror = function (err) {
                reject(err);
            };
            img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString)));
        });
    }

    const sensorPromise = browser
        ? fetch(`/api/v1/devices/${devEui}/data?firstDataDate=${yesterday.toISOString()}&lastDataDate=${today.toISOString()}`)
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
        <Tooltip class="hidden md:flex" title={`${sensorName} ${$_('devices.history.title')}`}>
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
                            on:click={() => {
                                toggleOff();
                                makePdf();
                            }}>Download</Button
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
