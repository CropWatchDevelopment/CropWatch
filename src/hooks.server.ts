import type { HandleFetch } from '@sveltejs/kit';
import { redirect } from "@sveltejs/kit";

export const handle = async ({ event, resolve }) => {
    console.log('Handling request for', event.url.pathname);
    const authRoute = event.url.pathname.startsWith('/auth');
    const tokenCookie = event.cookies.get("jwt");
    if (tokenCookie) {
        // Optimistically verify signature for UI state
        // Actual data fetching will still be verified by Go

    } else {
        if (!authRoute) {
            console.log('No JWT token found, redirecting to login');
            throw redirect(303, '/auth/login');
        }
    }
    return await resolve(event);
};


export const handleFetch: HandleFetch = async ({ request, fetch, event }) => {
    if (request.url.startsWith('https://api.cropwatch.io/')) {
        // add our jwt token to the request if it exists
        const token = event.cookies.get("jwt");
        if (token) {
            request.headers.set("Authorization", `Bearer ${token}`);
        }
    }

    return fetch(request);
};