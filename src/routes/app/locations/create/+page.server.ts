import { message, superValidate } from 'sveltekit-superforms';
import { fail } from '@sveltejs/kit';
import { zod } from 'sveltekit-superforms/adapters';
import { LocationSchema } from '$lib/forms/Location.schema.js';


export const load = (async () => {
    const form = await superValidate(zod(LocationSchema));

    // Always return { form } in load functions
    return { form };
});

export const actions = {
    default: async ({ request, fetch }) => {
        const form = await superValidate(request, zod(LocationSchema));
        console.log(form);

        if (!form.valid) {
            // Again, return { form } and things will just work.
            return fail(400, { text: 'aabbcc', form });
        }

        // TODO: Do something with the validated form.data
        const newId = await fetch('/api/v1/locations', {
            method: 'POST',
            body: JSON.stringify(form.data),
            headers: {
                'Content-Type': 'application/json'
            }
        }).then(res => res.json()).then(data => data.location_id);

        if (!newId) {
            // Display an error status message
            return fail(500, { text: 'Server Side Error', form });
        }

        // Display a success status message
        return message(form, { text: 'Location Created Successfully', id: newId });
    }
};