// src/routes/+layout.js
import { PUBLIC_SUPABASE_ANON_KEY, PUBLIC_SUPABASE_URL } from '$env/static/public'
import { combineChunks, createBrowserClient, isBrowser, parse } from '@supabase/ssr'
import '$lib/i18n' // Import to initialize. Important :)
import { locale, waitLocale } from 'svelte-i18n';
import { browser } from '$app/environment';

export const load = async ({ fetch, data, depends }) => {
  depends('supabase:auth');

  if (browser) {
    locale.set(window.navigator.language);
  }
  await waitLocale();

  const supabase = createBrowserClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
    global: {
      fetch,
    },
    cookies: {
      get(key) {
        if (!isBrowser()) {
          return JSON.stringify(data.session)
        }

        const cookie = combineChunks(key, (name) => {
          const cookies = parse(document.cookie)
          return cookies[name]
        })
        return cookie
      },
    },
  })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  return { supabase, session }
}