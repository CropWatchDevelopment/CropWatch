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

    // Get the variable key from query parameters, default to 'temperatureC'
    const variableKey = url.searchParams.get('variable') || 'temperatureC';

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
    data.data.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    // Get thresholds and labels from query parameters or set defaults
    const thresholdValuesParam = url.searchParams.get('thresholdValues');
    const thresholdLabelsParam = url.searchParams.get('thresholdLabels');
    const thresholdColorsParam = url.searchParams.get('thresholdColors');

    let thresholds: number[];
    let labels: string[];
    let colors: string[];

    if (thresholdValuesParam && thresholdLabelsParam) {
        thresholds = thresholdValuesParam.split(',').map(Number);
        labels = thresholdLabelsParam.split(',');

        if (labels.length !== thresholds.length + 1) {
            throw error(400, 'Number of labels must be one more than number of thresholds');
        }

        if (thresholdColorsParam) {
            colors = thresholdColorsParam.split(',');
            if (colors.length !== labels.length) {
                throw error(400, 'Number of colors must equal number of labels');
            }
        } else {
            // Default colors
            colors = ['white', 'yellow', 'orange', 'red'];
        }
    } else {
        // Default thresholds and labels for temperatureC
        thresholds = [-18, -15, 0];
        labels = ['Normal', 'Notice', 'Warning', 'Alert'];
        colors = ['white', 'yellow', 'orange', 'red'];
    }

    // Map labels to colors
    const labelColors = {};
    labels.forEach((label, index) => {
        labelColors[label] = colors[index];
    });

    // Prepare data for array and chartData
    let array = data.data.map(d => {
        const variableValue = d[variableKey];
        return [
            moment(d.created_at).format('YY/MM/DD HH:mm'), // Format date as desired
            variableValue !== undefined && variableValue !== null ? variableValue : 'N/A', // Dynamic variable value
            '' // Placeholder for comment
        ];
    });

    // Prepare data for D3 chart
    let chartData = data.data.map(d => {
        const variableValue = d[variableKey];
        return {
            date: moment(d.created_at).toDate(),
            value: variableValue !== undefined && variableValue !== null ? variableValue : null
        };
    });

    // Initialize counts for each label
    const counts = {};
    labels.forEach(label => counts[label] = 0);

    // Calculate counts and statistics
    let maxValue = -Infinity;
    let minValue = Infinity;
    let totalValue = 0;
    let validDataPoints = 0;

    data.data.forEach((item, index) => {
        const value = item[variableKey];
        if (value === undefined || value === null) {
            console.warn(`Data item at index ${index} has undefined ${variableKey}`);
            return; // Skip this data point
        }
        validDataPoints++;
        const label = getLabel(value, thresholds, labels);
        counts[label]++;
        if (value > maxValue) maxValue = value;
        if (value < minValue) minValue = value;
        totalValue += value;
    });

    if (validDataPoints === 0) {
        throw error(400, `No valid data points found for variable ${variableKey}`);
    }

    const averageValue = totalValue / validDataPoints;

    // Calculate the standard deviation
    const meanValue = totalValue / validDataPoints;
    const variance = data.data.reduce((sum, item) => {
        const value = item[variableKey];
        if (value === undefined || value === null) {
            return sum; // Skip invalid data
        }
        const diff = value - meanValue;
        return sum + diff * diff;
    }, 0) / validDataPoints;
    const standardDeviation = Math.sqrt(variance);

    // Prepare sensor details
    const variableUnits = {
        'temperatureC': '℃',
        'humidity': '%',
        // Add other variables and units as needed
    };
    const variableUnit = variableUnits[variableKey] || '';

    const sensorDetails = [
        ['サンプリング数', validDataPoints.toString()],
    ];

    labels.forEach(label => {
        const count = counts[label];
        const percentage = ((count / validDataPoints) * 100).toFixed(2);
        sensorDetails.push([`${label}`, `${count}/${validDataPoints} (${percentage} %)`]);
    });

    sensorDetails.push(['最大値', `${maxValue}${variableUnit}`]);
    sensorDetails.push(['最小値', `${minValue}${variableUnit}`]);
    sensorDetails.push(['平均値', `${averageValue.toFixed(2)}${variableUnit}`]);
    sensorDetails.push(['標準偏差', `${standardDeviation.toFixed(2)}${variableUnit}`]);

    // Use the filterData function to filter your data
    const filteredData = filterData(data.data, filteringTime, thresholds, labels);

    // Now, use the filteredData for your array and chartData
    array = filteredData.map(d => {
        const variableValue = d[variableKey];
        return [
            moment(d.created_at).format('YY/MM/DD HH:mm'), // Format date as desired
            variableValue !== undefined && variableValue !== null ? variableValue : 'N/A', // Dynamic variable value
            '' // Placeholder for comment
        ];
    });

    chartData = filteredData.map(d => {
        const variableValue = d[variableKey];
        return {
            date: moment(d.created_at).toDate(),
            value: variableValue !== undefined && variableValue !== null ? variableValue : null
        };
    });

    function filterData(data, intervalMinutes = 30, thresholds, labels) {
        const filteredData = [];
        let lastAddedTime = null;

        data.forEach((d) => {
            const currentDate = moment(d.created_at);
            const value = d[variableKey];

            if (value === undefined || value === null) {
                return; // Skip invalid data
            }

            const label = getLabel(value, thresholds, labels);

            // Always include if it's not the first label (assumed to be 'Normal')
            if (label !== labels[0]) {
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

    function getLabel(value, thresholds, labels) {
        for (let i = 0; i < thresholds.length; i++) {
            if (value <= thresholds[i]) {
                return labels[i];
            }
        }
        return labels[labels.length - 1];
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
                    { text: '値', style: 'tableSubHeader', alignment: 'center' },
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
                        const value = dataItem[1];

                        // Determine the fill color based on label
                        const numericValue = parseFloat(value);
                        const label = !isNaN(numericValue) ? getLabel(numericValue, thresholds, labels) : labels[0];
                        const color = labelColors[label] || 'white';

                        row.push(
                            { text: dataItem[0] || '', alignment: 'center', border: [true, false, true, false] }, // Date
                            { text: value !== undefined && value !== null ? value : 'N/A', alignment: 'center', fillColor: color, border: [true, false, true, false] }, // Value
                            { text: dataItem[2] || '', alignment: 'center', border: [true, false, true, false] } // Comment
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

    // Prepare data for the report
    const reportDetails = [
        ['会社：', requesterData.employer],
        ['部署：', 'ペットフード事業部'],
        ['使用場所：', location.name],
        ['センサー名：', data.device.name],
        ['測定期間', `${moment().startOf('month').format('YYYY/MM/DD')} - ${moment().endOf('month').format('YYYY/MM/DD')}`],
        ['DevEUI', devEui]
    ];

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
