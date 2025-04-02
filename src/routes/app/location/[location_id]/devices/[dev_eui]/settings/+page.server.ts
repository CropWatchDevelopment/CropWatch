import { RuleAddSchema } from "$lib/form-schemas/AddRule.schema";
import { UpdateDeviceGeneralSchema } from "$lib/form-schemas/UpdateDeviceGeneral.schema";
import { UpdateDeviceLatLong } from "$lib/form-schemas/UpdateDeviceLatLong.schema";
import { redirect } from "@sveltejs/kit";
import { fail, superValidate } from "sveltekit-superforms";
import { zod } from "sveltekit-superforms/adapters";

export const load = async ({ params, locals: { supabase, safeGetSession } }) => {
    const session = await safeGetSession();
    if (!session) {
        return redirect(303, '/auth/login?redirect=/app&reason=unauthenticated');
    }
    if (!session.user) {
        return redirect(303, '/auth/unauthorized');
    }

    const location_id = +params.location_id;
    if (!location_id) {
        return redirect(303, '/app');
    }

    const { data: device, error: errorDevice } = await supabase
        .from('cw_devices')
        .select('*')
        .eq('dev_eui', params.dev_eui)
        .limit(1)
        .single();

    const { data: dataLocationPermissions, error: errorLocationPermissions } = await supabase
        .from('cw_location_owners')
        .select('*, profiles(*)')
        .eq('location_id', location_id);

    if (errorLocationPermissions) {
        return {
            status: 500,
            error: new Error(errorLocationPermissions.message)
        };
    }

    const { data: dataDevicePermissions, error: errorDevicePermissions } = await supabase
        .from('cw_device_owners')
        .select('*, profiles(*)')
        .eq('dev_eui', params.dev_eui);

    if (errorDevicePermissions) {
        return {
            status: 500,
            error: new Error(errorDevicePermissions.message)
        };
    }

    const { data: rules, error: errorRules } = await supabase
        .from('cw_rules')
        .select('*, cw_rule_criteria(*)')
        .eq('dev_eui', params.dev_eui);

    if (errorRules) {
        return {
            status: 500,
            error: new Error(errorRules.message)
        };
    }

    const updateDeviceGeneralForm = await superValidate({
        name: device?.name || '',
        lat: device?.lat || 0,
        long: device?.long || 0
    }, zod(UpdateDeviceGeneralSchema));

    const addRuleForm = await superValidate(zod(RuleAddSchema));
    const updateDeviceLocationForm = await superValidate({
        dev_eui: params.dev_eui,
        name: device?.name || '',
        lat: device?.lat || 0,
        long: device?.long || 0
    }, zod(UpdateDeviceLatLong));

    const result = {
        locationPermissons: dataLocationPermissions || [],
        devicePermissions: dataDevicePermissions || [],
        rules: rules || [],
        deviceForm: updateDeviceGeneralForm,
        addRuleForm,
        updateDeviceLocationForm,
    }
    return result;
}

export const actions = {
    createRule: async ({ request, fetch, locals: { supabase, safeGetSession } }) => {
        const session = await safeGetSession();
        if (!session || !session.user) {
            return fail(401, { status: 401, message: 'Unauthorized' });
        }

        const form = await superValidate(request, zod(RuleAddSchema));
        if (form.valid) {
            const result = await fetch('/api/rules', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(form.data),
            });
            console.log('result', await result.json());
            return { status: 200, form };
        }
        return fail(400, { form });
    },
    deleteRule: async ({ request, fetch, url, locals: { supabase, safeGetSession } }) => {
        const session = await safeGetSession();
        if (!session || !session.user) {
            return fail(401, { status: 401, message: 'Unauthorized' });
        }

        const id = url.searchParams.get('id');
        if (!id) {
            return fail(400, { status: 400, message: 'No ID provided' });
        }

        const result = await fetch(`/api/rules?id=${id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
        });
        if (!result.ok) {
            return fail(400, { status: 400, message: 'Failed to delete rule' });
        }
        return { status: 200, result };
    },
    updateDeviceLocation: async ({ request, fetch, url, locals: { supabase, safeGetSession } }) => {
        const session = await safeGetSession();
        if (!session || !session.user) {
            return fail(401, { status: 401, message: 'Unauthorized' });
        }

        const form = await superValidate(request, zod(UpdateDeviceLatLong));
        if (form.valid) {
            const { data, error } = await supabase.from('cw_devices')
                .update({
                    name: form.data.name,
                    lat: form.data.lat,
                    long: form.data.long,
                })
                .eq('dev_eui', form.data.dev_eui)
                .select('*');

            return { status: 200, form };
        }

        return fail(400, { form: form });
    },
    deleteDevice: async ({ request, fetch, params, url, locals: { supabase, safeGetSession } }) => {
        const session = await safeGetSession();
        if (!session || !session.user) {
            return fail(401, { status: 401, message: 'Unauthorized' });
        }

        const devEui = params.dev_eui;
        if (!devEui) {
            return fail(400, { status: 400, message: 'No devEui provided' });
        }

        const { data: devicePermissions, error: errorDevicePermissions } = await supabase
            .from('cw_device_owners')
            .select('*')
            .eq('dev_eui', devEui)
            .eq('user_id', session.user.id)
            .single();
        if (errorDevicePermissions) {
            return fail(400, { status: 400, message: 'Failed to fetch device permissions' });
        }
        if (!devicePermissions) {
            return fail(404, { status: 404, message: 'Device not found' });
        }
        if (devicePermissions.permission_level !== 1) {
            return fail(403, { status: 403, message: 'You do not have permission to delete this device' });
        }
        const { data: deleteDevice, error: errorDeleteDevice } = await supabase
            .from('cw_devices')
            .delete()
            .eq('dev_eui', devEui)
            .eq('user_id', session.user.id)
            .select('*');
        if (errorDeleteDevice) {
            return fail(400, { status: 400, message: 'Failed to delete device' });
        }
        return { status: 200, deleteDevice };
    },
}