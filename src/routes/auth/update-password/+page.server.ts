import { message } from 'sveltekit-superforms';
import { fail, redirect } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { UpdatePasswordFormSchema } from './forms/update-password.schema';

export const load = async ({ url, locals: { supabase } }) => {
    // Initialize the form
    const form = await superValidate(zod(UpdatePasswordFormSchema));

    return { form };
};

export const actions = {
    default: async ({ request, params, locals: { supabase } }) => {
        const form = await superValidate(request, zod(UpdatePasswordFormSchema));
        if (!form.valid) {
            return fail(400, { form });
        }

        const { data, error: err } = await supabase.auth.updateUser({
            password: form.data.password
        });

        console.log(data);

        if (err) {
            return fail(400, {
                form: message(form, err.message)
            });
        }

        // Password updated successfully
        return {
            form: message(form, 'Password updated successfully! Redirecting to login...'),
            status: 200,
        };
    }
};