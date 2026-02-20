import { PUBLIC_API_BASE_URL } from '$env/static/public';
import type { IJWT } from '$lib/interfaces/jwt.interface';
import type { HandleFetch } from '@sveltejs/kit';
import { redirect } from "@sveltejs/kit";
import { jwtDecode } from 'jwt-decode';

export const handle = async ({ event, resolve }) => {
    const token = event.cookies.get("jwt");
    checkAuthToken(token ?? '', event);
    return await resolve(event);
};


export const handleFetch: HandleFetch = async ({ request, fetch, event }) => {
    if (request.url.startsWith(PUBLIC_API_BASE_URL)) {
        const token = event.cookies.get("jwt");
        checkAuthToken(token ?? '', event);
        if (token) {
            request.headers.set("Authorization", `Bearer ${token}`);
        }
    }
    return fetch(request);
};

const checkAuthToken = (token: string, event: any): boolean => {
    const authRoute = event.url.pathname.startsWith('/auth');
    if (token) {
        try {
            const decodedJWT: IJWT = jwtDecode(token) as IJWT;
            event.locals.jwt = decodedJWT; // looking good, add to locals
            event.locals.jwtString = token;

            const now = Math.floor(Date.now() / 1000);
            if (decodedJWT.exp < now) {
                console.log('JWT token expired, redirecting to login');
                event.cookies.delete("jwt", { path: '/' });
                event.locals.jwt = null;
                event.locals.jwtString = null;
                if (!authRoute) {
                    throw redirect(303, `/auth/login?expired=true&lastPath=${encodeURIComponent(event.url.pathname)}`);
                }
            }
            // Token is valid and not expired, proceed as normal
            return true;
        } catch (error) {
            if (!authRoute) {
                event.locals.jwt = null;
                event.locals.jwtString = null;
                throw redirect(303, '/auth/login');
            }
        }
    } else {
        if (!authRoute) {
            console.log('No JWT token found, redirecting to login');
            event.locals.jwt = null;
            event.locals.jwtString = null;
            throw redirect(303, '/auth/login');
        }
    }
    return false;
}