// import { redirect } from '@sveltejs/kit';

// export const GET = async (event) => {
// 	const {
// 		url,
// 		locals: { supabase }
// 	} = event;
// 	const code = url.searchParams.get('code') as string;

//   if (code) {
//     console.log('code', code);
//     const { error } = await supabase.auth.exchangeCodeForSession(code);
//     console.error('error', error);
//     if (!error) {
//       throw redirect(303, `/app`);
//     }
//   }

//   // return the user to an error page with instructions
//   throw redirect(303, '/auth/auth-code-error');
// };

// src/routes/auth/callback/+server.ts
import { redirect, type RequestHandler } from '@sveltejs/kit'

export const GET: RequestHandler = async ({ url, locals: { supabase } }) => {
  const code = url.searchParams.get('code')

  if (code) {
    await supabase.auth.exchangeCodeForSession(code)
  }

  redirect(303, '/app')
}