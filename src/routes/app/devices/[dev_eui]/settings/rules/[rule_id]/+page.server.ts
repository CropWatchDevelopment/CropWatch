import { convertObject } from "$lib/components/ui/utilities/ConvertSensorDataObject";
import { generateCustomUUIDv4 } from "$lib/components/ui/utilities/generateCustomUUIDv4.js";
import { RuleAddSchema } from "$lib/forms/AddRule.schema";
import { error, redirect, type Actions } from "@sveltejs/kit";
import { fail, message, superValidate } from "sveltekit-superforms";
import { zod } from "sveltekit-superforms/adapters";

export const load = async ({ params, fetch }) => {
    const devEui = params.dev_eui;
    const ruleId = params.rule_id;

    try {
        // Fetch subjects for form fields
        const latestDataPromise = await fetch(`/api/v1/devices/${devEui}/latest-data`);
        const allData = await latestDataPromise.json();
        
        let subjects = [];
        let latestData = convertObject(allData, true);
        delete latestData.created_at;
        for (let key of Object.keys(latestData)) {
            subjects.push({ label: key, value: key });
        }

        let form;
        if (ruleId) {
            // Load existing rule data for editing
            const ruleDataPromise = await fetch(`/api/v1/rules/${devEui}/${ruleId}`);
            const ruleData = await ruleDataPromise.json();
            form = await superValidate(ruleData,zod(RuleAddSchema));
        } else {
            // Set up for new rule
            form = await superValidate(zod(RuleAddSchema));
            form.data.dev_eui = devEui;
            form.data.ruleGroupId = generateCustomUUIDv4();
        }

        return { form, subjects };
    } catch (err) {
        console.error('Error loading device data:', err);
        return fail(500, { error: 'Failed to load device data.' });
    }
};

export const actions: Actions = {
    default: async ({ request, params, fetch, locals: { safeGetSession } }) => {
        const session = await safeGetSession();
        if (!session.user) {
            throw redirect(303, '/auth/unauthorized');
        }
        const form = await superValidate(request, zod(RuleAddSchema));

        const devEui = params.dev_eui;
        const ruleId = params.rule_id;

        if (!devEui) {
            return fail(400, { form });
        }
        form.data.dev_eui = devEui;
        form.data.profile_id = session.user.id;

        if (!form.valid) {
            return fail(400, { form });
        }

        try {
            let ruleResult;

            if (ruleId) {
                // Update existing rule
                ruleResult = await fetch(`/api/v1/rules/${devEui}/${ruleId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(form.data),
                });
            } else {
                // Create new rule
                ruleResult = await fetch(`/api/v1/rules/${devEui}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(form.data),
                });
            }

            if (!ruleResult.ok) {
                return fail(500, { error: 'Failed to save rule.' });
            }

        } catch (error) {
            console.error('Error saving rule:', error);
            return fail(500, { error: 'Failed to save rule.' });
        }
        
        return message(form, { text: ruleId ? 'Rule updated' : 'Rule created' });
    }
};
