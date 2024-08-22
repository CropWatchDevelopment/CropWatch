import { fail, redirect } from "@sveltejs/kit"
import { AuthApiError } from '@supabase/supabase-js'
import { PRIVATE_RECAPTCHA_KEY } from "$env/static/private"

export const actions = {
    default: async (event) => {
        const { request, locals } = event
        const formData = await request.formData()
        const email = formData.get('email') as string;
        const password = formData.get('password') as string;

        const token = formData.get('token') as string;
        const recaptchaUrl = 'https://www.google.com/recaptcha/api/siteverify';

        const captchaIsOK = await fetch(recaptchaUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `secret=${PRIVATE_RECAPTCHA_KEY}&response=${token}`,
        }).then(async (response) => {
            const data = await response.json();
            if (!data.success) {
                return false;
            }
            return true;
        });

        if (!captchaIsOK) {
            return fail(400, {
                error: "invalidCredentials", email: email, invalid: true, message: "Captcha is invalid"
            })
        }

        if (!email || !password) {
            return fail(400, {
                error: "invalidCredentials", email: email, invalid: true, message: "All fields are required"
            })
        }

        const { data, error: err } = await locals.supabase.auth.signUp({
            email: email,
            password: password,
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
        if (!data.user) {
            return fail(500, {
                error: "Server error. Please try again later.",
            })
        }
        // signup for existing user returns an obfuscated/fake user object without identities https://supabase.com/docs/reference/javascript/auth-signup
        if (!err && !!data.user && !data.user.identities.length) {
            return fail(409, {
                error: "User already exists", email: email, invalid: true, message: "User already exists"
            })
        }

        // redirect(303, "check-email");
        return { success: true }
    }
}
