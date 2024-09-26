import { error, redirect, type RequestHandler } from "@sveltejs/kit";
import PdfPrinter from 'pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import QuickChart from 'quickchart-js';

export const GET: RequestHandler = async ({ params, locals: { supabase, safeGetSession } }) => {
    const session = await safeGetSession();

    if (!session?.user) {
        throw redirect(303, '/auth/unauthorized');
    }

    const devEui = params.dev_eui;

    if (!devEui) {
        throw error(400, 'dev_eui is required');
    }

    // Define your chart data
    const labels = ['January', 'February', 'March', 'April', 'May', 'June'];
    const dataValues = [3, 2, 1, 5, 6, 4];

    // Create a new QuickChart instance
    const qc = new QuickChart();
    qc.setConfig({
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Temperature',
                data: dataValues,
                borderColor: 'rgba(75, 192, 192, 1)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                fill: true,
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
    qc.setWidth(800);
    qc.setHeight(600);
    qc.setBackgroundColor('white');

    // Get the chart image URL
    const chartUrl = qc.getUrl();

    // Fetch the image and convert it to base64
    const imageResponse = await fetch(chartUrl);
    const imageBuffer = await imageResponse.arrayBuffer();
    const imageBase64 = Buffer.from(imageBuffer).toString('base64');
    const chartDataUrl = `data:image/png;base64,${imageBase64}`;

    // Prepare data for the report
    const reportDetails = [
        ['会社：', '株式会社TKエビス'],
        ['部署：', 'ペットフード事業部'],
        ['使用場所：', 'xyz'],
        ['センサー名：', 'ABC'],
        ['測定期間', '24/09/01 9:30am - 20/09/30 9:00pm'],
        ['DevEUI', devEui]
    ];

    const sensorDetails = [
        ['サンプリング数', '334'],
        ['Normal: <= -18', '35/334 (0.10%)'],
        ['Notice: >= -18.1', '35/334 (0.10%)'],
        ['Warning: >= -15.1', '35/334 (0.10%)'],
        ['Alert: >= 0', '35/334 (0.10%)'],
        ['最大値', '10℃'],
        ['最小値', '-24℃'],
        ['平均値', '-18℃'],
        ['標準偏差', '15.13℃']
    ];

    // Define fonts using the embedded fonts from pdfMake
    const fonts = {
        Roboto: {
            normal: Buffer.from(pdfFonts.pdfMake.vfs['Roboto-Regular.ttf'], 'base64'),
            bold: Buffer.from(pdfFonts.pdfMake.vfs['Roboto-Medium.ttf'], 'base64'),
            italics: Buffer.from(pdfFonts.pdfMake.vfs['Roboto-Italic.ttf'], 'base64'),
            bolditalics: Buffer.from(pdfFonts.pdfMake.vfs['Roboto-MediumItalic.ttf'], 'base64'),
        },
        NotoSansJP: {
            normal: ['http://localhost:5173/fonts/NotoSansJP-Regular.ttf', 'NotoSansJP-Regular'],
            bold: ['http://localhost:5173/fonts/NotoSansJP-Regular.ttf', 'NotoSansJP-Regular'],
            italics: ['http://localhost:5173/fonts/NotoSansJP-Regular.ttf', 'NotoSansJP-Regular'],
            bolditalics: ['http://localhost:5173/fonts/NotoSansJP-Regular.ttf', 'NotoSansJP-Regular'],
          }
    };

    // Create a new PdfPrinter instance
    const printer = new PdfPrinter(fonts);

    // Define the PDF document
    const docDefinition = {
        content: [
            {
                text: '週次 温度データレポート',
                style: 'title',
                alignment: 'center',
                margin: [0, 0, 0, 20]
            },
            {
                columns: [
                    // Left column (report-details)
                    {
                        width: '60%',
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
                            // Horizontal line
                            { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 400, y2: 0, lineWidth: 1 }], margin: [0, 10, 0, 10] },
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
                            { text: 'コメント:', margin: [0, 10, 0, 0] }
                        ],
                        margin: [20, 0, 0, 0]
                    }
                ],
                columnGap: 20,
                margin: [0, 0, 0, 20]
            },
            // Chart image
            {
                image: chartDataUrl,
                width: 500,
                margin: [0, 0, 0, 20]
            },
            // Legend
            {
                columns: [
                    { text: 'Normal: <= -18', border: [true, true, true, true], margin: [0, 0, 0, 0], alignment: 'center' },
                    { text: 'Notice: >= -18.1 黄色', style: 'yellowBg', border: [true, true, true, true], alignment: 'center' },
                    { text: 'Warning: >= -15.1 オレンジ', style: 'orangeBg', border: [true, true, true, true], alignment: 'center' },
                    { text: 'Alert: >= 0 赤', style: 'redBg', border: [true, true, true, true], alignment: 'center' }
                ],
                columnGap: 10,
                margin: [0, 0, 0, 20]
            },
            // Additional content or tables can be added here
            { text: 'Thank you for using our service.', margin: [0, 20, 0, 0], alignment: 'center' }
        ],
        styles: {
            title: {
                fontSize: 18,
                bold: true
            },
            table: {
                margin: [0, 0, 0, 10]
            },
            sensorTable: {
                margin: [0, 0, 0, 0]
            },
            yellowBg: {
                fillColor: 'yellow'
            },
            orangeBg: {
                fillColor: 'orange'
            },
            redBg: {
                fillColor: 'red'
            },
            tableHeader: {
                bold: true,
                fontSize: 13,
                color: 'black'
            }
        },
        defaultStyle: { font: 'NotoSansJP' }
    };

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
                }}));
        });

        pdfDoc.on('error', (err) => {
            console.error('PDF generation error:', err);
            reject(error(500, 'Error generating PDF'));
        });

        pdfDoc.end();
    });
};
