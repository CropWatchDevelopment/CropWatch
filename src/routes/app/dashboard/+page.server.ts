import { redirect } from '@sveltejs/kit';
import type { PageLoad } from '../../$types';

export const load: PageLoad = async ({ locals: { safeGetSession } }) => {
    const userSession = await safeGetSession();
    if (!userSession.user) {
        throw redirect(303, '/auth/unauthorized');
    }
};