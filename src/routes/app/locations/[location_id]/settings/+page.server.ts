import { LocationEditSchema } from "$lib/forms/LocationEdit.schema";
import { fail, type Actions } from "@sveltejs/kit";
import { message, superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';


export const load = (async ({ params, fetch }) => {
    const form = await superValidate(zod(LocationEditSchema));
    const locationPromise = await fetch(`/api/v1/locations/${params.location_id}`);
    const locationData = await locationPromise.json();
    form.data.name = locationData.name;
    form.data.lat = locationData.lat;
    form.data.long = locationData.long

    // Always return { form } in load functions
    return { form };
});

export const actions: Actions = {
    updateLocationInfo: async ({ request, params, fetch }) => {
        const locationEditForm = await superValidate(request, zod(LocationEditSchema));
        const locationId = params.location_id; // Assuming device EUI is part of the route parameters
        if (!locationEditForm.valid) return fail(400, { locationEditForm });

        try {
            // Make the PUT request to update the device
            const response = await fetch(`/api/v1/locations/${locationId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(locationEditForm.data),
            });

            if (!response.ok) {
                const errorData = await response.json();
                return fail(500, { error: errorData.message });
            }

            // Redirect or return success
            return message(locationEditForm, { text: 'Location Info Update Success' })
        } catch (error) {
            console.error('Error submitting form:', error);
            return fail(500, { error: 'Failed to update the device.' });
        }
    },


    addLocationPermissions: async ({ request, params, fetch }) => {
        const locationId = params.location_id; // Assuming device EUI is part of the route parameters
        if (!locationId) {
            return fail(400, { error: 'Location ID is required.' });
        }

        // Get the form data
        const formData = await request.formData();
        const email = formData.get('email') as string;
        const permissionLevel = formData.get('permissionLevel') as string;

        if (!email || !permissionLevel) {
            return fail(400, { error: 'Email or Permission level not supplied.' });
        }

        const resultJson = await fetch(`/api/v1/locations/${locationId}/permissions`, {
            method: 'POST',
            body: JSON.stringify({ email, permissionLevel }),
        });

        const result = await resultJson.json();
        return result;
    },
};