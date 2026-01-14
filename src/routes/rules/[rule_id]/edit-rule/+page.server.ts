import type { PageServerLoad, Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';

type RuleRow = {
	id: number;
	name: string;
	ruleGroupId: string;
	dev_eui: string | null;
	is_triggered: boolean;
	trigger_count: number;
	last_triggered: string | null;
	action_recipient: string;
	notifier_type: number;
	send_using: string | null;
	device: { dev_eui: string; name: string | null; location_id: number | null } | null;
	criteria: {
		id: number;
		subject: string;
		operator: string;
		trigger_value: number;
		reset_value: number | null;
	}[];
};

type DeviceRow = {
	dev_eui: string;
	name: string | null;
	location_id: number | null;
};

type NotifierTypeRow = {
	notifier_id: number;
	name: string;
};

export const load: PageServerLoad = async ({ locals, params }) => {
	const { session } = await locals.safeGetSession();

	if (!session) {
		throw redirect(303, '/auth');
	}

	const { supabase } = locals;
	const { rule_id } = params;

	// Fetch the rule with its criteria
	const { data: ruleData, error: ruleError } = await supabase
		.from('cw_rules')
		.select(
			`
			id,
			name,
			ruleGroupId,
			dev_eui,
			is_triggered,
			trigger_count,
			last_triggered,
			action_recipient,
			notifier_type,
			send_using,
			device:cw_devices (
				dev_eui,
				name,
				location_id
			),
			criteria:cw_rule_criteria (
				id,
				subject,
				operator,
				trigger_value,
				reset_value
			)
		`
		)
		.eq('ruleGroupId', rule_id)
		.eq('profile_id', session.user.id)
		.single();

	if (ruleError || !ruleData) {
		console.error('Error fetching rule:', ruleError);
		throw redirect(303, '/rules');
	}

	const row = ruleData as RuleRow;
	const deviceData = Array.isArray(row.device) ? row.device[0] : row.device;
	const criteriaList = Array.isArray(row.criteria) ? row.criteria : [];

	const rule = {
		id: row.id,
		name: row.name,
		ruleGroupId: row.ruleGroupId,
		dev_eui: row.dev_eui,
		is_triggered: row.is_triggered,
		trigger_count: row.trigger_count,
		last_triggered: row.last_triggered,
		action_recipient: row.action_recipient,
		notifier_type: row.notifier_type,
		send_using: row.send_using,
		device_name: deviceData?.name ?? 'Unknown device',
		location_id: deviceData?.location_id ?? null,
		criteria: criteriaList
	};

	// Fetch all devices the user has access to for the device selector
	const { data: devicesData, error: devicesError } = await supabase
		.from('cw_devices')
		.select('dev_eui, name, location_id')
		.order('name', { ascending: true });

	if (devicesError) {
		console.error('Error fetching devices:', devicesError);
	}

	const devices: DeviceRow[] = (devicesData as DeviceRow[] | null) ?? [];

	// Fetch notifier types
	const { data: notifierTypesData, error: notifierTypesError } = await supabase
		.from('cw_notifier_types')
		.select('notifier_id, name')
		.order('name', { ascending: true });

	if (notifierTypesError) {
		console.error('Error fetching notifier types:', notifierTypesError);
	}

	const notifierTypes: NotifierTypeRow[] = (notifierTypesData as NotifierTypeRow[] | null) ?? [];

	return {
		session,
		rule,
		devices,
		notifierTypes
	};
};

export const actions: Actions = {
	update: async ({ request, locals, params }) => {
		const { session } = await locals.safeGetSession();
		if (!session) {
			return fail(401, { error: 'Unauthorized' });
		}

		const { supabase } = locals;
		const { rule_id } = params;

		const formData = await request.formData();

		const name = formData.get('name')?.toString().trim();
		const dev_eui = formData.get('dev_eui')?.toString().trim() || null;
		const notifier_type = formData.get('notifier_type')?.toString().trim();
		const action_recipient = formData.get('action_recipient')?.toString().trim();
		const send_using = formData.get('send_using')?.toString().trim() || null;
		const criteriaJson = formData.get('criteria')?.toString();

		// Validation
		if (!name) {
			return fail(400, { error: 'Rule name is required' });
		}

		if (!notifier_type) {
			return fail(400, { error: 'Notification type is required' });
		}

		if (!action_recipient) {
			return fail(400, { error: 'Action recipient is required' });
		}

		let criteria: {
			id?: number;
			subject: string;
			operator: string;
			trigger_value: number;
			reset_value: number | null;
		}[] = [];

		if (criteriaJson) {
			try {
				criteria = JSON.parse(criteriaJson);
			} catch {
				return fail(400, { error: 'Invalid criteria format' });
			}
		}

		if (criteria.length === 0) {
			return fail(400, { error: 'At least one condition is required' });
		}

		// Validate each criterion
		for (const c of criteria) {
			if (!c.subject || !c.operator || c.trigger_value === undefined) {
				return fail(400, { error: 'Each condition must have a subject, operator, and trigger value' });
			}
		}

		// Update the rule
		const { error: updateError } = await supabase
			.from('cw_rules')
			.update({
				name,
				dev_eui,
				notifier_type: parseInt(notifier_type, 10),
				action_recipient,
				send_using
			})
			.eq('ruleGroupId', rule_id)
			.eq('profile_id', session.user.id);

		if (updateError) {
			console.error('Error updating rule:', updateError);
			return fail(500, { error: 'Failed to update rule. Please try again.' });
		}

		// Get existing criteria IDs
		const { data: existingCriteria } = await supabase
			.from('cw_rule_criteria')
			.select('id')
			.eq('ruleGroupId', rule_id);

		const existingIds = new Set((existingCriteria ?? []).map((c) => c.id));
		const updatedIds = new Set(criteria.filter((c) => c.id).map((c) => c.id));

		// Delete criteria that were removed
		const idsToDelete = [...existingIds].filter((id) => !updatedIds.has(id));
		if (idsToDelete.length > 0) {
			const { error: deleteError } = await supabase
				.from('cw_rule_criteria')
				.delete()
				.in('id', idsToDelete);

			if (deleteError) {
				console.error('Error deleting criteria:', deleteError);
			}
		}

		// Update existing criteria and insert new ones
		for (const c of criteria) {
			if (c.id && existingIds.has(c.id)) {
				// Update existing criterion
				const { error: criteriaUpdateError } = await supabase
					.from('cw_rule_criteria')
					.update({
						subject: c.subject,
						operator: c.operator,
						trigger_value: c.trigger_value,
						reset_value: c.reset_value
					})
					.eq('id', c.id);

				if (criteriaUpdateError) {
					console.error('Error updating criterion:', criteriaUpdateError);
				}
			} else {
				// Insert new criterion
				const { error: criteriaInsertError } = await supabase.from('cw_rule_criteria').insert({
					ruleGroupId: rule_id,
					subject: c.subject,
					operator: c.operator,
					trigger_value: c.trigger_value,
					reset_value: c.reset_value
				});

				if (criteriaInsertError) {
					console.error('Error inserting criterion:', criteriaInsertError);
				}
			}
		}

		throw redirect(303, '/rules');
	},

	delete: async ({ locals, params }) => {
		const { session } = await locals.safeGetSession();
		if (!session) {
			return fail(401, { error: 'Unauthorized' });
		}

		const { supabase } = locals;
		const { rule_id } = params;

		// Delete criteria first (foreign key constraint)
		const { error: criteriaDeleteError } = await supabase
			.from('cw_rule_criteria')
			.delete()
			.eq('ruleGroupId', rule_id);

		if (criteriaDeleteError) {
			console.error('Error deleting criteria:', criteriaDeleteError);
			return fail(500, { error: 'Failed to delete rule criteria.' });
		}

		// Delete the rule
		const { error: ruleDeleteError } = await supabase
			.from('cw_rules')
			.delete()
			.eq('ruleGroupId', rule_id)
			.eq('profile_id', session.user.id);

		if (ruleDeleteError) {
			console.error('Error deleting rule:', ruleDeleteError);
			return fail(500, { error: 'Failed to delete rule.' });
		}

		throw redirect(303, '/rules');
	}
};
