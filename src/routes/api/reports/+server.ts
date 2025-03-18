import { PRIVATE_CROPWATCH_API_KEY } from "$env/static/private";
import { PUBLIC_REPORTS_CROPWATCH_API_URL } from "$env/static/public";
import { redirect, type RequestHandler } from "@sveltejs/kit";
import moment from "moment";

export const GET: RequestHandler = async ({ request, url, fetch, locals: {supabase, safeGetSession} }) => {
    const session = await safeGetSession();
    if (!session.user) {
        return redirect(301, '/auth/unauthorized');
    }

    const date = url.searchParams.get('date');
    if (!date) {
        return new Response('Missing date parameter', { status: 400 });
    }
    
    const startDate = new Date(date);
    if (isNaN(startDate.getTime())) {
        return new Response('Invalid date parameter', { status: 400 });
    }

    const devEui = url.searchParams.get('devEui');
    if (!devEui) {
        return new Response('Missing devEui parameter', { status: 400 });
    }

    try {
        const reportUrl = `${PUBLIC_REPORTS_CROPWATCH_API_URL}/v1/pdf?devEui=${devEui}&startDate=${moment(date).startOf('month').format('YYYY-MM-DD')}&endDate=${moment(date).endOf('month').format('YYYY-MM-DD')}`;
        
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
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="report-${moment(date).format('YYYY-MM')}.pdf"`
            }
        });
    } catch (error) {
        console.error('Error generating report:', error);
        return new Response('Error generating report', { status: 500 });
    }
};