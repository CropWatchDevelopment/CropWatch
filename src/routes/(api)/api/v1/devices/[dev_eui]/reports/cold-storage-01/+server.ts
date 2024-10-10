import { redirect, type RequestHandler } from "@sveltejs/kit";
import { error } from '@sveltejs/kit';
import moment from "moment";
import * as d3 from 'd3';

export const GET: RequestHandler = async ({ params, url, fetch, locals: { supabase, safeGetSession } }) => {
    // Get the session and check for user authentication
    const session = await safeGetSession();
    if (!session?.user) {
        throw redirect(303, '/auth/unauthorized');
    }

    const devEui = params.dev_eui;
    if (!devEui) {
        throw error(400, 'dev_eui is required');
    }

    // Fetch the user profile to check the requester data
    const { data: requesterData, error: userError } = await supabase.from('profiles').select('id, employer').eq('id', session.user.id).single();
    if (userError) {
        throw error(400, 'User has no employer');
    }

    // Get the month from the URL search params and validate it
    const month = url.searchParams.get('month');
    if (!month) {
        throw error(400, 'You must include a month');
    }
    if (moment(month).isAfter(new Date())) {
        throw error(400, 'Month must be in the past');
    }

    // Fetch the device data for the given devEui and date range
    const response = await fetch(
        `/api/v1/devices/${params.dev_eui}/data?firstDataDate=${moment(month).startOf('month').toISOString()}&lastDataDate=${moment(month).endOf('month').toISOString()}&timezone=asia/tokyo`
    );
    if (!response.ok) {
        throw error(500, 'Unable to get data');
    }
    let data = await response.json();

    // Fetch the device location data
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

    // Fetch filtering time from URL search params, default to 30 minutes if not provided
    let filteringTimeQuery = url.searchParams.get('filteringTime');
    let filteringTime: number = filteringTimeQuery ? +filteringTimeQuery : 30;

    // Sort the data by creation date
    data.data.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    // Prepare the array for the report table
    let array = data.data.map(d => {
        return [
            moment(d.created_at).format('YY/MM/DD HH:mm'), // Date
            d.temperatureC, // Temperature
            '' // Placeholder for comment
        ];
    });

    // Prepare details for the report
    const reportDetails = [
        ['会社：', requesterData.employer],
        ['部署：', 'ペットフード事業部'],
        ['使用場所：', location.name],
        ['センサー名：', data.device.name],
        ['測定期間', `${moment().startOf('month').format('YYYY/MM/DD')} - ${moment().endOf('month').format('YYYY/MM/DD')}`],
        ['DevEUI', devEui]
    ];

    // Count temperature classifications for the report
    const normal = data.data.filter(item => item.temperatureC <= -18).length;
    const notice = data.data.filter(item => item.temperatureC > -18 && item.temperatureC <= -15).length;
    const warning = data.data.filter(item => item.temperatureC > -15 && item.temperatureC < 0).length;
    const alert = data.data.filter(item => item.temperatureC >= 0).length;

    // Calculate min, max, average, and standard deviation of temperatures
    const maxTemperature = data.data.reduce((max, item) => item.temperatureC > max ? item.temperatureC : max, -Infinity);
    const minTemperature = data.data.reduce((min, item) => item.temperatureC < min ? item.temperatureC : min, Infinity);
    const totalTemperature = data.data.reduce((sum, item) => sum + item.temperatureC, 0);
    const averageTemperature = totalTemperature / data.data.length;

    // Calculate the standard deviation of the temperatures
    const meanTemperature = totalTemperature / data.data.length;
    const variance = data.data.reduce((sum, item) => {
        const diff = item.temperatureC - meanTemperature;
        return sum + diff * diff;
    }, 0) / data.data.length;
    const standardDeviation = Math.sqrt(variance);

    // Prepare sensor statistics for the report
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

    // Filter the data based on the filtering time
    const filteredData = filterData(data.data, filteringTime);

    // Map filtered data into an array format for PDF tables and chart data
    array = filteredData.map(d => {
        return [
            moment(d.created_at).format('YY/MM/DD HH:mm'), // Date
            d.temperatureC, // Temperature
            '' // Placeholder for comment
        ];
    });
    const chartData = filteredData.map(d => ({
        date: moment(d.created_at).toDate(),
        value: d.temperatureC
    }));

    // Prepare the response data to send to the client
    const responseData = {
        reportDetails,
        sensorDetails,
        array,
        chartData,
        devEui
    };

    // Return the prepared data as JSON
    return new Response(JSON.stringify(responseData), {
        headers: {
            'Content-Type': 'application/json'
        }
    });
};

// Function to filter the data based on the interval
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
