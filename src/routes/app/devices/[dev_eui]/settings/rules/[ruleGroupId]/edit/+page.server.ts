import { convertObject } from '$lib/components/ui/utilities/ConvertSensorDataObject';
import { RuleAddSchema } from '$lib/forms/AddRule.schema';
import { error, redirect, type Actions } from '@sveltejs/kit';
import { fail, message, superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';

export const load = async ({ params, fetch }) => {
	const devEui = params.dev_eui;
	const ruleGroupId = params.ruleGroupId;

	try {
		// Fetch the existing rule data
		const ruleResponse = await fetch(`/api/v1/rules/${devEui}/${ruleGroupId}`);
		if (!ruleResponse.ok) {
			throw new Error('Failed to fetch rule data');
		}
		const ruleData = await ruleResponse.json();

		// Fetch latest data to get the subjects
		const latestDataPromise = await fetch(`/api/v1/devices/${devEui}/latest-data`);
		const allData = await latestDataPromise.json();
		let subjects = [];
		let latestData = convertObject(allData, true);
		delete latestData.created_at;
		for (let key of Object.keys(latestData)) {
			subjects.push({ label: key, value: key });
		}

		// Initialize the form with existing rule data
		const form = await superValidate(ruleData, zod(RuleAddSchema));

		return { form, subjects };
	} catch (error) {
		console.error('Error loading rule data:', error);
		return fail(500, { error: 'Failed to load rule data.' });
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
		const ruleGroupId = params.ruleGroupId;

		if (!devEui || !ruleGroupId) {
			return fail(400, { form });
		}

		form.data.dev_eui = devEui;
		form.data.ruleGroupId = ruleGroupId;
		form.data.profile_id = session.user.id;

		if (!form.valid) {
			return fail(400, { form });
		}

		try {
			const ruleResult = await fetch(`/api/v1/rules/${devEui}/${ruleGroupId}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(form.data)
			});

			if (!ruleResult.ok) {
				return fail(500, { error: 'Failed to update rule.' });
			}

			return message(form, { text: 'Rule updated' });
		} catch (error) {
			console.error('Error updating rule:', error);
			return fail(500, { error: 'Failed to update rule.' });
		}
	}
};