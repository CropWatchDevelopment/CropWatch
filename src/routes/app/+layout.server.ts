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
