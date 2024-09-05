import { LocationEditSchema } from "$lib/forms/LocationEdit.schema";
import { LocationPermissionSchema } from "$lib/forms/LocationPermission.schema";
import type { Tables } from "$lib/types/supabaseSchema";
import { fail, redirect, type Actions } from "@sveltejs/kit";
import { message, superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';

type locationPermissionType = Tables<'cw_location_owners'>;

export const load = (async ({ params, fetch, locals: { supabase, safeGetSession } }) => {
    const session = await safeGetSession();
    if (!session.user) {
        return redirect(301, '/auth/unauthorized');
    }
    const locationEditForm = await superValidate(zod(LocationEditSchema));
    const locationPromise = await fetch(`/api/v1/locations/${params.location_id}`);
    const locationData = await locationPromise.json();
    locationEditForm.data.name = locationData.name;
    locationEditForm.data.lat = locationData.lat;
    locationEditForm.data.long = locationData.long

    const permissionForm = await superValidate(zod(LocationPermissionSchema));

    let locationPermissions: locationPermissionType[] = [];
    try {
        const locationPermissionPromise = await fetch(
            `/api/v1/locations/${params.location_id}/permissions`
        );
        locationPermissions = await locationPermissionPromise.json();
        if (session.user.email.includes('cropwatch.io')) {
            locationPermissions = locationPermissions.filter((permission) => {
                return permission.email.includes('cropwatch.io');
            });
        }
    } catch (error) {

    }

    // Always return { form } in load functions
    return { locationEditForm, permissionForm, locationPermissions };
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
        const locationPermissionForm = await superValidate(request, zod(LocationPermissionSchema));

        if (!locationPermissionForm.valid) return fail(400, { locationPermissionForm });
        if (!locationId) return fail(400, { error: 'Location ID is required.' });

        const resultJson = await fetch(`/api/v1/locations/${locationId}/permissions`, {
            method: 'POST',
            body: JSON.stringify({ email: locationPermissionForm.data.email, permissionLevel: locationPermissionForm.data.permission_level }),
        });

        if (!resultJson.ok) {
            const errorData = await resultJson.json();
            return fail(500, { error: errorData.message });
        }

        const user = await resultJson.json();

        return message(locationPermissionForm, { text: 'Location Permissions Update Success', user })
    },
};