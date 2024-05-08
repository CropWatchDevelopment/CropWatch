import { fail, redirect } from "@sveltejs/kit"
import { AuthApiError } from '@supabase/supabase-js'

export const actions = {
    register: async (event) => {
        const { request, locals } = event
            const formData = await request.formData()
            const email = formData.get('email')
            const password = formData.get('password')

            const { data, error: err } = await locals.supabase.auth.signUp({
                email: email,
                password: password
            })

            if (err) {
                if (err instanceof AuthApiError && err.status >= 400 && err.status < 500) {
                    return fail(400, {
                        error: "invalidCredentials", email: email, invalid: true, message: err.message
                    })
                }
                return fail(500, {
                    error: "Server error. Please try again later.",
                })
            }
            // signup for existing user returns an obfuscated/fake user object without identities https://supabase.com/docs/reference/javascript/auth-signup
            if (!err && !!data.user && !data.user.identities.length ) {
                return fail(409, {
                    error: "User already exists", email: email, invalid: true, message: "User already exists"
                })
            }
            redirect(303, "/auth/check_email");
    }
}

export async function load({locals: { safeGetSession }}) {
    // const session = await safeGetSession();
    // // if the user is already logged in return him to the home page
    // if (session) {
    //     redirect(303, '/');
    // }
  }