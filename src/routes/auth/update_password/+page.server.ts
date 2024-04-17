// src/routes/update_password/+page.server.js
import { AuthApiError } from "@supabase/supabase-js"
import { fail, redirect } from "@sveltejs/kit"

export const actions = {
    update_password: async ({ request, locals }) => {
        const formData = await request.formData()
        const password = formData.get('new_password')

        const { data, error: err } = await locals.supabase.auth.updateUser({
            password
        })

        if (err) {
            if (err instanceof AuthApiError && err.status >= 400 && err.status < 500) {
                return fail(400, {
                    error: "invalidCredentials", invalid: true, message: err.message
                })
            }
            return fail(500, {
                error: "Server error. Please try again later.",
            })
        }

        redirect(303, "/user_profile");
    },
}

export async function load({locals: { safeGetSession } }) {
    const session = await safeGetSession();
    // if the user is not logged in redirect back to the home page
    if (!session) {
        redirect(303, '/');
    }
  }