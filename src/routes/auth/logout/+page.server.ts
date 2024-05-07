// src/routes/logout/+page.server.js
import { redirect } from '@sveltejs/kit';

export const actions = {
    logout: async ({ locals }) => {
        await locals.supabase.auth.signOut()
        redirect(303, '/');
    }
}

// we only use this endpoint for the api
// and don't need to see the page
export async function load() {
    redirect(303, '/');
}