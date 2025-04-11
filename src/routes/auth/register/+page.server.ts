import { fail } from '@sveltejs/kit';
import { message, superValidate } from 'sveltekit-superforms/server';
import { registerSchema } from './form/register.schema';
import { zod } from 'sveltekit-superforms/adapters';
import { PRIVATE_GOOGLE_RECAPTCHA_SECRET_KEY } from '$env/static/private';
import type { Actions, PageServerLoad } from './$types';

/**
 * Load the registration form
 */
export const load: PageServerLoad = async () => {
    const form = await superValidate(zod(registerSchema));
    return { form };
};

export const actions: Actions = {
    /**
     * Process registration form submission
     */
    default: async ({ request, locals: { supabase } }) => {
        const form = await superValidate(request, zod(registerSchema));

        if (!form.valid) {
            return fail(400, { form });
        }

        // Verify reCAPTCHA token
        const isValidToken = await validateRecaptchaToken(form.data.reCatchaToken);
        if (!isValidToken) {
            return fail(400, {
                form: message(form, 'reCAPTCHA verification failed, please try again')
            });
        }

        try {
            // Register the user with Supabase Auth
            const { error } = await supabase.auth.signUp({
                email: form.data.email,
                password: form.data.password,
                options: {
                    emailRedirectTo: 'https://cropwatch.io/legal/sign-forms',
                    data: {
                        username: form.data.username,
                        full_name: form.data.full_name,
                        employer: form.data.employer,
                        email: form.data.email
                    }
                }
            });

            if (error) {
                console.error('Registration error:', error.message);
                return fail(400, {
                    form: message(form, error.message)
                });
            }

            return { 
                form, 
                success: true 
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
            console.error('Unexpected registration error:', error);
            return fail(500, {
                form: message(form, errorMessage)
            });
        }
    }
};

/**
 * Validates a reCAPTCHA token with Google's verification API
 * 
 * @param token - The reCAPTCHA token to validate
 * @returns A boolean indicating whether the token is valid
 */
async function validateRecaptchaToken(token: string): Promise<boolean> {
    try {
        // Verify the reCAPTCHA token with Google
        const verificationUrl = 'https://www.google.com/recaptcha/api/siteverify';
        const params = new URLSearchParams();
        params.append('secret', PRIVATE_GOOGLE_RECAPTCHA_SECRET_KEY);
        params.append('response', token);

        const recaptchaResponse = await fetch(verificationUrl, {
            method: 'POST',
            body: params
        });
        
        if (!recaptchaResponse.ok) {
            console.error('reCAPTCHA API error:', await recaptchaResponse.text());
            return false;
        }
        
        const recaptchaResult = await recaptchaResponse.json();

        if (!recaptchaResult.success || recaptchaResult.score < 0.5) {
            console.error('reCAPTCHA validation failed:', recaptchaResult);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Error validating reCAPTCHA token:', error);
        return false;
    }
}