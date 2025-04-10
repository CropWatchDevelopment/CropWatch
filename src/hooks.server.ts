import {
  PUBLIC_SUPABASE_ANON_KEY,
  PUBLIC_SUPABASE_URL,
} from "$env/static/public"
import { createServerClient } from "@supabase/ssr"
import { createClient } from "@supabase/supabase-js"
import { redirect, type Handle } from "@sveltejs/kit"
import { sequence } from "@sveltejs/kit/hooks"

export const supabase: Handle = async ({ event, resolve }) => {
  event.locals.supabase = createServerClient(
    PUBLIC_SUPABASE_URL,
    PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => event.cookies.getAll(),
        /**
         * SvelteKit's cookies API requires `path` to be explicitly set in
         * the cookie options. Setting `path` to `/` replicates previous/
         * standard behavior.
         */
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            event.cookies.set(name, value, { ...options, path: "/" })
          })
        },
      },
    },
  )

  event.locals.supabaseServiceRole = createClient(
    PUBLIC_SUPABASE_URL,
    PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false } },
  )

  // https://github.com/supabase/auth-js/issues/888#issuecomment-2189298518
  if ("suppressGetSessionWarning" in event.locals.supabase.auth) {
    // @ts-expect-error - suppressGetSessionWarning is not part of the official API
    event.locals.supabase.auth.suppressGetSessionWarning = true
  } else {
    console.warn(
      "SupabaseAuthClient#suppressGetSessionWarning was removed. See https://github.com/supabase/auth-js/issues/888.",
    )
  }

  /**
   * Unlike `supabase.auth.getSession()`, which returns the session _without_
   * validating the JWT, this function also calls `getUser()` to validate the
   * JWT before returning the session.
   */
  event.locals.safeGetSession = async () => {
    try {
      const {
        data: { session },
      } = await event.locals.supabase.auth.getSession();
      if (!session) {
        return { session: null, user: null, amr: null };
      }

      const {
        data: { user },
        error: userError,
      } = await event.locals.supabase.auth.getUser();
      if (userError) {
        // JWT validation has failed
        // Clear invalid session cookies when error occurs
        await event.locals.supabase.auth.signOut({ scope: 'local' });
        return { session: null, user: null, amr: null };
      }

      // Try to get MFA status, but don't fail if it errors
      try {
        const { data: aal, error: amrError } =
          await event.locals.supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (!amrError) {
          return { session, user, amr: aal.currentAuthenticationMethods };
        }
      } catch (error) {
        console.warn("Failed to get MFA status:", error);
      }
      
      return { session, user, amr: null };
    } catch (error) {
      // Handle any auth errors, including "Invalid Refresh Token"
      console.error("Auth error in safeGetSession:", error);
      
      // Clear invalid session cookies
      try {
        await event.locals.supabase.auth.signOut({ scope: 'local' });
      } catch (signOutError) {
        console.error("Failed to sign out after auth error:", signOutError);
      }
      
      return { session: null, user: null, amr: null };
    }
  };

  return resolve(event, {
    filterSerializedResponseHeaders(name) {
      return name === "content-range" || name === "x-supabase-api-version"
    },
  })
}

// Not called for prerendered marketing pages so generally okay to call on ever server request
// Next-page CSR will mean relatively minimal calls to this hook
const authGuard: Handle = async ({ event, resolve }) => {
  const { session, user } = await event.locals.safeGetSession()
  event.locals.session = session
  event.locals.user = user

  // If user is logged in,
  // send them to app.
  if (event.locals.session &&
    ['/auth/register', '/auth/login'].includes(event.url.pathname)) {
    redirect(303, '/app/dashboard');
  }

  // If user is NOT logged in,
  // send them to login page.
  if (!event.locals.session && event.url.pathname.startsWith("/app/dashboard")) {
    redirect(303, '/auth/login');
  }

  return resolve(event)
}

export const handle: Handle = sequence(supabase, authGuard)