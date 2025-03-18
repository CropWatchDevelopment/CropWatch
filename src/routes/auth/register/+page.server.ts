import { fail } from '@sveltejs/kit';
import { message, superValidate } from 'sveltekit-superforms/server';
import { registerSchema } from './form/register.schema';
import { zod } from 'sveltekit-superforms/adapters';
import { PRIVATE_GOOGLE_RECAPTCHA_SECRET_KEY } from '$env/static/private';

export const load = async () => {
    const form = await superValidate(zod(registerSchema));
    return { form };
};

export const actions = {
    default: async ({ request, locals: { supabase } }) => {
        const form = await superValidate(request, zod(registerSchema));

        if (!form.valid) {
            return fail(400, { form });
        }
        if (!await reCatchaToken(form.data.reCatchaToken)) {
            return fail(400, {
                form: message(form, 'reCAPTCHA failed, please try again')
            });
        }

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
            return fail(400, {
                form: message(form, error.message)
            });
        }

        return { form };
    }
};

async function reCatchaToken(token: string): Promise<boolean> {
    // Verify the reCAPTCHA token with Google
    const verificationUrl = 'https://www.google.com/recaptcha/api/siteverify';
    const params = new URLSearchParams();
    params.append('secret', PRIVATE_GOOGLE_RECAPTCHA_SECRET_KEY);
    params.append('response', token);

    const recaptchaResponse = await fetch(verificationUrl, {
        method: 'POST',
        body: params
    });
    const recaptchaResult = await recaptchaResponse.json();

    if (!recaptchaResult.success || recaptchaResult.score < 0.5) {
        console.error('reCAPTCHA failed:', recaptchaResult);
        return false;
    }

    return true;
}