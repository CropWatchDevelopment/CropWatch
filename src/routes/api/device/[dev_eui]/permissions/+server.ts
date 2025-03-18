import { redirect, type RequestHandler } from "@sveltejs/kit";

export const PUT: RequestHandler = async ({ url, request, params, locals: { supabase, safeGetSession } }) => {
    const session = await safeGetSession();
    if (!session.user) {
        return redirect(301, '/auth/unauthorized');
    }

    const devEui = params.dev_eui;
    if (!devEui) {
        return new Response('Invalid device EUI', {
            status: 400
        });
    }

    const { newValue, existingValue } = await request.json();
    if (newValue === undefined) {
        return new Response('Missing new value', {
            status: 400
        });
    }
    if (existingValue === undefined) {
        return new Response('Missing existing value', {
            status: 400
        });
    }

    console.log('PUT /api/device/[dev_eui]/permissions/+server', { devEui, newValue, existingValue });

    const { data: me, error: meError } = await supabase
        .from('cw_device_owners')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('dev_eui', devEui)
        .limit(1)
        .single();
    if (meError) {
        return new Response(meError.message, {
            status: 500
        });
    }
    if (!me) {
        return new Response('Unauthorized', {
            status: 401
        });
    }
    if (me.permission_level > 1) {
        return new Response('Forbidden', {
            status: 403
        });
    }

    const { data: currentPermissionInDB, error: currentPermissionInDBError } = await supabase
        .from('cw_device_owners')
        .select('*')
        .eq('dev_eui', me.dev_eui)
        .eq('id', existingValue.permissionId)
        .limit(1)
        .single();

    if (currentPermissionInDBError) {
        return new Response(currentPermissionInDBError.message, {
            status: 500
        });
    }

    currentPermissionInDB.permission_level = newValue.option.value;

    const { data: updatedPermission, error } = await supabase
        .from('cw_device_owners')
        .upsert(currentPermissionInDB)
        .select('*')
        .single();

    if (error) {
        return new Response(error.message, {
            status: 500
        });
    }

    return new Response(JSON.stringify({updatedPermission}), {
        headers: {
            'Content-Type': 'application/json'
        }
    });
};