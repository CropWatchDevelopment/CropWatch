import { fail, setError, superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { forgotPasswordFormSchema } from './forms/forgotPassword.schema';
import { DOMAIN } from '$env/static/private';

export const load = async () => {
    const form = await superValidate(zod(forgotPasswordFormSchema));
    return form
}

export const actions = {
    default: async ({ request, locals: { supabase } }) => {
        const form = await superValidate(request, zod(forgotPasswordFormSchema));
        if (form.valid) {
            const resetLink = `/auth/update-password`;
            const { email } = form.data;
            const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: resetLink,
                
            });
            if (error) {
                return fail(400, { form });
            }
            return { status: 200, form };
        }
        return fail(400, { form });
    }
};