import { error, redirect, type RequestHandler } from "@sveltejs/kit";
import PdfPrinter from 'pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import fs from 'fs';
import path from 'path';
import moment from "moment";
import D3Node from 'd3-node';
import * as d3 from 'd3';
import sharp from 'sharp';

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

    //data.data = data.data.filter(f => f.temperatureC > -18.2);

    // Sort data.data by created_at in ascending order
    data.data.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    const array = data.data.map(d => {
        return [
            moment(d.created_at).format('YY/MM/DD HH:mm'), // Format date as desired
            d.temperatureC, // Format temperature
            '' // Placeholder for comment
        ];
    });

    // Prepare data for D3 chart
    const chartData = data.data.map(d => ({
        date: moment(d.created_at).toDate(),
        value: d.temperatureC
    }));

    // Generate chart image
    const chartImageBuffer = await generateChartImage(chartData);

    // Read the font file
    const fontPath = path.join(process.cwd(), './', './fonts/NotoSansJP/', 'NotoSansJP-Regular.ttf');
    const NotoSansJPRegularFont = fs.readFileSync(fontPath);

    // Prepare data for the report
    const reportDetails = [
        ['会社：', '株式会社TKエビス'],
        ['部署：', 'ペットフード事業部'],
        ['使用場所：', location.name],
        ['センサー名：', data.device.name],
        ['測定期間', `${moment().startOf('month').format('YYYY/MM/DD')} - ${moment().endOf('month').format('YYYY/MM/DD')}`],
        ['DevEUI', devEui]
    ];

    const normal = data.data.filter(item => item.temperatureC <= -18).length;
    const notice = data.data.filter(item => item.temperatureC > -18 && item.temperatureC <= -15).length;
    const warning = data.data.filter(item => item.temperatureC > -15 && item.temperatureC < 0).length;
    const alert = data.data.filter(item => item.temperatureC >= 0).length;

    const maxTemperature = data.data.reduce((max, item) =>
        item.temperatureC > max ? item.temperatureC : max, -Infinity);
    const minTemperature = data.data.reduce((min, item) =>
        item.temperatureC < min ? item.temperatureC : min, Infinity);
    const totalTemperature = data.data.reduce((sum, item) => sum + item.temperatureC, 0);
    const averageTemperature = totalTemperature / data.data.length;
    // Step 1: Calculate the mean (average) temperatureC
    const meanTemperature = totalTemperature / data.data.length;

    // Step 2: Calculate the variance
    const variance = data.data.reduce((sum, item) => {
        const diff = item.temperatureC - meanTemperature;
        return sum + diff * diff;
    }, 0) / data.data.length;

    // Step 3: Calculate the standard deviation
    const standardDeviation = Math.sqrt(variance);

    const sensorDetails = [
        ['サンプリング数', array.length.toString()],
        ['Normal: <= -18', `${normal}/${array.length} (${((normal / array.length) * 100).toFixed(2)} %)`],
        ['Notice: > -18 and <= -15', `${notice}/${array.length} (${((notice / array.length) * 100).toFixed(2)} %)`],
        ['Warning: > -15 and < 0', `${warning}/${array.length} (${((warning / array.length) * 100).toFixed(2)} %)`],
        ['Alert: >= 0', `${alert}/${array.length} (${((alert / array.length) * 100).toFixed(2)} %)`],
        ['最大値', `${maxTemperature}℃`],
        ['最小値', `${minTemperature}℃`],
        ['平均値', `${averageTemperature.toFixed(2)}℃`],
        ['標準偏差', `${standardDeviation.toFixed(2)}℃`]
    ];


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

    // Create a new PdfPrinter instance
    const printer = new PdfPrinter(fonts);

    // Function to generate the data table columns
    // function prepareTableBodiesForPages(dataArray: any[], numColumns: number, maxRowsPerPage: number): any[] {
    //     const totalRows = Math.ceil(dataArray.length / numColumns);
    //     const pages = [];
    //     for (let startRow = 0; startRow < totalRows; startRow += maxRowsPerPage) {
    //         const endRow = Math.min(startRow + maxRowsPerPage, totalRows);
    //         const columnsData = [];
    //         for (let i = 0; i < numColumns; i++) {
    //             const columnData = dataArray.slice(
    //                 i * totalRows + startRow,
    //                 i * totalRows + endRow
    //             );
    //             columnsData.push(columnData);
    //         }

    //         const tableBody = [];

    //         // Create header row
    //         const headerRow = [];
    //         for (let i = 0; i < numColumns; i++) {
    //             headerRow.push({ text: '測定日時', style: 'tableHeader', colSpan: 3, alignment: 'center' });
    //             headerRow.push({});
    //             headerRow.push({});
    //         }
    //         tableBody.push(headerRow);

    //         // Create sub-header row
    //         const subHeaderRow = [];
    //         for (let i = 0; i < numColumns; i++) {
    //             subHeaderRow.push({ text: '日時', style: 'tableSubHeader', alignment: 'center' });
    //             subHeaderRow.push({ text: '温度', style: 'tableSubHeader', alignment: 'center' });
    //             subHeaderRow.push({ text: 'コメント', style: 'tableSubHeader', alignment: 'center' });
    //         }
    //         tableBody.push(subHeaderRow);

    //         // Create data rows
    //         const rowsOnPage = endRow - startRow;
    //         for (let rowIndex = 0; rowIndex < rowsOnPage; rowIndex++) {
    //             const row = [];
    //             for (let colIndex = 0; colIndex < numColumns; colIndex++) {
    //                 const dataItem = columnsData[colIndex][rowIndex];
    //                 let color = 'white';
    //                 if (dataItem) {
    //                     if (dataItem[1] && dataItem[1] <= -18) color = 'white';
    //                     else if (dataItem[1] && dataItem[1] >= -18.1 && dataItem[1] < 15.1) color = 'yellow';
    //                     else if (dataItem[1] && dataItem[1] >= -15.1 && dataItem[1] <= 0.1) color = 'orange';
    //                     else if (dataItem[1] && dataItem[1] >= 0) color = 'red';




    //                     // Add vertical borders to each cell
    //                     row.push({ text: dataItem[0], alignment: 'center', border: [true, false, true, false] }); // 測定日時
    //                     row.push({ text: dataItem[1], alignment: 'center', fillColor: color, border: [true, false, true, false] }); // 温度
    //                     row.push({ text: dataItem[2], alignment: 'center', border: [true, false, true, false] }); // コメント
    //                 } else {
    //                     row.push({ text: '', border: [true, false, true, false] });
    //                     row.push({ text: '', border: [true, false, true, false] });
    //                     row.push({ text: '', border: [true, false, true, false] });
    //                 }
    //             }
    //             tableBody.push(row);
    //         }

    //         pages.push(tableBody);
    //     }
    //     return pages;
    // }

    function prepareTableBodiesForPages(dataArray, numColumns, maxRowsPerColumn) {
        const totalDataItems = dataArray.length;
        const itemsPerPage = numColumns * maxRowsPerColumn;
    
        const pages = [];
        let currentIndex = 0;
    
        while (currentIndex < totalDataItems) {
            const tableBody = [];
    
            // Create header row
            const headerRow = [];
            for (let i = 0; i < numColumns; i++) {
                headerRow.push(
                    { text: '測定日時', style: 'tableHeader', colSpan: 3, alignment: 'center' },
                    {},
                    {}
                );
            }
            tableBody.push(headerRow);
    
            // Create sub-header row
            const subHeaderRow = [];
            for (let i = 0; i < numColumns; i++) {
                subHeaderRow.push(
                    { text: '日時', style: 'tableSubHeader', alignment: 'center' },
                    { text: '温度', style: 'tableSubHeader', alignment: 'center' },
                    { text: 'コメント', style: 'tableSubHeader', alignment: 'center' }
                );
            }
            tableBody.push(subHeaderRow);
    
            // Extract data for the current page
            const pageData = dataArray.slice(currentIndex, currentIndex + itemsPerPage);
    
            // Split pageData into columns
            const columnsData = [];
            for (let i = 0; i < numColumns; i++) {
                const start = i * maxRowsPerColumn;
                const end = start + maxRowsPerColumn;
                columnsData.push(pageData.slice(start, end));
            }
    
            // Fill rows
            for (let rowIndex = 0; rowIndex < maxRowsPerColumn; rowIndex++) {
                const row = [];
    
                for (let colIndex = 0; colIndex < numColumns; colIndex++) {
                    const columnData = columnsData[colIndex];
                    if (rowIndex < columnData.length) {
                        const dataItem = columnData[rowIndex];
                        let color = 'white';
                        const temperature = dataItem[1];
    
                        // Determine the fill color based on temperature
                        if (temperature <= -18) color = 'white';
                        else if (temperature > -18 && temperature <= -15) color = 'yellow';
                        else if (temperature > -15 && temperature < 0) color = 'orange';
                        else if (temperature >= 0) color = 'red';
    
                        row.push(
                            { text: dataItem[0], alignment: 'center', border: [true, false, true, false] }, // Date
                            { text: dataItem[1], alignment: 'center', fillColor: color, border: [true, false, true, false] }, // Temperature
                            { text: dataItem[2], alignment: 'center', border: [true, false, true, false] } // Comment
                        );
                    } else {
                        // Fill empty cells if there's no more data in this column
                        row.push(
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
    

    // Prepare table bodies for pages
    const numColumns = 4;
    const maxRowsPerPage = 45; // Adjust as needed based on page size
    const tableBodies = prepareTableBodiesForPages(array, numColumns, maxRowsPerPage);

    // Define the PDF document
    const docDefinition = {
        language: 'ja-jp',
        compress: true,
        pageSize: 'A4',
        pageOrientation: 'portrait',
        pageMargins: [40, 40, 0, 0],
        info: {
            title: 'Refrigerator Report',
            author: 'CropWatch Backend Server',
            subject: 'Cold-Storage',
            keywords: 'Refer Cold Storage',
            creationDate: new Date(),
        },
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
                                    body: reportDetails
                                },
                                layout: 'noBorders',
                            },
                            // Sensor Details Table
                            {
                                style: 'sensorTable',
                                table: {
                                    widths: ['*', '*'],
                                    body: sensorDetails
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
                id: 'chart',
                image: chartImageBuffer,
                width: 500, // Adjust as needed
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
                // columnGap: 5,
                margin: [0, 35, 0, 5]
            },
            // The data tables will be added here
        ],
        styles: {
            title: {
                fontSize: 18,
                bold: true
            },
            text: {
                fontSize: 10,
            },
            table: {
                margin: [0, 0, 0, 10],
                fontSize: 10,
            },
            sensorTable: {
                margin: [0, 0, 0, 0],
                fontSize: 10,
            },
            tableLegend: {
                fontSize: 10,
            },
            dataTable: {
                fontSize: 7,
                paddingRight: '5px',
                marginRight: '5px',
                table: {
                    border: '1px solid #dddddd',
                    body: [
                        [
                            {
                                border: [false, true, false, false],
                                fillColor: '#eeeeee',
                                text: 'border:\n[false, true, false, false]',
                                paddingRight: '5px',
                                marginRight: '5px',
                            },
                        ]],
                }
            },
            tableHeader: {
                bold: true,
                fontSize: 8,
                color: 'black',
                alignment: 'center'
            },
            tableSubHeader: {
                bold: true,
                fontSize: 7,
                color: 'black',
                alignment: 'center'
            },
            // Other styles as needed
        },
        defaultStyle: { font: 'NotoSansJP' },
        pageBreakBefore: function (currentNode, followingNodesOnPage, nodesOnNextPage, previousNodesOnPage) {
            return currentNode.id == 'tableLegend';
        }
    };

    // Add the data tables to your docDefinition content
    tableBodies.forEach((tableBody, index) => {
        const dataTable = {
            layout: 'horizontalLines',
            style: 'dataTable',
            table: {
                headerRows: 2, // We have two header rows now
                widths: Array(numColumns * 3).fill('auto'),
                body: tableBody
            },
            margin: [0, 0, 0, 0],
            pageBreak: index < tableBodies.length - 1 ? 'after' : undefined
        };
        docDefinition.content.push(dataTable);
    });

    // Generate the PDF document
    const pdfDoc = printer.createPdfKitDocument(docDefinition);

    // Collect the PDF data chunks
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
};

// Function to generate the chart image using D3.js and sharp
async function generateChartImage(data) {
    const d3n = new D3Node();

    const width = 800;
    const height = 600;

    const svg = d3n.createSVG(width, height);

    const margin = { top: 40, right: 20, bottom: 50, left: 60 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const x = d3.scaleTime()
        .range([0, innerWidth])
        .domain(d3.extent(data, d => d.date));

    const y = d3.scaleLinear()
        .range([innerHeight, 0])
        .domain([d3.min(data, d => d.value) - 5, d3.max(data, d => d.value) + 5]);

    const line = d3.line()
        .x(d => x(d.date))
        .y(d => y(d.value));

    const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    // X Axis
    g.append('g')
        .attr('transform', `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x).ticks(d3.timeWeek.every(1)).tickFormat(d3.timeFormat('%b %d')))
        .selectAll('text')
        .attr('transform', 'rotate(45)')
        .style('text-anchor', 'start');

    // Y Axis
    g.append('g')
        .call(d3.axisLeft(y));

    // Line path
    g.append('path')
        .datum(data)
        .attr('fill', 'none')
        .attr('stroke', 'steelblue')
        .attr('stroke-width', 2)
        .attr('d', line);

    // Labels
    // X Axis Label
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', height - 10)
        .attr('text-anchor', 'middle')
        .text('Week');

    // Y Axis Label
    svg.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -height / 2)
        .attr('y', 15)
        .attr('text-anchor', 'middle')
        .text('Temperature (℃)');

    // Title
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', 25)
        .attr('text-anchor', 'middle')
        .style('font-size', '16px')
        .text('Temperature Over Time');

    // Convert SVG to PNG buffer using sharp
    const svgString = d3n.svgString();
    const pngBuffer = await sharp(Buffer.from(svgString)).png().toBuffer();
    return pngBuffer;
}
