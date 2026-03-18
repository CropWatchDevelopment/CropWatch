import { redirect, type Actions } from '@sveltejs/kit';

export const load = async ({ cookies }) => {
    cookies.delete('jwt', { path: '/' });
    for (const cookieName of cookies.getAll().map(c => c.name)) {
        cookies.delete(cookieName, { path: '/' });
    }
    // Redirect the user after logout
    throw redirect(303, '/auth/login');
};