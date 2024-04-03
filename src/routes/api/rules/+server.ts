

// src/routes/api/protected-route/+server.ts
import { json, error } from '@sveltejs/kit'

export const POST = async ({request, locals: { supabase, getSession } }) => {
  const session = await getSession();
  const formData = await request.formData();
  console.log(session, formData);
  if (!session) {
    // the user is not signed in
    throw error(401, { message: 'Unauthorized' })
  }
  
  
}



// import { json, type RequestEvent } from '@sveltejs/kit'

// export async function POST(event: RequestEvent, { locals: { supabase, getSession }}) {
//     const session = await getSession();
//     const form = await event.request.formData();

//     console.log(form, session);
  
//     return json({a:1})
//   }