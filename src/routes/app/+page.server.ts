import { redirect } from "@sveltejs/kit";

/** @type {import('./$types').PageLoad} */
export async function load({ fetch, locals: { getSession } }) {
    let session = await getSession();
    if (!session || !session?.user) throw redirect(304, 'auth/login');

    const locationsRequest = await fetch(`/api/v1/locations`);
    if (locationsRequest.ok) {
        const locationsData = await locationsRequest.json();
        
        return {
            locations: locationsData,
        };
    }

    return {
        locations: [],
    };
}


// /*
// RLS:

// CREATE POLICY user_owns_location
// ON public.cw_locations
// FOR SELECT
// USING (
//     EXISTS (
//         SELECT 1
//         FROM public.cw_location_owners
//         WHERE
//             public.cw_location_owners.location_id = public.cw_locations.location_id
//             AND public.cw_location_owners.user_id = auth.uid() -- Replace `current_user_id()` with your method of obtaining the current user's ID, often `auth.uid()`
//             AND public.cw_location_owners.is_active = true
//     )
// );





// */