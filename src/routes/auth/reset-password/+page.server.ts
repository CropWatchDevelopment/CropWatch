// src/routes/reset_password/+page.server.js
import { fail, redirect } from "@sveltejs/kit"
import { AuthApiError } from "@supabase/supabase-js"

export const actions = {
    reset_password: async ({ request, locals }) => {
        const formData = await request.formData()
        const email = formData.get('email')

        const { data, error: err } = await locals.supabase.auth.resetPasswordForEmail(
            email, 
            {redirectTo: 'https://app.cropwatch.io/auth/update-password'}
        )

        if (err) {
            if (err instanceof AuthApiError && err.status === 400) {
                return fail(400, {
                    error: "invalidCredentials", email: email, invalid: true, message: err.message
                })
            }
            return fail(500, {
                error: "Server error. Please try again later.",
            })
        }

        redirect(303, "/auth/check-email");
    },
}
