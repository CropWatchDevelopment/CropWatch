import type { RequestHandler } from '@sveltejs/kit';
import { error, redirect } from '@sveltejs/kit';
import CwDevicesService from '$lib/services/CwDevicesService';
import moment from 'moment';

export const GET: RequestHandler = async ({ url, params, locals: { supabase, safeGetSession } }) => {
    const session = await safeGetSession();
    if (!session.user) {
        throw redirect(303, '/auth/unauthorized');
    }

    const devEui = params.dev_eui;
    if (!devEui) {
        throw error(400, 'dev_eui is required');
    }
    const firstDataDate = new Date(url.searchParams.get('firstDataDate') ?? '');
    const lastDataDate = new Date(url.searchParams.get('lastDataDate') ?? '');
    const csv = url.searchParams.get('csv') ? true : false;

    // Check dates are provided
    if (!firstDataDate || !lastDataDate) {
        throw error(400, 'firstDataDate and lastDataDate are required');
    }
    // Check dates are valid
    if (isNaN(firstDataDate.getTime()) || isNaN(lastDataDate.getTime())) {
        throw error(400, 'firstDataDate and lastDataDate must be valid dates');
    }
    // Check last date is AFTER first date
    if (firstDataDate > lastDataDate) {
        throw error(400, 'firstDataDate must be less than lastDataDate');
    }

    const cwDevicesService = new CwDevicesService(supabase);

    // Fetch main data
    const device = await cwDevicesService.getDeviceByEui(devEui);
    if (!device) {
        throw error(500, 'Error fetching device');
    }
    const deviceType = await cwDevicesService.getDeviceTypeById(device.type);
    if (!deviceType) {
        throw error(500, 'Error fetching device type');
    }
    const data = await cwDevicesService.getDataRangeByDeviceEui(device.dev_eui, deviceType.data_table ?? '', firstDataDate, lastDataDate);
    if (!data) {
        throw error(500, 'Error fetching latest data');
    }

    if (csv) {
        // Format the data
        const formattedData = data.map(row => {
            const formattedRow: Record<string, any> = {};
            for (const key in row) {
                if (Object.hasOwn(row, key)) {
                    let value = row[key];
                    if (key === 'created_at') {
                        value = moment(value).format('YYYY-MM-DD HH:mm:ss'); // Format date for Excel
                    } else if (typeof value === 'number') {
                        value = value.toFixed(2); // Format numbers to 2 decimal places
                    } else if (value === null) {
                        value = ''; // Replace null with an empty string
                    }
                    formattedRow[key] = value;
                }
            }
            return formattedRow;
        });

        // Generate CSV headers dynamically from the keys of the first formatted row
        const csvHeaders = Object.keys(formattedData[0]).join(',');

        // Convert data rows to CSV format
        const csvRows = formattedData.map(row => {
            return Object.values(row).map(value => `"${value}"`).join(',');
        }).join('\n');

        // Return CSV directly without converting it to JSON
        return new Response(`${csvHeaders}\n${csvRows}`, {
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': `attachment; filename="${devEui}_data.csv"`
            }
        });
    } else {
        const result = {
            data,
            device,
            deviceType,
        };

        return new Response(JSON.stringify(result), {
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }
};
