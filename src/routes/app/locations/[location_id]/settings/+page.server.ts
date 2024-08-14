import { fail, type Actions } from "@sveltejs/kit";

export const actions: Actions = {
    updateLocationInfo: async ({ request, params, fetch }) => {
        const locationId = params.location_id; // Assuming device EUI is part of the route parameters

        // Get the form data
        const formData = await request.formData();
        const name = formData.get('name') as string;
        const lat = formData.get('lat') as string;
        const long = formData.get('long') as string;

        // Optional: Perform any additional server-side validation
        if (!name || !lat || !long) {
            return fail(400, { error: 'All fields are required.' });
        }

        // Construct the payload to send in the PUT request
        const payload = {
            name,
            lat: parseFloat(lat),
            long: parseFloat(long),
        };

        try {
            // Make the PUT request to update the device
            const response = await fetch(`/api/v1/locations/${locationId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json();
                return fail(500, { error: errorData.message });
            }

            // Redirect or return success
            return JSON.stringify({ success: true })
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
            body: JSON.stringify({email, permissionLevel}),
        });

        const result = await resultJson.json();
        return result;
    },
};