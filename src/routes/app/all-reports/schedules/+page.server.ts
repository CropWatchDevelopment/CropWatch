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
            .not('report_endpoint', 'is', null)
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

            // First, check if the record exists for this device/user
            let existingRecord;
            
            if (id !== undefined) {
                // If ID is provided, find by ID
                const { data: recordById } = await supabase
                    .from('report_user_schedule')
                    .select('*')
                    .eq('report_user_schedule_id', id)
                    .single();
                    
                existingRecord = recordById;
            } else {
                // Otherwise, try to find by device and user ID
                const { data: recordByDeviceAndUser } = await supabase
                    .from('report_user_schedule')
                    .select('*')
                    .eq('dev_eui', dev_eui)
                    .eq('user_id', session.user.id)
                    .single();
                    
                existingRecord = recordByDeviceAndUser;
            }
            
            // Build update/insert query
            const scheduleData: Record<string, any> = {
                dev_eui,
                user_id: session.user.id
            };
            
            // Set the appropriate schedule field based on time period
            if (time === 'week') {
                scheduleData.end_of_week = state;
                // If updating an existing record, preserve the other time period setting
                if (existingRecord) {
                    scheduleData.end_of_month = existingRecord.end_of_month;
                }
            } else if (time === 'month') {
                scheduleData.end_of_month = state;
                // If updating an existing record, preserve the other time period setting
                if (existingRecord) {
                    scheduleData.end_of_week = existingRecord.end_of_week;
                }
            } else {
                return fail(400, { 
                    status: 400, 
                    message: 'Invalid schedule type' 
                });
            }
            
            let result;
            
            if (existingRecord) {
                // Update existing record
                const { data, error } = await supabase
                    .from('report_user_schedule')
                    .update(scheduleData)
                    .eq(id !== undefined ? 'report_user_schedule_id' : 'id', id !== undefined ? id : existingRecord.id)
                    .select();
                    
                result = { data, error };
            } else {
                // Insert new record
                const { data, error } = await supabase
                    .from('report_user_schedule')
                    .insert(scheduleData)
                    .select();
                    
                result = { data, error };
            }
            
            if (result.error) {
                console.error('Error updating report schedule:', result.error);
                return fail(500, { 
                    status: 500, 
                    message: 'Failed to update report schedule',
                    details: result.error.message
                });
            }

            return { 
                success: true, 
                data: result.data 
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