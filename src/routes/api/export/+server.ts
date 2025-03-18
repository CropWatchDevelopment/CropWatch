import { PRIVATE_CROPWATCH_API_KEY } from "$env/static/private";
import { PUBLIC_EXPORTS_CROPWATCH_API_URL } from "$env/static/public";
import { redirect, type RequestHandler } from "@sveltejs/kit";
import moment from "moment";

export const GET: RequestHandler = async ({ request, url, fetch, locals: { supabase, safeGetSession } }) => {
    const session = await safeGetSession();
    if (!session.user) {
        return redirect(301, '/auth/unauthorized');
    }

    // Validate from and convert it to a time
    const from = url.searchParams.get('from');
    if (!from) {
        return new Response('Missing from parameter', { status: 400 });
    }
    const fromDate = new Date(from);
    if (isNaN(fromDate.getTime())) {
        return new Response('Invalid date parameter', { status: 400 });
    }


    // Validate from and convert it to a time
    const to = url.searchParams.get('to');
    if (!to) {
        return new Response('Missing to parameter', { status: 400 });
    }
    const toDate = new Date(to);
    if (isNaN(toDate.getTime())) {
        return new Response('Invalid date parameter', { status: 400 });
    }

    const devEui = url.searchParams.get('devEui');
    if (!devEui) {
        return new Response('Missing devEui parameter', { status: 400 });
    }

    try {
        const reportUrl = `${PUBLIC_EXPORTS_CROPWATCH_API_URL}/v1/Export?devEui=${devEui}&startDate=${moment(from).startOf('month').format('YYYY-MM-DD')}&endDate=${moment(to).endOf('month').format('YYYY-MM-DD')}`;

        const response = await fetch(reportUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': `${PRIVATE_CROPWATCH_API_KEY}`
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const blob = await response.blob();

        if (blob.size === 0) {
            return new Response('No data available for the selected period', { status: 404 });
        }

        return new Response(blob, {
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': `attachment; filename="report-${moment(from).format('YYYY-MM')}-to-${moment(to).format('YYYY-MM')}.csv"`
            }
        });
    } catch (error) {
        console.error('Error generating report:', error);
        return new Response('Error generating report', { status: 500 });
    }
};