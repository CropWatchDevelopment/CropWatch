import { redirect } from '@sveltejs/kit';
import type { PageLoad } from '../../$types';

export const load: PageLoad = async ({ params, locals: { supabase, getSession } }) => {
    const userSession = await getSession();
    if (!userSession) {
        throw redirect(303, '/auth/unauthorized');
    }
};