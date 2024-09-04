import { message, superValidate } from 'sveltekit-superforms';
import type { Actions } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import { zod } from 'sveltekit-superforms/adapters';
import { deviceEditSchema } from '$lib/forms/DeviceEdit.schema';

export const load = async ({ params, fetch }) => {
    const devEui = params.dev_eui;
    try {
        const res = await fetch(`/api/v1/devices/${devEui}`);
        const device = await res.json();
        if (!device) error(404, 'Not found');
        const form = await superValidate(device, zod(deviceEditSchema));

        // Always return { form } in load functions
        return { form };
    } catch (error) {
        console.error('Error loading device data:', error);
        return fail(500, { error: 'Failed to load device data.' });
    }
};

export const actions: Actions = {
    updateDeviceInfo: async ({ request, params, fetch }) => {
        const devEui = params.dev_eui; // Assuming device EUI is part of the route parameters
        const form = await superValidate(request, zod(deviceEditSchema));
        if (!form.valid) {
            // Again, return { form } and things will just work.
            return fail(400, { form });
          }

        try {
            // Make the PUT request to update the device
            const response = await fetch(`/api/v1/devices/${devEui}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(form.data)
            });

            if (!response.ok) {
                const errorData = await response.json();
                return fail(500, { error: errorData.message });
            }

            // Redirect or return success
            return message(form, { text: 'Device Info Update Success' })
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
            const response = await fetch(`/api/v1/devices/${devEui}/permissions`, {
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
            const responseData = await response.json();
            return JSON.stringify({ responseData });
        } catch (error) {
            console.error('Error submitting form:', error);
            return fail(500, { error: 'Failed to add device permission.' });
        }
    },
};
