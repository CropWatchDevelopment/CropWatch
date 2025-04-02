import { redirect, fail } from "@sveltejs/kit";

export const load = async ({ params, fetch, locals: { supabase, safeGetSession } }) => {
    const session = await safeGetSession();
    if (!session || !session.user) {
        return redirect(303, '/auth/login?redirect=/app&reason=unauthenticated');
    }

    const { data: devices, error } = await supabase
        .from('cw_devices')
        .select(`
            *,
            report_user_schedule(*)
        `)
        .eq('report_user_schedule.user_id', session.user.id);
    if (error) {
        console.error('Error fetching devices:', error);
        return { devices: [] };
    }
    const result = {
        devices,
    };
    return result;
}

export const actions = {
    updateReporting: async ({ request, fetch, locals: { supabase, safeGetSession } }) => {
        const session = await safeGetSession();
        if (!session || !session.user) {
            return fail(401, { status: 401, message: 'Unauthorized' });
        }

        const formData = await request.formData();
        const dev_eui = formData.get('dev_eui')?.toString();
        const id = formData.get('id') !== undefined ? +formData.get('id') : undefined;
        const time = formData.get('time')?.toString();
        const state = formData.get('state') === 'true';

        if (!dev_eui || !time || state === undefined) {
            return fail(400, {
                status: 400,
                message: 'Missing required fields'
            });
        }

        try {
            // Use upsert with proper conflict handling
            const query = {
                dev_eui,
                user_id: session.user.id
            };
            
            if (id !== undefined) {
                query.report_user_schedule_id = id;
            }
            
            // Set the appropriate field based on schedule type
            if (time === 'week') {
                query.end_of_week = state;
            } else if (time === 'month') {
                query.end_of_month = state;
            }
            
            // Use proper conflict key depending on whether we have an ID
            const { data, error } = await supabase
                .from('report_user_schedule')
                .upsert(query, {
                    onConflict: id !== undefined 
                        ? 'report_user_schedule_id'
                        : 'dev_eui,user_id',
                    returning: 'representation'
                })
                .select();
                
            if (error) {
                console.error('Error upserting report schedule:', error);
                return fail(500, { status: 500, message: 'Failed to update report schedule' });
            }

            return { success: true, data };
        } catch (error) {
            console.error('Error in updateReporting:', error);
            return fail(500, { status: 500, message: 'An unexpected error occurred' });
        }
    },
};