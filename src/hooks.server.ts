import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import { createServerClient } from '@supabase/ssr';
import type { Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { locale } from 'svelte-i18n';

const setLocale: Handle = async ({ event, resolve }) => {
    const lang = event.request.headers.get('accept-language')?.split(',')[0];
    if (lang) {
        locale.set(lang);
    }
    return resolve(event);
};

const handleSB: Handle = async ({ event, resolve }) => {
    event.locals.supabase = createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
        cookies: {
            getAll: () => event.cookies.getAll(),
            /**
             * SvelteKit's cookies API requires `path` to be explicitly set in
             * the cookie options. Setting `path` to `/` replicates previous/
             * standard behavior.
             */
            setAll: (cookiesToSet) => {
                cookiesToSet.forEach(({ name, value, options }) => {
                    event.cookies.set(name, value, { ...options, path: '/' })
                })
            },
        },
    })

    event.locals.getSession = async () => {
        const {
            data: { user },
            error,
        } = await event.locals.supabase.auth.getUser();
        const {
            data: { session },
        } = await event.locals.supabase.auth.getSession();

        if (!session) {
            return { user: null };
        }


        if (error) {
            // JWT validation has failed
            return { user: null };
        }

        return { user };
    };

    return resolve(event, {
        filterSerializedResponseHeaders(name) {
            return name === 'content-range'
        },
    });
}

// NOTE!!! handleSB must be the first in the sequence!!!
export const handle = sequence(handleSB, setLocale);