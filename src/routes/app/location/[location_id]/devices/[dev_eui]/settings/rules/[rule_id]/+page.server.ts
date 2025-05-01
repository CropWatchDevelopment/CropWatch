import { fail, redirect } from "@sveltejs/kit";
import { message, superValidate } from "sveltekit-superforms";
import { zod } from "sveltekit-superforms/adapters";
import { z } from "zod";
import { nameToJapaneseName } from "$lib/utilities/nameToJapanese";
import type { Actions, PageServerLoad } from "./$types";

/**
 * Schema for rule validation
 */
const ruleSchema = z.object({
    name: z.string().min(3, "Name must be at least 3 characters").max(255, "Name cannot exceed 255 characters"),
    dev_eui: z.string().min(16, "Invalid device ID").max(16, "Invalid device ID"),
    action_recipient: z.string().min(3, "At least one recipient is required").max(255),
    is_triggered: z.boolean().default(false),
    profile_id: z.string(),
    ruleGroupId: z.string(),
    notifier_type: z.number().default(3),
    subject: z.string().min(1, "Subject is required"),
    operator: z.string().min(1, "Operator is required"),
    trigger_value: z.number(),
    reset_value: z.number(),
});

/**
 * Load rule data and options
 */
export const load: PageServerLoad = async ({ params, locals: { supabase, safeGetSession } }) => {
    const session = await safeGetSession();
    if (!session?.user) {
        throw redirect(303, '/auth/login?redirect=/app/dashboard&reason=unauthenticated');
    }

    const location_id = +params.location_id;
    const dev_eui = params.dev_eui;
    const rule_id = params.rule_id;

    if (!location_id || !dev_eui || !rule_id) {
        throw redirect(303, '/app/dashboard');
    }

    try {
        // Get device data with metadata
        const { data: device, error: deviceError } = await supabase
            .from('cw_devices')
            .select(`*,
                cw_device_type(*,cw_device_x_cw_data_metadata(*,cw_data_metadata(*)))
            `)
            .eq('dev_eui', dev_eui)
            .limit(1)
            .single();

        if (deviceError) {
            console.error('Error fetching device:', deviceError);
            throw redirect(303, `/app/location/${location_id}/devices?error=device_not_found`);
        }

        // Generate subject options from device metadata
        const subjectOptions = device.cw_device_type.cw_device_x_cw_data_metadata.map((metadata) => ({
            value: metadata.cw_data_metadata.name,
            label: nameToJapaneseName(metadata.cw_data_metadata.public_name),
        }));

        // Load existing rule data for edit mode
        let existingData = {};
        if (rule_id !== 'new') {
            const { data: existingRule, error } = await supabase
                .from('cw_rules')
                .select('*, cw_rule_criteria(*)')
                .eq('dev_eui', dev_eui)
                .eq('id', +rule_id)
                .limit(1)
                .single();

            if (error) {
                console.error('Error fetching rule:', error);
                throw redirect(303, `/app/location/${location_id}/devices/${dev_eui}/settings?tab=Rules&error=rule_not_found`);
            }

            if (existingRule?.cw_rule_criteria?.length > 0) {
                existingData = {
                    name: existingRule.name,
                    dev_eui: existingRule.dev_eui,
                    notifier_type: existingRule.notifier_type,
                    action_recipient: existingRule.action_recipient,
                    ruleGroupId: existingRule.ruleGroupId,
                    subject: existingRule.cw_rule_criteria[0]?.subject || '',
                    operator: existingRule.cw_rule_criteria[0]?.operator || '',
                    trigger_value: existingRule.cw_rule_criteria[0]?.trigger_value || 0,
                    reset_value: existingRule.cw_rule_criteria[0]?.reset_value || 0,
                };
            }
        }

        const { data: notificationTypes, error: notificationError } = await supabase
            .from('cw_notifier_types')
            .select('*');

        const form = await superValidate(existingData, zod(ruleSchema));

        return {
            form,
            SubjectOptions: subjectOptions,
            notificationTypes: notificationTypes ?? [],
            session
        };
    } catch (error) {
        console.error('Error in load function:', error);
        throw redirect(303, `/app/location/${location_id}/devices?error=unexpected_error`);
    }
};

export const actions: Actions = {
    /**
     * Create a new rule with criteria
     */
    createRule: async ({ request, locals: { supabase, safeGetSession } }) => {
        const session = await safeGetSession();
        if (!session?.user) {
            return fail(401, { status: 401, message: 'Unauthorized' });
        }

        const form = await superValidate(request, zod(ruleSchema));
        if (!form.valid) {
            return fail(400, { form });
        }

        try {
            // First, insert the main rule
            const ruleData = {
                name: form.data.name,
                dev_eui: form.data.dev_eui,
                notifier_type: form.data.notifier_type,
                action_recipient: form.data.action_recipient,
                ruleGroupId: form.data.ruleGroupId,
                profile_id: session.user.id,
                is_triggered: false
            };

            const { data: insertedRule, error: ruleError } = await supabase
                .from('cw_rules')
                .insert(ruleData)
                .select('id, ruleGroupId')
                .single();

            if (ruleError) {
                console.error('Error inserting rule:', ruleError);
                return fail(500, {
                    form,
                    error: 'Failed to create rule. Database error occurred.'
                });
            }

            // Next, insert the rule criteria
            const ruleCriteria = {
                subject: form.data.subject,
                operator: form.data.operator,
                trigger_value: form.data.trigger_value,
                reset_value: form.data.reset_value,
                ruleGroupId: insertedRule.ruleGroupId,
            };

            const { error: ruleCriteriaError } = await supabase
                .from('cw_rule_criteria')
                .insert(ruleCriteria);

            if (ruleCriteriaError) {
                console.error('Error inserting rule criteria:', ruleCriteriaError);

                // Clean up by removing the rule if criteria insertion fails
                await supabase
                    .from('cw_rules')
                    .delete()
                    .eq('id', insertedRule.id);

                return fail(500, {
                    form,
                    error: 'Failed to create rule criteria. Database error occurred.'
                });
            }

            return message(form, { type: 'success', text: 'Rule created successfully' });
        } catch (error) {
            console.error('Error creating rule:', error);
            return fail(500, {
                form,
                error: 'An unexpected error occurred while creating the rule.'
            });
        }
    },

    /**
     * Update an existing rule and its criteria
     */
    updateRule: async ({ params, request, locals: { supabase, safeGetSession } }) => {
        const session = await safeGetSession();
        if (!session?.user) {
            return fail(401, { status: 401, message: 'Unauthorized' });
        }

        const form = await superValidate(request, zod(ruleSchema));
        if (!form.valid) {
            return fail(400, { form });
        }

        const rule_id = params.rule_id;
        if (!rule_id || rule_id === 'new') {
            return fail(400, { form, error: 'Invalid rule ID' });
        }

        try {
            // Update the main rule
            const ruleData = {
                name: form.data.name,
                dev_eui: form.data.dev_eui,
                notifier_type: form.data.notifier_type,
                action_recipient: form.data.action_recipient,
                ruleGroupId: form.data.ruleGroupId,
            };

            const { data: updatedRule, error: ruleError } = await supabase
                .from('cw_rules')
                .update(ruleData)
                .eq('id', rule_id)
                .select('id, ruleGroupId')
                .single();

            if (ruleError) {
                console.error('Error updating rule:', ruleError);
                return fail(500, {
                    form,
                    error: 'Failed to update rule. Database error occurred.'
                });
            }

            // Update the rule criteria
            const ruleCriteria = {
                subject: form.data.subject,
                operator: form.data.operator,
                trigger_value: form.data.trigger_value,
                reset_value: form.data.reset_value,
            };

            const { error: ruleCriteriaError } = await supabase
                .from('cw_rule_criteria')
                .update(ruleCriteria)
                .eq('ruleGroupId', updatedRule.ruleGroupId);

            if (ruleCriteriaError) {
                console.error('Error updating rule criteria:', ruleCriteriaError);
                return fail(500, {
                    form,
                    error: 'Failed to update rule criteria. Database error occurred.'
                });
            }

            return message(form, { type: 'success', text: 'Rule updated successfully' });
        } catch (error) {
            console.error('Error updating rule:', error);
            return fail(500, {
                form,
                error: 'An unexpected error occurred while updating the rule.'
            });
        }
    },

    /**
     * Delete a rule and its criteria
     */
    deleteRule: async ({ request, url, locals: { supabase, safeGetSession } }) => {
        const session = await safeGetSession();
        if (!session?.user) {
            return fail(401, { status: 401, message: 'Unauthorized' });
        }

        const id = url.searchParams.get('id');
        if (!id) {
            return fail(400, { status: 400, message: 'No rule ID provided' });
        }

        try {
            const result = await fetch(`/api/rules?id=${id}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!result.ok) {
                const errorData = await result.json().catch(() => null);
                return fail(result.status, {
                    status: result.status,
                    message: errorData?.message || 'Failed to delete rule'
                });
            }

            return { status: 200, success: true };
        } catch (error) {
            console.error('Error deleting rule:', error);
            return fail(500, {
                status: 500,
                message: 'An unexpected error occurred while deleting the rule'
            });
        }
    },
};