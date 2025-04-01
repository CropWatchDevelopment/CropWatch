import { redirect } from "@sveltejs/kit";
import { getThemeNames } from "@layerstack/tailwind";
import themes from './../../themes.json' with { type: 'json' };

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
