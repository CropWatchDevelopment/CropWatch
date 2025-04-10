import { RuleAddSchema } from "$lib/form-schemas/AddRule.schema";
import { UpdateDeviceLatLong } from "$lib/form-schemas/UpdateDeviceLatLong.schema";
import { nameToJapaneseName } from "$lib/utilities/nameToJapanese";
import { redirect } from "@sveltejs/kit";
import { fail, message, superValidate } from "sveltekit-superforms";
import { zod } from "sveltekit-superforms/adapters";
import { z } from "zod";

const ruleSchema = z.object({
    name: z.string().min(3).max(255),
    dev_eui: z.string().min(16).max(16),
    action_recipient: z.string().min(3).max(255),
    is_triggered: z.boolean().default(false),
    profile_id: z.string(),
    ruleGroupId: z.string(),
    babylon_notifier_type: z.number().default(1),
    // cw_rule_criteria: z.object({
    // ruleGroupId: z.string(),
    subject: z.string().default(''),
    operator: z.string().default(''),
    trigger_value: z.number(),
    reset_value: z.number(),
    // }).array() //.nonempty('You must have at least ONE criteria'),
});

export const load = async ({ params, locals: { supabase, safeGetSession } }) => {
    const session = await safeGetSession();
    if (!session) {
        return redirect(303, '/auth/login?redirect=/app/dashboard&reason=unauthenticated');
    }
    if (!session.user) {
        return redirect(303, '/auth/unauthorized');
    }

    const location_id = +params.location_id;
    if (!location_id) {
        return redirect(303, '/app/dashboard');
    }
    const dev_eui = params.dev_eui;
    if (!dev_eui) {
        return redirect(303, '/app/dashboard');
    }
    const rule_id = params.rule_id;
    if (!rule_id) {
        return redirect(303, '/app/dashboard');
    }

    const { data: device, error: deviceError } = await supabase
        .from('cw_devices')
        .select(`*,
            cw_device_type(*,cw_device_x_cw_data_metadata(*,cw_data_metadata(*)))
            `)
        .eq('dev_eui', dev_eui)
        .limit(1)
        .single();


    if (deviceError) {
        return fail(500, { error: deviceError });
    }
    
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
            return fail(500, { error });
        }


        if (existingRule && existingRule.cw_rule_criteria.length > 0) {
            existingData = {
                name: existingRule.name,
                dev_eui: existingRule.dev_eui,
                babylon_notifier_type: 1,
                action_recipient: existingRule.action_recipient,
                ruleGroupId: existingRule.ruleGroupId,
                subject: existingRule.cw_rule_criteria[0].subject,
                operator: existingRule.cw_rule_criteria[0].operator,
                trigger_value: existingRule.cw_rule_criteria[0].trigger_value,
                reset_value: existingRule.cw_rule_criteria[0].reset_value,
            }
        }
    }

    let SubjectOptions = [];
    SubjectOptions = device.cw_device_type.cw_device_x_cw_data_metadata.map((metadata) => {
        return {
            value: metadata.cw_data_metadata.name,
            label: nameToJapaneseName(metadata.cw_data_metadata.public_name),
        }
    });

    const form = await superValidate(existingData, zod(ruleSchema));
    const data = {
        form,
        SubjectOptions,
    }
    return data;
}

export const actions = {
    createRule: async ({ request, fetch, locals: { supabase, safeGetSession } }) => {
        const session = await safeGetSession();
        if (!session || !session.user) {
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
                babylon_notifier_type: form.data.babylon_notifier_type,
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

            const ruleCriteria = {
                subject: form.data.subject,
                operator: form.data.operator,
                trigger_value: form.data.trigger_value,
                reset_value: form.data.reset_value,
                ruleGroupId: insertedRule.ruleGroupId,
            };
            const { data: insertedRuleCriteria, error: ruleCriteriaError } = await supabase
                .from('cw_rule_criteria')
                .insert(ruleCriteria)
                .select('id, ruleGroupId')
                .single();

            if (ruleCriteriaError) {
                console.error('Error inserting rule criteria:', ruleCriteriaError);
                //remove rule if criteria fails
                const { data: deletedRule, error: deleteRuleError } = await supabase
                    .from('cw_rules')
                    .delete()
                    .eq('id', insertedRule.id)
                    .select('id')
                    .single();
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

        return fail(400, { form });
    },
    updateRule: async ({ request, url, params, fetch, locals: { supabase, safeGetSession } }) => {
        const session = await safeGetSession();
        if (!session || !session.user) {
            return fail(401, { status: 401, message: 'Unauthorized' });
        }
        const form = await superValidate(request, zod(ruleSchema));
        if (!form.valid) {
            return fail(400, { form });
        }

        const rule_id = params.rule_id;
        if (!rule_id) {
            return fail(400, { status: 400, message: 'No rule ID provided' });
        }

        try {
            // First, insert the main rule
            const ruleData = {
                id: rule_id,
                name: form.data.name,
                dev_eui: form.data.dev_eui,
                babylon_notifier_type: form.data.babylon_notifier_type,
                action_recipient: form.data.action_recipient,
                ruleGroupId: form.data.ruleGroupId,
                profile_id: session.user.id,
                is_triggered: false
            };

            const { data: insertedRule, error: ruleError } = await supabase
                .from('cw_rules')
                .update(ruleData)
                .match({ id: rule_id })
                .select('id, ruleGroupId')
                .single();

            if (ruleError) {
                console.error('Error inserting rule:', ruleError);
                return fail(500, {
                    form,
                    error: 'Failed to create rule. Database error occurred.'
                });
            }

            const ruleCriteria = {
                subject: form.data.subject,
                operator: form.data.operator,
                trigger_value: form.data.trigger_value,
                reset_value: form.data.reset_value,
                ruleGroupId: insertedRule.ruleGroupId,
            };
            const { data: insertedRuleCriteria, error: ruleCriteriaError } = await supabase
                .from('cw_rule_criteria')
                .update(ruleCriteria)
                .match({ ruleGroupId: insertedRule.ruleGroupId })
                .select('id, ruleGroupId')
                .single();

            return message(form, { type: 'success', text: 'Rule created successfully' });
        } catch (error) {
            console.error('Error creating rule:', error);
            return fail(500, {
                form,
                error: 'An unexpected error occurred while creating the rule.'
            });
        }

        return fail(400, { form });
    },
    deleteRule: async ({ request, fetch, url, locals: { supabase, safeGetSession } }) => {
        const session = await safeGetSession();
        if (!session || !session.user) {
            return fail(401, { status: 401, message: 'Unauthorized' });
        }
        debugger;

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
}