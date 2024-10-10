import * as d3 from 'd3';

export function buildPdfDefinition(data, chartImageBase64): pdfMake.TCreatedPdf {
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