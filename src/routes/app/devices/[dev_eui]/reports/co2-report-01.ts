// src/lib/reports/co2-report-01.ts
import * as d3 from 'd3';
import moment from 'moment';

// Function to build the PDF definition
export function buildPdfDefinition(data: any, chartImageBase64: string) {
    
    const location = data.location;
    const device = data.device;
    const dataArray = data.data.data;

    dataArray.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    const combinedArray = dataArray.map((d: any) => {
        return [
            moment(d.created_at).format('YY/MM/DD HH:mm'),
            d.temperature,
            d.humidity,
            d.co2_level,
            ''
        ];
    });

    const maxTemperature = dataArray.reduce((max: any, item: any) =>
        item.temperature > max ? item.temperature : max, -Infinity);
    const minTemperature = dataArray.reduce((min: any, item: any) =>
        item.temperature < min ? item.temperature : min, Infinity);
    const totalTemperature = dataArray.reduce((sum: any, item: any) => sum + item.temperature, 0);
    const averageTemperature = totalTemperature / dataArray.length;

    const reportDetails = [
        ['会社：', '株式会社TKエビス'],
        ['部署：', 'ペットフード事業部'],
        ['使用場所：', location.name],
        ['センサー名：', device.name],
        ['測定期間', `${moment().startOf('month').format('YYYY/MM/DD')} - ${moment().endOf('month').format('YYYY/MM/DD')}`],
        ['DevEUI', device.dev_eui]
    ];

    const sensorDetails = [
        ['Data Type', 'Temperature'],
        ['サンプリング数', combinedArray.length.toString()],
        ['最大値', `${maxTemperature}℃`],
        ['最小値', `${minTemperature}℃`],
        ['平均値', `${averageTemperature.toFixed(2)}℃`]
    ];

    const humidityDetails = [
        ['Data Type', 'Humidity'],
        ['サンプリング数', combinedArray.length.toString()],
        ['最大湿度', `${Math.max(...dataArray.map((d: any) => d.humidity || 0))}%`],
        ['最小湿度', `${Math.min(...dataArray.map((d: any) => d.humidity || 0))}%`],
        ['平均湿度', `${(dataArray.reduce((sum: any, d: any) => sum + (d.humidity || 0), 0) / combinedArray.length).toFixed(2)}%`]
    ];

    const co2Details = [
        ['Data Type', 'CO2'],
        ['サンプリング数', combinedArray.length.toString()],
        ['最大CO2濃度', `${Math.max(...dataArray.map((d: any) => d.co2_level || 0))}ppm`],
        ['最小CO2濃度', `${Math.min(...dataArray.map((d: any) => d.co2_level || 0))}ppm`],
        ['平均CO2濃度', `${(dataArray.reduce((sum: any, d: any) => sum + (d.co2_level || 0), 0) / combinedArray.length).toFixed(2)}ppm`]
    ];

    const numColumnsPerRow = 2;
    const maxRowsPerPage = 65;

    const combinedTables = prepareTableBodiesForPages(combinedArray, numColumnsPerRow, maxRowsPerPage);

    const combinedTableContent = [];

    for (let i = 0; i < combinedTables.length; i++) {
        const tableBody = combinedTables[i];
        combinedTableContent.push({
            table: {
                headerRows: 1,
                widths: Array(numColumnsPerRow * 5).fill('*'),
                body: tableBody
            },
            layout: 'lightHorizontalLines',
            style: 'dataTable',
            pageBreak: i < combinedTables.length - 1 ? 'after' : undefined
        });
    }

    const pageWidth = 595.28;
    const pageMargins = 40;
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
                    {
                        width: '25%',
                        stack: [
                            {
                                text: 'Temperature Details',
                                style: 'subheader',
                                margin: [0, 0, 0, 3],
                            },
                            {
                                style: 'table',
                                table: {
                                    body: sensorDetails,
                                },
                                layout: 'lightHorizontalLines',
                            },
                        ],
                    },
                    {
                        width: '25%',
                        stack: [
                            {
                                text: 'Humidity Details',
                                style: 'subheader',
                                margin: [0, 0, 0, 3],
                            },
                            {
                                style: 'table',
                                table: {
                                    body: humidityDetails,
                                },
                                layout: 'lightHorizontalLines',
                            },
                        ],
                    },
                    {
                        width: '25%',
                        stack: [
                            {
                                text: 'CO2 Details',
                                style: 'subheader',
                                margin: [0, 0, 0, 3],
                            },
                            {
                                style: 'table',
                                table: {
                                    body: co2Details,
                                },
                                layout: 'lightHorizontalLines',
                            },
                        ],
                    },
                ],
            },
            ...combinedTableContent
        ],
        styles: {
            header: {
                fontSize: 12,
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
        pageMargins: [40, 5, 5, 5],
    };

    return docDefinition;
}

// Function to generate the chart image (placeholder)
export async function generateChartImage(chartData) {
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
        .text('日付')
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
        .text('温度 (℃)')
        .style('font-size', '12px')
        .style('font-family', 'sans-serif');

    // Title
    svg.append('text')
        .attr('x', margin.left + innerWidth / 2)
        .attr('y', margin.top - 20)
        .attr('text-anchor', 'middle')
        .style('font-size', '16px')
        .style('font-family', 'sans-serif')
        .text('温度');

    // Legend
    const legend = svg
        .append('g')
        .attr('class', 'legend')
        .attr(
            'transform',
            `translate(${width - margin.right + 10}, ${margin.top})`
        );

    // legend
    //     .append('rect')
    //     .attr('x', 0)
    //     .attr('y', 0)
    //     .attr('width', 20)
    //     .attr('height', 10)
    //     .style('fill', 'steelblue');

    // legend
    //     .append('text')
    //     .attr('x', 25)
    //     .attr('y', 10)
    //     .text('Temperature')
    //     .style('font-size', '12px')
    //     .style('font-family', 'sans-serif')
    //     .attr('alignment-baseline', 'middle');

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

// Helper function to prepare table bodies
function prepareTableBodiesForPages(dataArray: any[], numColumnsPerRow: number, maxRowsPerPage: number) {
    const totalDataItems = dataArray.length;
    const itemsPerPage = numColumnsPerRow * maxRowsPerPage;
    const pages = [];
    let currentIndex = 0;

    while (currentIndex < totalDataItems) {
        const tableBody = [];

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

        const pageData = dataArray.slice(currentIndex, currentIndex + itemsPerPage);

        const columnsData = [];
        for (let i = 0; i < numColumnsPerRow; i++) {
            const start = i * maxRowsPerPage;
            const end = start + maxRowsPerPage;
            columnsData.push(pageData.slice(start, end));
        }

        for (let rowIndex = 0; rowIndex < maxRowsPerPage; rowIndex++) {
            const row = [];

            for (let colIndex = 0; colIndex < numColumnsPerRow; colIndex++) {
                const columnData = columnsData[colIndex];
                if (rowIndex < columnData.length) {
                    const dataItem = columnData[rowIndex];
                    const [date, temperature, humidity, co2, comment] = dataItem;

                    row.push(
                        { text: date, alignment: 'center' },
                        { text: temperature, alignment: 'center' },
                        { text: humidity, alignment: 'center' },
                        { text: co2, alignment: 'center' },
                        { text: comment, alignment: 'center' }
                    );
                } else {
                    row.push(
                        { text: '', alignment: 'center' },
                        { text: '', alignment: 'center' },
                        { text: '', alignment: 'center' },
                        { text: '', alignment: 'center' },
                        { text: '', alignment: 'center' }
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
