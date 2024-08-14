import type { Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';

export const actions: Actions = {
    updateDeviceInfo: async ({ request, params, fetch }) => {
        const devEui = params.dev_eui; // Assuming device EUI is part of the route parameters

        // Get the form data
        const formData = await request.formData();
        const name = formData.get('name') as string;
        const lat = formData.get('lat') as string;
        const long = formData.get('long') as string;
        const upload_interval = formData.get('upload_interval') as string;
        const battery_changed_at = formData.get('battery_changed_at') as string; // Ensure this is retrieved

        // Optional: Perform any additional server-side validation
        if (!name || !lat || !long || !upload_interval) {
            return fail(400, { error: 'All fields are required.' });
        }

        // Construct the payload to send in the PUT request
        const payload = {
            name,
            lat: parseFloat(lat),
            long: parseFloat(long),
            upload_interval: parseInt(upload_interval),
            battery_changed_at: new Date(battery_changed_at)
        };

        try {
            // Make the PUT request to update the device
            const response = await fetch(`/api/v1/devices/${devEui}`, {
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

    updateLocation: async ({ request, fetch, params, locals }) => {
        const devEui = params.dev_eui; // Assuming device EUI is part of the route parameters

        // Get the form data
        const formData = await request.formData();
        const location_id = formData.get('location_id') as string;

        // Optional: Perform any additional server-side validation
        if (!location_id) {
            return fail(400, { error: 'Location is required.' });
        }

        // Construct the payload to send in the PUT request
        const payload = {
            location_id: parseInt(location_id),
        };

        try {
            // Make the PUT request to update the device location
            const response = await fetch(`/api/v1/devices/${devEui}`, {
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
            return fail(500, { error: 'Failed to update the device location.' });
        }
    },

    addDevicePermission: async ({ request, fetch, params, locals }) => {
        const devEui = params.dev_eui; // Assuming device EUI is part of the route parameters

        // Get the form data
        const formData = await request.formData();
        const email = formData.get('email') as string;
        const permissionLevel = formData.get('permissionLevel') as string;

        // Optional: Perform any additional server-side validation
        if (!email || !permissionLevel) {
            return fail(400, { error: 'Email and permission level are required.' });
        }

        // Construct the payload to send in the POST request
        const payload = {
            email,
            permission_level: permissionLevel
        };

        try {
            // Make the POST request to add the device permission
            const response = await fetch(`/api/v1/permissions/${devEui}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json();
                return fail(500, { error: errorData.message });
            }

            // Return success or redirect
            return JSON.stringify({ success: true });
        } catch (error) {
            console.error('Error submitting form:', error);
            return fail(500, { error: 'Failed to add device permission.' });
        }
    },
};
