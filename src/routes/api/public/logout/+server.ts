import { redirect } from '@sveltejs/kit';

export const GET = async ({ locals, url }) => {
    await locals.supabase.auth.signOut();
    throw redirect(303, '/auth');
};
