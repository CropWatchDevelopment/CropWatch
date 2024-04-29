// src/hooks.server.ts
import { type Handle, redirect, error } from '@sveltejs/kit'
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public'
import { createSupabaseServerClient } from '@supabase/auth-helpers-sveltekit'
import { sequence } from '@sveltejs/kit/hooks'
import { locale } from 'svelte-i18n'

async function supabase({ event, resolve }) {
  event.locals.supabase = createSupabaseServerClient({
    supabaseUrl: PUBLIC_SUPABASE_URL,
    supabaseKey: PUBLIC_SUPABASE_ANON_KEY,
    event,
  })

  /**
     * Unlike `supabase.auth.getSession`, which is unsafe on the server because it
     * doesn't validate the JWT, this function validates the JWT by first calling
     * `getUser` and aborts early if the JWT signature is invalid.
     */
  event.locals.safeGetSession = async () => {
    const {
      data: { session },
    } = await event.locals.supabase.auth.getSession()
    if (!session) {
      return { session: null, user: null }
    }

    const {
      data: { user },
      error,
    } = await event.locals.supabase.auth.getUser()
    if (error) {
      // JWT validation has failed
      return { session: null, user: null }
    }

    // if(session) {
    //   delete session.user // Here!
    // }

    return { session, user }
  }

  return resolve(event, {
    filterSerializedResponseHeaders(name) {
      return name === 'content-range'
    },
  })
}

async function authorization({ event, resolve }) {
  // protect requests to all routes that start with /protected-routes
  if (event.url.pathname.startsWith('/app') && event.request.method === 'GET') {
    const session = await event.locals.getSession()
    if (!session) {
      // the user is not signed in
      throw redirect(303, '/auth/login')
    }
  }

  // protect POST requests to all routes that start with /protected-posts
  if (event.url.pathname.startsWith('/app') && event.request.method === 'POST') {
    const session = await event.locals.getSession()
    if (!session) {
      // the user is not signed in
      throw error(400, '/auth/login')
    }
  }

  return resolve(event)
}

const setLocale: Handle = async ({ event, resolve }) => {
  const lang = event.request.headers.get('accept-language')?.split(',')[0];
  if (lang) {
    locale.set(lang);
  }
  return resolve(event);
};

export const handle: Handle = sequence(supabase, authorization, setLocale);