import { redirect, fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from './$types';

/**
 * Type definition for schedule time periods
 */
type ScheduleTimePeriod = 'week' | 'month';

/**
 * Loads devices with their report schedules for the current user
 */
export const load: PageServerLoad = async ({ locals: { supabase, safeGetSession } }) => {
    const session = await safeGetSession();
    if (!session?.user) {
        throw redirect(303, '/auth/login?redirect=/app&reason=unauthenticated');
    }

    try {
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

        return { devices: devices || [] };
    } catch (error) {
        console.error('Unexpected error in load function:', error);
        return { devices: [] };
    }
};

export const actions: Actions = {
    /**
     * Updates or creates a reporting schedule for a device
     */
    updateReporting: async ({ request, locals: { supabase, safeGetSession } }) => {
        const session = await safeGetSession();
        if (!session?.user) {
            return fail(401, { status: 401, message: 'Unauthorized' });
        }

        try {
            const formData = await request.formData();
            const dev_eui = formData.get('dev_eui')?.toString();
            const id = formData.has('id') ? Number(formData.get('id')) : undefined;
            const time = formData.get('time')?.toString() as ScheduleTimePeriod | undefined;
            const state = formData.get('state') === 'true';

            // Validate required fields
            if (!dev_eui || !time) {
                return fail(400, {
                    status: 400,
                    message: 'Missing required fields'
                });
            }

            // Build query object
            const query: Record<string, any> = {
                dev_eui,
                user_id: session.user.id
            };
            
            // Include ID if provided
            if (id !== undefined) {
                query.report_user_schedule_id = id;
            }
            
            // Set the appropriate schedule field based on time period
            if (time === 'week') {
                query.end_of_week = state;
            } else if (time === 'month') {
                query.end_of_month = state;
            } else {
                return fail(400, { 
                    status: 400, 
                    message: 'Invalid schedule type' 
                });
            }
            
            // Determine conflict handling strategy
            const onConflict = id !== undefined 
                ? 'report_user_schedule_id'
                : 'dev_eui,user_id';
                
            // Perform the upsert operation
            const { data, error } = await supabase
                .from('report_user_schedule')
                .upsert(query, {
                    onConflict,
                    returning: 'representation'
                })
                .select();
                
            if (error) {
                console.error('Error upserting report schedule:', error);
                return fail(500, { 
                    status: 500, 
                    message: 'Failed to update report schedule',
                    details: error.message
                });
            }

            return { 
                success: true, 
                data 
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('Error in updateReporting:', error);
            return fail(500, { 
                status: 500, 
                message: 'An unexpected error occurred',
                details: errorMessage
            });
        }
    },
};