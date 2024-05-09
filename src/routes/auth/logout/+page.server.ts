// src/routes/logout/+page.server.js
import { redirect } from '@sveltejs/kit';
import { toast } from '@zerodevx/svelte-toast';

export const actions = {
    logout: async ({ locals }) => {
        const { error } = await locals.supabase.auth.signOut();
        if (error) {
            console.error('Error logging out:', error.message);
            toast.push(`Error logging out!`, {
                theme: {
                    '--toastBackground': 'red',
                    '--toastColor': 'black'
                }
            });
        } else {
            toast.push(`Logged out`, {
                theme: {
                    '--toastBackground': 'silver',
                    '--toastColor': 'black'
                }
            });
        }
        redirect(303, '/auth/login');
    }
}

// we only use this endpoint for the api
// and don't need to see the page
export async function load() {
    redirect(303, '/');
}