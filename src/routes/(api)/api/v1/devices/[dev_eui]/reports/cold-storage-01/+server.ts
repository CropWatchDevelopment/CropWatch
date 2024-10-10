import { error, redirect, type RequestHandler } from "@sveltejs/kit";
import moment from "moment";

export const GET: RequestHandler = async ({ params, url, fetch, locals: { supabase, safeGetSession } }) => {
    const session = await safeGetSession();

    if (!session?.user) {
        throw redirect(303, '/auth/unauthorized');
    }

    const devEui = params.dev_eui;

    if (!devEui) {
        throw error(400, 'dev_eui is required');
    }

    const { data: requesterData, error: profileError } = await supabase.from('profiles').select('id, employer').eq('id', session.user.id).single();

    if (profileError) {
        throw error(400, 'User has no employer');
    }

    const month = url.searchParams.get('month');
    if (!month) {
        throw error(400, 'You must include a month');
    }
    if (moment(month).isAfter(new Date())) {
        throw error(400, 'month must be in the past');
    }

    // Fetch the data for the device
    const response = await fetch(
        `/api/v1/devices/${params.dev_eui}/data?firstDataDate=${moment(month).startOf('month').toISOString()}&lastDataDate=${moment(month).endOf('month').toISOString()}&timezone=asia/tokyo`
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

    let filteringTimeQuery = url.searchParams.get('filteringTime');
    let filteringTime: number = filteringTimeQuery ? +filteringTimeQuery : 30;

    // Sort data.data by created_at in ascending order
    data.data.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    let array = data.data.map(d => {
        return [
            moment(d.created_at).format('YY/MM/DD HH:mm'), // Format date as desired
            d.temperatureC, // Format temperature
            '' // Placeholder for comment
        ];
    });

    // Prepare data for D3 chart
    let chartData = data.data.map(d => ({
        date: moment(d.created_at).toDate(),
        value: d.temperatureC
    }));

    // Prepare data for the report
    const reportDetails = [
        ['会社：', requesterData.employer],
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

    // Calculate the standard deviation
    const meanTemperature = totalTemperature / data.data.length;
    const variance = data.data.reduce((sum, item) => {
        const diff = item.temperatureC - meanTemperature;
        return sum + diff * diff;
    }, 0) / data.data.length;
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

    // Use the filterData function to filter your data
    const filteredData = filterData(data.data, filteringTime); // Default to 30 minutes

    // Now, use the filteredData for your array and chartData
    array = filteredData.map(d => {
        return [
            moment(d.created_at).format('YY/MM/DD HH:mm'), // Format date as desired
            d.temperatureC, // Format temperature
            '' // Placeholder for comment
        ];
    });

    chartData = filteredData.map(d => ({
        date: moment(d.created_at).toDate(),
        value: d.temperatureC
    }));

    function filterData(data, intervalMinutes = 30) {
        const filteredData = [];
        let lastAddedTime = null;

        data.forEach((d) => {
            const currentDate = moment(d.created_at);
            const temperature = d.temperatureC;

            const isNotice = temperature > -18 && temperature <= -15;
            const isWarning = temperature > -15 && temperature < 0;
            const isAlert = temperature >= 0;

            // Always include if it's a notice, warning, or alert
            if (isNotice || isWarning || isAlert) {
                filteredData.push(d);
                lastAddedTime = currentDate;
            } else {
                // Otherwise, include only if the time interval has passed
                if (!lastAddedTime || currentDate.diff(lastAddedTime, 'minutes') >= intervalMinutes) {
                    filteredData.push(d);
                    lastAddedTime = currentDate;
                }
            }
        });

        return filteredData;
    }

    // Prepare table bodies for pages
    const numColumns = 4;
    const maxRowsPerPage = 45; // Adjust as needed based on page size
    const tableBodies = prepareTableBodiesForPages(array, numColumns, maxRowsPerPage);

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

    // Return the data as JSON
    const responseData = {
        reportDetails,
        sensorDetails,
        chartData,
        tableBodies,
        // Include any other data needed to build the PDF
    };

    return new Response(JSON.stringify(responseData), {
        headers: {
            'Content-Type': 'application/json',
        },
    });
};
