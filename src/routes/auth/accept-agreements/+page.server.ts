import { fail, redirect } from "@sveltejs/kit";

export const actions = {
    accept_agreements: async (event) => {
        const { request, url, locals } = event;
        const formData = await request.formData();

        const session = await locals.safeGetSession();
        if (!session.user) {
            return redirect(301, '/auth/unauthorized');
        }


        let privacy = formData.get('privacy_accept') as unknown as boolean;
        let eula = formData.get('eula_accept') as unknown as boolean;
        let cookie = formData.get('cookie_accept') as unknown as boolean;

        if (!privacy || !eula || !cookie) {
            return fail(400, {
                message: 'You must accept ALL of the terms and conditions',
                invalid: true,
            });
        }

        let allAccepted: boolean = privacy && eula && cookie;

        let result = await locals.supabase.from('profiles').update({ accepted_agreements: allAccepted }).eq('id', session.user.id).select('accepted_agreements');

        return {
            status: 201,
            redirect: '/app/dashboard',
            result: result,
        }
    },
}
