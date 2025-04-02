// import { createServerClient } from "@supabase/ssr";
// import {
//   PUBLIC_SUPABASE_ANON_KEY,
//   PUBLIC_SUPABASE_URL,
// } from "$env/static/public";
// import { redirect, type Handle } from "@sveltejs/kit";
// import { sequence } from "@sveltejs/kit/hooks";
// import { paraglideMiddleware } from '$lib/paraglide/server';


// const supabase: Handle = async ({ event, resolve }) => {
//   /**
//    * Creates a Supabase client specific to this server request.
//    *
//    * The Supabase client gets the Auth token from the request cookies.
//    */
//   event.locals.supabase = createServerClient(
//     PUBLIC_SUPABASE_URL,
//     PUBLIC_SUPABASE_ANON_KEY,
//     {
//       cookies: {
//         getAll: async () => event.cookies.getAll(),
//         /**
//          * SvelteKit's cookies API requires `path` to be explicitly set in
//          * the cookie options. Setting `path` to `/` replicates previous/
//          * standard behavior.
//          */
//         setAll: (cookiesToSet) => {
//           cookiesToSet.forEach(({ name, value, options }) => {
//             event.cookies.set(name, value, { ...options, path: "/" });
//           });
//         },
//       },
//     }
//   );

//   /**
//    * Unlike `supabase.auth.getSession()`, which returns the session _without_
//    * validating the JWT, this function also calls `getUser()` to validate the
//    * JWT before returning the session.
//    */
//   event.locals.safeGetSession = async () => {
//     const {
//       data: { session },
//     } = await event.locals.supabase.auth.getSession();
//     if (!session) {
//       return { session: null, user: null };
//     }

//     const {
//       data: { user },
//       error,
//     } = await event.locals.supabase.auth.getUser();
//     if (error) {
//       // JWT validation has failed
//       return { session: null, user: null };
//     }

//     return { session, user };
//   };

//   return resolve(event, {
//     filterSerializedResponseHeaders(name) {
//       /**
//        * Supabase libraries use the `content-range` and `x-supabase-api-version`
//        * headers, so we need to tell SvelteKit to pass it through.
//        */
//       return name === "content-range" || name === "x-supabase-api-version";
//     },
//   });
// };

// const authGuard: Handle = async ({ event, resolve }) => {
//   const { session, user } = await event.locals.safeGetSession();
//   event.locals.session = session;
//   event.locals.user = user;

//   if (!event.locals.session && event.url.pathname.startsWith("/app")) {
//     // redirect(303, '/auth/login');
//   }

//   if (event.locals.session &&
//     ['/auth/register', '/auth/login'].includes(event.url.pathname)) {
//     redirect(303, '/app');
//   }

//   return resolve(event);
// }


// // creating a handle to use the paraglide middleware
// const paraglideHandle: Handle = ({ event, resolve }) =>
// 	paraglideMiddleware(event.request, ({ request: localizedRequest, locale }) => {
// 		event.request = localizedRequest;
// 		return resolve(event, {
// 			transformPageChunk: ({ html }) => {
// 				return html.replace('lang%', locale);
// 			}
// 		});
// 	});



// export const handle: Handle = sequence(supabase, authGuard, paraglideHandle);

// src/hooks.server.ts
import { PRIVATE_SUPABASE_SERVICE_ROLE } from "$env/static/private"
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
    const {
      data: { session },
    } = await event.locals.supabase.auth.getSession()
    if (!session) {
      return { session: null, user: null, amr: null }
    }

    const {
      data: { user },
      error: userError,
    } = await event.locals.supabase.auth.getUser()
    if (userError) {
      // JWT validation has failed
      return { session: null, user: null, amr: null }
    }

    const { data: aal, error: amrError } =
      await event.locals.supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    if (amrError) {
      return { session, user, amr: null }
    }

    return { session, user, amr: aal.currentAuthenticationMethods }
  }

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
    redirect(303, '/app');
  }

  // If user is NOT logged in,
  // send them to login page.
  if (!event.locals.session && event.url.pathname.startsWith("/app")) {
    redirect(303, '/auth/login');
  }

  return resolve(event)
}

export const handle: Handle = sequence(supabase, authGuard)