// // src/routes/auth/confirm/+server.js
// import { redirect } from '@sveltejs/kit';

// export const GET = async (event) => {
//     const {
//         url,
//         locals: { supabase }
//     } = event;
//     const token_hash = url.searchParams.get('token_hash');
//     const type = url.searchParams.get('type');
//     const next = url.searchParams.get('next') ?? '/';

//     console.log('token_hash: ', token_hash);

//   if (token_hash && type) {
//     const { error } = await supabase.auth.verifyOtp({ token_hash, type });
//     console.error('Google Auth Error!: ', error);
//     console.log('Google Auth Error!: ', error);
//     if (!error) {
//       redirect(303, `/app`);
//     }
//   }

//   // return the user to an error page with some instructions
//   redirect(303, 'auth/confirm/auth-code-error');
// };

import { type CookieOptions, createServerClient } from '@supabase/ssr';
import { redirect } from '@sveltejs/kit';

export async function GET({ request }) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const res = await fetch(request);
    const setCookie = res.headers.get('set-cookie');

    if (setCookie) {
      const parsed = scp.parse(setCookie);

      parsed.forEach((cookie) => {
        event.cookies.set(cookie.name, cookie.value, {
          secure: !dev, // This line is needed
          ...cookie,
          sameSite: cookie.sameSite as CookieSerializeOptions['sameSite']
        });
      });


      const supabase = createServerClient(
        process.env.PUBLIC_SUPABASE_URL!,
        process.env.PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            get(name: string) {
              return setCookie.get(name)?.value;
            },
            set(name: string, value: string, options: CookieOptions) {
              setCookie.set({ name, value, ...options });
            },
            remove(name: string, options: CookieOptions) {
              cookieStore.delete({ name, ...options });
            }
          }
        }
      );
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        return redirect(303, '/app');
      }
    }
  }

  // return the user to an error page with instructions
  return redirect(303, `${origin}/redirect/auth-code-error`);
}