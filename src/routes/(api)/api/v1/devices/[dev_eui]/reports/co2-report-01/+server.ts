// Import necessary modules
import { error, redirect, type RequestHandler } from "@sveltejs/kit";
import moment from "moment";

// Define the GET handler
export const GET: RequestHandler = async ({ params, fetch, url, locals: { supabase, safeGetSession } }) => {
    const session = await safeGetSession();

    if (!session?.user) {
        throw redirect(303, '/auth/unauthorized');
    }

    const month = url.searchParams.get('month');
    if (!month) {
        throw error(400, 'You must include a month');
    }
    if (moment(month).isAfter(new Date())) {
        throw error(400, 'month must be in the past');
    }

    const devEui = params.dev_eui;

    if (!devEui) {
        throw error(400, 'dev_eui is required');
    }

    const start = moment(month).startOf('month').toISOString();
    const end = moment(month).endOf('month').toISOString();
    // Fetch the data for the device
    const response = await fetch(
        `/api/v1/devices/${params.dev_eui}/data?firstDataDate=${start}&lastDataDate=${end}`
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

    const normal = data.data.filter(item => item.temperature <= -18).length;
    const notice = data.data.filter(item => item.temperature > -18 && item.temperature <= -15).length;
    const warning = data.data.filter(item => item.temperature > -15 && item.temperature < 0).length;
    const alert = data.data.filter(item => item.temperature >= 0).length;
    const maxTemperature = data.data.reduce((max, item) =>
        item.temperature > max ? item.temperature : max, -Infinity);
    const minTemperature = data.data.reduce((min, item) =>
        item.temperature < min ? item.temperature : min, Infinity);
    const totalTemperature = data.data.reduce((sum, item) => sum + item.temperature, 0);
    const averageTemperature = totalTemperature / data.data.length;
    const meanTemperature = totalTemperature / data.data.length;
    const variance = data.data.reduce((sum, item) => {
        const diff = item.temperature - meanTemperature;
        return sum + diff * diff;
    }, 0) / data.data.length;
    const standardDeviation = Math.sqrt(variance);

    // Prepare data for report
    const reportDetails = [
        ['会社：', '株式会社TKエビス'],
        ['部署：', 'ペットフード事業部'],
        ['使用場所：', location.name],
        ['センサー名：', data.device.name],
        ['測定期間', `${moment(month).startOf('month').format('YYYY/MM/DD')} - ${moment(month).endOf('month').format('YYYY/MM/DD')}`],
        ['DevEUI', devEui]
    ];
    const sensorDetails = [
        ['Data Type', 'Temperature'],
        ['サンプリング数', combinedArray.length.toString()],
        ['Normal: <= -18', `${normal}/${combinedArray.length} (${((normal / combinedArray.length) * 100).toFixed(2)}%)`],
        ['Notice: >= -18.1', `${notice}/${combinedArray.length} (${((notice / combinedArray.length) * 100).toFixed(2)}%)`],
        ['Warning: >= -15.1', `${warning}/${combinedArray.length} (${((warning / combinedArray.length) * 100).toFixed(2)}%)`],
        ['Alert: >= 0', `${alert}/${combinedArray.length} (${((alert / combinedArray.length) * 100).toFixed(2)}%)`],
        ['最大値', `${maxTemperature}℃`],
        ['最小値', `${minTemperature}℃`],
        ['平均値', `${averageTemperature.toFixed(2)}℃`]
    ];

    // Prepare sections for Humidity and CO2 as well
    const humidityDetails = [
        ['Data Type', 'Humidity'],
        ['サンプリング数', combinedArray.length.toString()],
        ['Normal: <= 40%', `${data.data.filter(item => (item.humidity || 0) <= 40).length}/${combinedArray.length} (${((data.data.filter(item => (item.humidity || 0) <= 40).length / combinedArray.length) * 100).toFixed(2)}%)`],
        ['Notice: > 40% and <= 60%', `${data.data.filter(item => (item.humidity || 0) > 40 && (item.humidity || 0) <= 60).length}/${combinedArray.length} (${((data.data.filter(item => (item.humidity || 0) > 40 && (item.humidity || 0) <= 60).length / combinedArray.length) * 100).toFixed(2)}%)`],
        ['Warning: > 60% and <= 80%', `${data.data.filter(item => (item.humidity || 0) > 60 && (item.humidity || 0) <= 80).length}/${combinedArray.length} (${((data.data.filter(item => (item.humidity || 0) > 60 && (item.humidity || 0) <= 80).length / combinedArray.length) * 100).toFixed(2)}%)`],
        ['Alert: > 80%', `${data.data.filter(item => (item.humidity || 0) > 80).length}/${combinedArray.length} (${((data.data.filter(item => (item.humidity || 0) > 80).length / combinedArray.length) * 100).toFixed(2)}%)`],
        ['最大湿度', `${Math.max(...data.data.map(d => d.humidity || 0))}%`],
        ['最小湿度', `${Math.min(...data.data.map(d => d.humidity || 0))}%`],
        ['平均湿度', `${(data.data.reduce((sum, d) => sum + (d.humidity || 0), 0) / combinedArray.length).toFixed(2)}%`]
    ];

    const co2Details = [
        ['Data Type', 'CO2'],
        ['サンプリング数', combinedArray.length.toString()],
        ['Normal: <= 400ppm', `${data.data.filter(item => (item.co2 || 0) <= 400).length}/${combinedArray.length} (${((data.data.filter(item => (item.co2 || 0) <= 400).length / combinedArray.length) * 100).toFixed(2)}%)`],
        ['Notice: > 400ppm and <= 800ppm', `${data.data.filter(item => (item.co2 || 0) > 400 && (item.co2 || 0) <= 800).length}/${combinedArray.length} (${((data.data.filter(item => (item.co2 || 0) > 400 && (item.co2 || 0) <= 800).length / combinedArray.length) * 100).toFixed(2)}%)`],
        ['Warning: > 800ppm and <= 1000ppm', `${data.data.filter(item => (item.co2 || 0) > 800 && (item.co2 || 0) <= 1000).length}/${combinedArray.length} (${((data.data.filter(item => (item.co2 || 0) > 800 && (item.co2 || 0) <= 1000).length / combinedArray.length) * 100).toFixed(2)}%)`],
        ['Alert: > 1000ppm', `${data.data.filter(item => (item.co2 || 0) > 1000).length}/${combinedArray.length} (${((data.data.filter(item => (item.co2 || 0) > 1000).length / combinedArray.length) * 100).toFixed(2)}%)`],
        ['最大CO2濃度', `${Math.max(...data.data.map(d => d.co2 || 0))}ppm`],
        ['最小CO2濃度', `${Math.min(...data.data.map(d => d.co2 || 0))}ppm`],
        ['平均CO2濃度', `${(data.data.reduce((sum, d) => sum + (d.co2 || 0), 0) / combinedArray.length).toFixed(2)}ppm`]
    ];


    const responseData =
    {
        co2Details,
        combinedArray,
        humidityDetails,
        reportDetails,
        sensorDetails,
        devEui,
        device: data.device,
        location,
        data,
    };
    return new Response(JSON.stringify(responseData), {
        headers: {
            'Content-Type': 'application/json',
        },
    });
};

// // Updated prepareTableBodiesForPages function
// function prepareTableBodiesForPages(dataArray, numColumnsPerRow, maxRowsPerPage) {
//     const totalDataItems = dataArray.length;
//     const itemsPerPage = numColumnsPerRow * maxRowsPerPage;
//     const pages = [];
//     let currentIndex = 0;

//     while (currentIndex < totalDataItems) {
//         const tableBody = [];

//         // Create header row
//         const headerRow = [];
//         for (let i = 0; i < numColumnsPerRow; i++) {
//             headerRow.push(
//                 { text: '日時', style: 'tableHeader', alignment: 'center' },
//                 { text: '温度', style: 'tableHeader', alignment: 'center' },
//                 { text: '湿度', style: 'tableHeader', alignment: 'center' },
//                 { text: 'CO2', style: 'tableHeader', alignment: 'center' },
//                 { text: 'コメント', style: 'tableHeader', alignment: 'center' }
//             );
//         }
//         tableBody.push(headerRow);

//         // Extract data for the current page
//         const pageData = dataArray.slice(currentIndex, currentIndex + itemsPerPage);

//         // Split pageData into columns
//         const columnsData = [];
//         for (let i = 0; i < numColumnsPerRow; i++) {
//             const start = i * maxRowsPerPage;
//             const end = start + maxRowsPerPage;
//             columnsData.push(pageData.slice(start, end));
//         }

//         // Fill rows
//         for (let rowIndex = 0; rowIndex < maxRowsPerPage; rowIndex++) {
//             const row = [];

//             for (let colIndex = 0; colIndex < numColumnsPerRow; colIndex++) {
//                 const columnData = columnsData[colIndex];
//                 if (rowIndex < columnData.length) {
//                     const dataItem = columnData[rowIndex];
//                     const [date, temperature, humidity, co2, comment] = dataItem;

//                     row.push(
//                         { text: date, alignment: 'center' },
//                         { text: temperature, alignment: 'center' },
//                         { text: humidity, alignment: 'center' },
//                         { text: co2, alignment: 'center' },
//                         { text: comment, alignment: 'center' }
//                     );
//                 } else {
//                     // Fill empty cells if there's no more data in this column
//                     row.push(
//                         { text: '', alignment: 'center' },
//                         { text: '', alignment: 'center' },
//                         { text: '', alignment: 'center' },
//                         { text: '', alignment: 'center' },
//                         { text: '', alignment: 'center' }
//                     );
//                 }
//             }

//             tableBody.push(row);
//         }

//         pages.push(tableBody);
//         currentIndex += itemsPerPage;
//     }

//     return pages;
// }
