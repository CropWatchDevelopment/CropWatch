import { message, superValidate } from 'sveltekit-superforms';
import type { Actions } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import { zod } from 'sveltekit-superforms/adapters';
import { deviceEditSchema } from '$lib/forms/DeviceEdit.schema';
import { deviceLocationEditSchema } from '$lib/forms/DeviceLocationEditSchema';

export const load = async ({ params, fetch, locals: { supabase, safeGetSession } }) => {
    const session = await safeGetSession();
    if (!session.user) {
        return redirect(301, '/auth/unauthorized');
    }
    const devEui = params.dev_eui;
    if (!devEui) error(404, 'Not found');

    const role = await supabase.from('cw_device_owners').select('permission_level').eq('dev_eui', devEui).eq('user_id', session.user.id).maybeSingle();
    if (!role) error(403, 'Forbidden');

    try {
        const res = await fetch(`/api/v1/devices/${devEui}`);
        const device = await res.json();
        if (!device) error(404, 'Not found');
        const deviceEdit = await superValidate(device, zod(deviceEditSchema));
        const deviceLocationEditForm = await superValidate(device, zod(deviceLocationEditSchema));

        const locationsRes = await fetch('/api/v1/locations');
        const locationJson = await locationsRes.json();
        deviceLocationEditForm.data.dev_eui = devEui;

        const locationOptions = locationJson
            .filter(
                (obj1, i, arr) => arr.findIndex((obj2) => obj2.location_id === obj1.location_id) === i
            )
            .map((m) => {
                return { label: m.name, value: m.location_id };
            });

        return { deviceEdit, deviceLocationEditForm, locationOptions, userRole: role.data?.permission_level };
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
        const form = await superValidate(request, zod(deviceLocationEditSchema));
        if (!form.valid) {
            // Again, return { form } and things will just work.
            return fail(400, { form });
        }

        try {
            // Make the PUT request to update the device location
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
