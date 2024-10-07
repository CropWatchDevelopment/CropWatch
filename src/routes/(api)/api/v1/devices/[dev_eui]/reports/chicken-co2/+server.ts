// Import necessary modules
import { error, redirect, type RequestHandler } from "@sveltejs/kit";
import PdfPrinter from 'pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import fs from 'fs';
import path from 'path';
import moment from "moment";
import D3Node from 'd3-node';
import * as d3 from 'd3';
import sharp from 'sharp';

// Define the GET handler
export const GET: RequestHandler = async ({ params, fetch, locals: { supabase, safeGetSession } }) => {
    const session = await safeGetSession();

    if (!session?.user) {
        throw redirect(303, '/auth/unauthorized');
    }

    const devEui = params.dev_eui;

    if (!devEui) {
        throw error(400, 'dev_eui is required');
    }

    // Fetch the data for the device
    const response = await fetch(
        `/api/v1/devices/${params.dev_eui}/data?firstDataDate=${moment().startOf('month').toISOString()}&lastDataDate=${moment().endOf('month').toISOString()}&timezone=asia/tokyo`
    );

    if (!response.ok) {
        throw error(500, 'Unable to get data');
    }

    let data = await response.json();

    let locationResponse = await fetch(
        `/api/v1/locations/${data.device.location_id}`
    );

    if (!locationResponse.ok) {
        throw error(500, 'Unable to get device location');
    }

    let location = await locationResponse.json();
    if (!location) {
        throw error(500, 'Unable to get device location');
    }

    data.data.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    // Create a combined data array
    const combinedArray = data.data.map(d => {
        return [
            moment(d.created_at).format('YY/MM/DD HH:mm'), // Date
            d.temperature, // Temperature
            d.humidity,    // Humidity
            d.co2_level,         // CO2
            ''             // Placeholder for comment
        ];
    });

    // Prepare data for report
    const reportDetails = [
        ['会社：', '株式会社TKエビス'],
        ['部署：', 'ペットフード事業部'],
        ['使用場所：', location.name],
        ['センサー名：', data.device.name],
        ['測定期間', `${moment().startOf('month').format('YYYY/MM/DD')} - ${moment().endOf('month').format('YYYY/MM/DD')}`],
        ['DevEUI', devEui]
    ];

    // Load the font
    const fontPath = path.join(process.cwd(), './', './fonts/NotoSansJP/', 'NotoSansJP-Regular.ttf');
    const NotoSansJPRegularFont = fs.readFileSync(fontPath);

    // Define fonts
    const fonts = {
        Roboto: {
            normal: Buffer.from(pdfFonts.pdfMake.vfs['Roboto-Regular.ttf'], 'base64'),
            bold: Buffer.from(pdfFonts.pdfMake.vfs['Roboto-Medium.ttf'], 'base64'),
            italics: Buffer.from(pdfFonts.pdfMake.vfs['Roboto-Italic.ttf'], 'base64'),
            bolditalics: Buffer.from(pdfFonts.pdfMake.vfs['Roboto-MediumItalic.ttf'], 'base64'),
        },
        NotoSansJP: {
            normal: NotoSansJPRegularFont,
            bold: NotoSansJPRegularFont,
            italics: NotoSansJPRegularFont,
            bolditalics: NotoSansJPRegularFont,
        },
    };

    const printer = new PdfPrinter(fonts);

    // Function to generate the first chart (Temperature and Humidity)
    async function generateTempHumidityChart(data) {
        const d3n = new D3Node();
        const svg = d3n.createSVG(800, 400);

        const margin = { top: 20, right: 60, bottom: 30, left: 50 };
        const width = 800 - margin.left - margin.right;
        const height = 400 - margin.top - margin.bottom;

        // Parse dates and ensure data types
        data.forEach(d => {
            d.date = new Date(d.created_at);
            d.temperature = Number(d.temperature);
            d.humidity = Number(d.humidity);
            d.co2_level = Number(d.co2_level);
        });

        // Filter out invalid data
        data = data.filter(d => !isNaN(d.date.getTime()) && !isNaN(d.temperature) && !isNaN(d.humidity));

        // Sort data
        data.sort((a, b) => a.date - b.date);

        const x = d3.scaleTime().range([0, width]);
        const yTemp = d3.scaleLinear().range([height, 0]);
        const yHumidity = d3.scaleLinear().range([height, 0]);

        x.domain(d3.extent(data, d => d.date));
        yTemp.domain([
            d3.min(data, d => d.temperature) - 5,
            d3.max(data, d => d.temperature) + 5
        ]);
        yHumidity.domain([0, 100]); // Assuming humidity is in percentage

        const lineTemp = d3.line()
            .x(d => x(d.date))
            .y(d => yTemp(d.temperature));

        const lineHumidity = d3.line()
            .x(d => x(d.date))
            .y(d => yHumidity(d.humidity));

        const g = svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        // Add the temperature line
        g.append('path')
            .datum(data)
            .attr('d', lineTemp)
            .style('stroke', 'red')
            .style('stroke-width', 1.5)
            .style('fill', 'none');

        // Add the humidity line
        g.append('path')
            .datum(data)
            .attr('d', lineHumidity)
            .style('stroke', 'blue')
            .style('stroke-width', 1.5)
            .style('fill', 'none');

        // Add the X Axis
        g.append('g')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(x));

        // Add the Y Axis for Temperature
        g.append('g')
            .style('stroke', 'red')
            .call(d3.axisLeft(yTemp));

        // Add the Y Axis for Humidity
        g.append('g')
            .attr('transform', `translate(${width},0)`)
            .style('stroke', 'blue')
            .call(d3.axisRight(yHumidity));

        // Add labels
        svg.append('text')
            .attr('x', width / 2 + margin.left)
            .attr('y', margin.top)
            .attr('text-anchor', 'middle')
            .style('font-size', '6pt')
            .text('Temperature and Humidity Over Time');

        // Convert SVG to PNG buffer
        return sharp(Buffer.from(d3n.svgString()))
            .png()
            .toBuffer();
    }

    // Function to generate the second chart (Humidity)
    async function generateHumidityChart(data) {
        const d3n = new D3Node();
        const svg = d3n.createSVG(800, 400);

        const margin = { top: 20, right: 60, bottom: 30, left: 50 };
        const width = 800 - margin.left - margin.right;
        const height = 400 - margin.top - margin.bottom;

        // Parse dates and ensure data types
        data.forEach(d => {
            d.date = new Date(d.created_at);
            d.humidity = Number(d.humidity);
        });

        // Filter out invalid data
        data = data.filter(d => !isNaN(d.date.getTime()) && !isNaN(d.humidity));

        // Sort data
        data.sort((a, b) => a.date - b.date);

        const x = d3.scaleTime().range([0, width]);
        const yHumidity = d3.scaleLinear().range([height, 0]);

        x.domain(d3.extent(data, d => d.date));
        yHumidity.domain([0, 100]);

        const lineHumidity = d3.line()
            .x(d => x(d.date))
            .y(d => yHumidity(d.humidity));

        const g = svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        // Add the humidity line
        g.append('path')
            .datum(data)
            .attr('d', lineHumidity)
            .style('stroke', 'blue')
            .style('stroke-width', 1.5)
            .style('fill', 'none');

        // Add the X Axis
        g.append('g')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(x));

        // Add the Y Axis for Humidity
        g.append('g')
            .call(d3.axisLeft(yHumidity));

        // Add labels
        svg.append('text')
            .attr('x', width / 2 + margin.left)
            .attr('y', margin.top)
            .attr('text-anchor', 'middle')
            .style('font-size', '6pt')
            .text('Humidity Over Time');

        // Convert SVG to PNG buffer
        return sharp(Buffer.from(d3n.svgString()))
            .png()
            .toBuffer();
    }

    // Generate the charts
    const tempHumidityChartBuffer = await generateTempHumidityChart(data.data);
    const humidityChartBuffer = await generateHumidityChart(data.data);

    // Convert chart buffers to base64 strings
    const tempHumidityChartBase64 = tempHumidityChartBuffer.toString('base64');
    const humidityChartBase64 = humidityChartBuffer.toString('base64');

    // Generate table bodies for the combined data
    const numColumnsPerRow = 2; // Number of data entries per row
    const maxRowsPerPage = 20; // Number of rows per page

    const combinedTables = prepareTableBodiesForPages(combinedArray, numColumnsPerRow, maxRowsPerPage);

    // Build table contents for docDefinition
    const combinedTableContent = [];

    for (let i = 0; i < combinedTables.length; i++) {
        const tableBody = combinedTables[i];
        combinedTableContent.push({
            table: {
                headerRows: 1,
                widths: Array(numColumnsPerRow * 5).fill('*'), // Adjust widths as needed
                body: tableBody
            },
            layout: 'lightHorizontalLines',
            style: 'dataTable',
            // Add pageBreak: 'after' unless it's the last table
            pageBreak: i < combinedTables.length - 1 ? 'after' : undefined
        });
    }

    // Define the PDF document and add the sections
    const pageWidth = 595.28; // A4 width in points
    const pageMargins = 40; // Default margins in pdfMake
    const contentWidth = pageWidth - pageMargins * 2;

    const docDefinition = {
        content: [
            {
                text: '週次 (or 月次) 温度データレポート',
                style: 'header',
                alignment: 'center',
                margin: [0, 0, 0, 10],
            },
            {
                columns: [
                    {
                        width: '25%',
                        stack: [
                            {
                                text: 'Report Details',
                                style: 'subheader',
                                margin: [0, 0, 0, 3],
                            },
                            {
                                style: 'table',
                                table: {
                                    body: reportDetails,
                                },
                                layout: 'lightHorizontalLines',
                            },
                        ],
                    },
                    // ... [Include other columns if needed]
                ],
            },
            {
                image: `data:image/png;base64,${tempHumidityChartBase64}`,
                width: contentWidth,
                margin: [0, 10, 0, 10],
            },
            {
                image: `data:image/png;base64,${humidityChartBase64}`,
                width: contentWidth,
                margin: [0, 10, 0, 10],
                pageBreak: 'after', // Insert a page break after the second chart
            },
            // Insert combined data table pages
            ...combinedTableContent
        ],
        styles: {
            header: {
                fontSize: 6,
                bold: true,
            },
            subheader: {
                fontSize: 4.5,
                bold: true,
            },
            tableHeader: {
                fontSize: 6,
                bold: true,
                fillColor: '#eeeeee',
                margin: [0, 2, 0, 2],
            },
            dataTable: {
                fontSize: 4.5,
                margin: [0, 5, 0, 15],
            },
            table: {
                margin: [0, 5, 0, 15],
                fontSize: 4.5,
            },
        },
        defaultStyle: {
            font: 'NotoSansJP',
            fontSize: 4.5,
        },
        pageSize: 'A4',
        pageMargins: [40, 60, 40, 60],
    };

    const pdfDoc = printer.createPdfKitDocument(docDefinition);

    const chunks: Uint8Array[] = [];

    return new Promise<Response>((resolve, reject) => {
        pdfDoc.on('data', (chunk) => chunks.push(chunk));

        pdfDoc.on('end', () => {
            const pdfBuffer = Buffer.concat(chunks);
            resolve(new Response(pdfBuffer, {
                headers: {
                    'Content-Type': 'application/pdf',
                    'Content-Disposition': `attachment; filename="report_${devEui}.pdf"`
                }
            }));
        });

        pdfDoc.on('error', (err) => {
            console.error('PDF generation error:', err);
            reject(error(500, 'Error generating PDF'));
        });

        pdfDoc.end();
    });

    // Updated prepareTableBodiesForPages function
    function prepareTableBodiesForPages(dataArray, numColumnsPerRow, maxRowsPerPage) {
        const totalDataItems = dataArray.length;
        const itemsPerPage = numColumnsPerRow * maxRowsPerPage;
        const pages = [];
        let currentIndex = 0;

        while (currentIndex < totalDataItems) {
            const tableBody = [];

            // Create header row
            const headerRow = [];
            for (let i = 0; i < numColumnsPerRow; i++) {
                headerRow.push(
                    { text: '日時', style: 'tableHeader', alignment: 'center' },
                    { text: '温度', style: 'tableHeader', alignment: 'center' },
                    { text: '湿度', style: 'tableHeader', alignment: 'center' },
                    { text: 'CO2', style: 'tableHeader', alignment: 'center' },
                    { text: 'コメント', style: 'tableHeader', alignment: 'center' }
                );
            }
            tableBody.push(headerRow);

            // Extract data for the current page
            const pageData = dataArray.slice(currentIndex, currentIndex + itemsPerPage);

            // Split pageData into columns
            const columnsData = [];
            for (let i = 0; i < numColumnsPerRow; i++) {
                const start = i * maxRowsPerPage;
                const end = start + maxRowsPerPage;
                columnsData.push(pageData.slice(start, end));
            }

            // Fill rows
            for (let rowIndex = 0; rowIndex < maxRowsPerPage; rowIndex++) {
                const row = [];

                for (let colIndex = 0; colIndex < numColumnsPerRow; colIndex++) {
                    const columnData = columnsData[colIndex];
                    if (rowIndex < columnData.length) {
                        const dataItem = columnData[rowIndex];
                        const [date, temperature, humidity, co2, comment] = dataItem;

                        // Determine fill colors based on thresholds
                        let tempColor = 'white';
                        if (temperature <= -18) tempColor = 'white';
                        else if (temperature > -18 && temperature <= -15) tempColor = 'yellow';
                        else if (temperature > -15 && temperature < 0) tempColor = 'orange';
                        else if (temperature >= 0) tempColor = 'red';

                        let humidityColor = 'white';
                        if (humidity <= 40) humidityColor = 'white';
                        else if (humidity > 40 && humidity <= 60) humidityColor = 'yellow';
                        else if (humidity > 60 && humidity <= 80) humidityColor = 'orange';
                        else if (humidity > 80) humidityColor = 'red';

                        let co2Color = 'white';
                        if (co2 <= 400) co2Color = 'white';
                        else if (co2 > 400 && co2 <= 800) co2Color = 'yellow';
                        else if (co2 > 800 && co2 <= 1000) co2Color = 'orange';
                        else if (co2 > 1000) co2Color = 'red';

                        row.push(
                            { text: date, alignment: 'center', border: [true, false, true, false] },
                            { text: temperature, alignment: 'center', fillColor: tempColor, border: [true, false, true, false] },
                            { text: humidity, alignment: 'center', fillColor: humidityColor, border: [true, false, true, false] },
                            { text: co2, alignment: 'center', fillColor: co2Color, border: [true, false, true, false] },
                            { text: comment, alignment: 'center', border: [true, false, true, false] }
                        );
                    } else {
                        // Fill empty cells if there's no more data in this column
                        row.push(
                            { text: '', border: [true, false, true, false] },
                            { text: '', border: [true, false, true, false] },
                            { text: '', border: [true, false, true, false] },
                            { text: '', border: [true, false, true, false] },
                            { text: '', border: [true, false, true, false] }
                        );
                    }
                }

                tableBody.push(row);
            }

            pages.push(tableBody);
            currentIndex += itemsPerPage;
        }

        return pages;
    }
};
