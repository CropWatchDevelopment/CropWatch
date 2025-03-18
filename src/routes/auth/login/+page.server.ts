import { fail, setError, superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { loginFormSchema } from './forms/login.schema';
import { redirect } from '@sveltejs/kit';
import { PUBLIC_DOMAIN } from '$env/static/public';

export const load = async () => {
    const form = await superValidate(zod(loginFormSchema));
    return form
}

export const actions = {
    passwordLogin: async ({ request, locals: { supabase } }) => {
        const form = await superValidate(request, zod(loginFormSchema));
        if (form.valid) {
            const { email, password, rememberMe } = form.data;
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            if (error) {
                return setError(form, '', error.message);
            }
            return { status: 200, form };
        }
        return fail(400, { form });
    },
    googleLogin: async ({ request, locals: { supabase } }) => {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
              redirectTo: `${PUBLIC_DOMAIN}/auth/callback`,
            },
          })
          
          if (data.url) {
            redirect(301, data.url)
          }
    },
    discordLogin: async ({ request, locals: { supabase } }) => {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'discord',
            options: {
              redirectTo: `${PUBLIC_DOMAIN}/auth/callback`,
            },
          })
          
          if (data.url) {
            redirect(301, data.url)
          }
    }
};