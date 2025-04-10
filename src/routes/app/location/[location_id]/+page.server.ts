import { redirect } from "@sveltejs/kit";
import { fail, setError, superValidate } from "sveltekit-superforms";
import { zod } from "sveltekit-superforms/adapters";
import { AddLocationUserPermission } from "./forms/AddLocationUserPermission";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DeleteLocationUserPermission } from "./forms/DeleteLocationUserPermission";
import { UpdateLocationUserPermission } from "./forms/UpdateLocationUserPermission";
import { UpdateLocationGeneralSchema } from "$lib/form-schemas/UpdateLocationGeneral.schema";
import { deviceSchema } from "$lib/components/UI/AddNewDevice/forms/device.schema";

export const load = async ({ params, fetch, locals: { supabase, safeGetSession } }) => {
    const session = await safeGetSession();
    if (!session || !session.user) {
        return redirect(303, '/auth/login?redirect=/app&reason=unauthenticated');
    }

    const addDeviceForm = await superValidate(zod(deviceSchema));

    const location_id = +params.location_id;
    if (!location_id) {
        return redirect(303, '/app/dashboard');
    }

    const { data: location, error: locationError } = await supabase
        .from('cw_locations')
        .select('*, cw_location_owners(*)')
        .eq('location_id', location_id)
        .eq('cw_location_owners.user_id', session.user.id)
        .maybeSingle();

    const { data: locationUsers, error: locationUsersError } = await supabase
        .from('cw_location_owners')
        .select('*, profiles(*)')
        .eq('location_id', location_id)

    if (locationError) {
        return {
            status: 500,
            error: new Error(locationError.message),
        };
    } else {
        if (!location) {
            return redirect(303, '/app/dashboard');
        }
    }

    const addUserPermissionForm = await superValidate({ email: undefined, permission_level: 5 }, zod(AddLocationUserPermission));
    const updateLocationGeneralForm = await superValidate({
        name: location?.name || '',
        location_id: location_id,
        lat: location?.lat || 0,
        long: location?.long || 0
    }, zod(UpdateLocationGeneralSchema));

    const result = {
        location: location || null,
        locationUsers: locationUsers || null,
        addUserPermissionForm: addUserPermissionForm,
        updateLocationGeneralForm: updateLocationGeneralForm,
        addDeviceForm: addDeviceForm,
    }

    return result;
}

export const actions = {
    addLocationPermission: async ({ request, locals: { supabase, safeGetSession } }) => {
        const session = await safeGetSession();
        if (!session || !session.user) {
            return fail(401, { status: 401, message: 'Unauthorized' });
        }

        const form = await superValidate(request, zod(AddLocationUserPermission));
        if (form.valid) {
            console.log('form is valid');

            const profile_id = await findProfileByEmailAddress(supabase, form.data.email);
            if (!profile_id) {
                return setError(form, 'email', 'No profile found with that email address');
            }

            const userExists = await doesUserAlreadyExistForLocation(supabase, profile_id, form.data.location_id);
            if (userExists) {
                return setError(form, 'email', 'User already has permissions for this location', {
                    status: 400,
                });
            }

            const valueToAdd = {
                user_id: profile_id,
                location_id: form.data.location_id,
                permission_level: form.data.permission_level,
                is_active: true,
                description: null,
            };

            const { data, error } = await supabase
                .from('cw_location_owners')
                .insert(valueToAdd)
                .select('*');

            const { data: locationUsers, error: locationUsersError } = await supabase
                .from('cw_location_owners')
                .select('*, profiles(*)')
                .eq('location_id', form.data.location_id);

            if (error) {
                return setError(form, '', error.message);
            }

            // Apply to all sub-devices
            const { data: devices, error: devicesError } = await supabase
                .from('cw_devices')
                .select('dev_eui')
                .eq('location_id', form.data.location_id);
            if (devicesError) {
                return setError(form, '', devicesError.message);
            }
            for (const device of devices) {
                // First insert - don't try to select at the same time
                const { error: insertError } = await supabase
                    .from('cw_device_owners')
                    .insert({
                        user_id: profile_id,
                        dev_eui: device.dev_eui,
                        permission_level: form.data.permission_level ? form.data.permission_level : 4, // 4 = no permission
                    });

                if (insertError) {
                    console.log('FAILED TO INSERT DEVICE OWNER', insertError.message);
                    return setError(form, '', insertError.message);
                }
            }
            return { status: 200, form, locationUsers };
        }
        return fail(400, { form });
    },

    updateLocationGeneralSettings: async ({ request, params, locals: { supabase, safeGetSession } }) => {
        const session = await safeGetSession();
        if (!session || !session.user) {
            return fail(401, { status: 401, message: 'Unauthorized' });
        }

        const location_id: number = +params.location_id;
        if (!location_id) {
            return fail(400, { status: 400, message: 'Invalid location ID' });
        }

        const form = await superValidate(request, zod(UpdateLocationGeneralSchema));
        if (form.valid) {
            const { data, error } = await supabase
                .from('cw_locations')
                .update({
                    name: form.data.name,
                    lat: form.data.lat,
                    long: form.data.long
                })
                .eq('location_id', location_id)
                .select('*');
            if (error) {
                return setError(form, '', error.message);
            }
            return { status: 200, form };
        } else {
            return fail(400, { form });
        }
    },

    updateLocationPermission: async ({ request, params, locals: { supabase, safeGetSession } }) => {
        const session = await safeGetSession();
        if (!session || !session.user) {
            return fail(401, { status: 401, message: 'Unauthorized' });
        }

        const location_id: number = +params.location_id;
        if (!location_id) {
            return fail(400, { status: 400, message: 'Invalid location ID' });
        }

        const form = await superValidate(request, zod(UpdateLocationUserPermission));

        if (!form.data.permission_level) {
            return fail(400, { status: 400, message: 'Permission level is required' });
        }

        if (form.valid) {
            console.log('form is valid');
            // Get YOU user:
            const { data: yourPermission, error: yourPermissionError } = await supabase
                .from('cw_location_owners')
                .select('*')
                .eq('location_id', location_id)
                .eq('user_id', session.user.id)
                .maybeSingle();

            if (yourPermissionError) {
                return setError(form, '', yourPermissionError.message);
            }

            if (yourPermission?.permission_level !== 1) {
                return setError(form, '', 'You do not have permission to delete users from this location');
            }

            const { data, error } = await supabase
                .from('cw_location_owners')
                .update({ permission_level: form.data.permission_level })
                .eq('location_id', location_id)
                .eq('id', form.data.id)
                .select('*');
            if (error) {
                return setError(form, '', error.message);
            }

            return { status: 200, form };
        } else {
            return fail(400, { form });
        }
    },

    deleteLocationPermission: async ({ request, params, locals: { supabase, safeGetSession } }) => {
        const session = await safeGetSession();
        if (!session || !session.user) {
            return fail(401, { status: 401, message: 'Unauthorized' });
        }

        const location_id: number = +params.location_id;
        if (!location_id) {
            return fail(400, { status: 400, message: 'Invalid location ID' });
        }

        const form = await superValidate(request, zod(DeleteLocationUserPermission));
        if (form.valid) {
            console.log('form is valid');
            // Get YOU user:
            const { data: yourPermission, error: yourPermissionError } = await supabase
                .from('cw_location_owners')
                .select('*')
                .eq('location_id', location_id)
                .eq('user_id', session.user.id)
                .maybeSingle();

            if (yourPermissionError) {
                return setError(form, '', yourPermissionError.message);
            }

            if (yourPermission?.permission_level !== 1) {
                return setError(form, '', 'You do not have permission to delete users from this location');
            }

            // remove user permission for ever device in the location
            // Apply to all sub-devices
            const { data: devices, error: devicesError } = await supabase
                .from('cw_devices')
                .select('dev_eui')
                .eq('location_id', location_id);
            if (devicesError) {
                return setError(form, '', devicesError.message);
            }
            for (const device of devices) {
                const { data: deleteDataResult, error: deleteErrorResult } = await supabase
                    .from('cw_device_owners')
                    .delete()
                    .eq('dev_eui', device.dev_eui)
                    .eq('user_id', form.data.permission_user_id)
                    .select('*');
                console.log('deleteDataResult', deleteDataResult, deleteErrorResult);
                if (deleteErrorResult) {
                    return setError(form, '', deleteErrorResult.message);
                }
            }



            const { data: deleteDataResult, error: deleteErrorResult } = await supabase
                .from('cw_location_owners')
                .delete()
                .eq('location_id', location_id)
                .eq('id', form.data.id)
                .select('*');
            if (deleteErrorResult) {
                return setError(form, '', deleteErrorResult.message);
            }

            const { data: locationUsers, error: locationUsersError } = await supabase
                .from('cw_location_owners')
                .select('*, profiles(*)')
                .eq('location_id', location_id)
            return { status: 200, form, locationUsers };
        } else {
            return fail(400, { form });
        }
    },
    deleteLocation: async ({ request, params, locals: { supabase, safeGetSession } }) => {
        const session = await safeGetSession();
        if (!session || !session.user) {
            return fail(401, { status: 401, message: 'Unauthorized' });
        }

        const location_id: number = +params.location_id;
        if (!location_id) {
            return fail(400, { status: 400, message: 'Invalid location ID' });
        }

        const { data: yourPermission, error: yourPermissionError } = await supabase
            .from('cw_location_owners')
            .select('*')
            .eq('location_id', location_id)
            .eq('user_id', session.user.id)
            .eq('permission_level', 1)
            .maybeSingle();
        if (yourPermissionError) {
            return fail(500, { status: 500, message: yourPermissionError.message });
        }
        if (!yourPermission) {
            return fail(403, { status: 403, message: 'You do not have permission to delete this location' });
        }

        if (yourPermission?.permission_level !== 1) {
            return fail(403, { status: 403, message: 'You do not have permission to delete this location' });
        }

        const { data: devices, error: devicesError } = await supabase
            .from('cw_devices')
            .update({ location_id: null })
            .eq('location_id', location_id)
            .select('dev_eui');
        if (devicesError) {
            return fail(500, { status: 500, message: devicesError.message });
        }

        const { data: deleteDataResult, error: deleteErrorResult } = await supabase
            .from('cw_locations')
            .delete()
            .eq('location_id', location_id)
            .select();
        if (deleteErrorResult) {
            return fail(500, { status: 500, message: deleteErrorResult.message });
        }

        return { status: 200 };
    },
};

async function findProfileByEmailAddress(supabase: SupabaseClient, email: string): Promise<string | null> {
    if (!email || email === '') {
        return null;
    }
    const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle();
    if (error) {
        return null;
    }
    return data?.id || null;
};

async function doesUserAlreadyExistForLocation(supabase: SupabaseClient, user_id: string, location_id: number): Promise<boolean | null> {
    if (!user_id || user_id === '') {
        return null;
    }
    const { data, error } = await supabase
        .from('cw_location_owners')
        .select('id')
        .eq('location_id', location_id)
        .eq('user_id', user_id)
        .limit(1)
        .maybeSingle();
    if (error) {
        return null;
    }
    return data?.id ? true : false;
};