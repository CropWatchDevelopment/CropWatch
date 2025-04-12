import { redirect } from "@sveltejs/kit";

export const load = async ({ fetch, locals: { supabase, safeGetSession } }) => {
    const session = await safeGetSession();
    if (!session) {
        return redirect(303, '/auth/login?redirect=/app&reason=unauthenticated');
    }

    return {
        // themes: getThemeNames(themes),
        themes: { light: ['light'], dark: ['dark'] },
    };
}
