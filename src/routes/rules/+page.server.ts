import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

type RuleRow = {
	id: number;
	name: string;
	ruleGroupId: string;
	dev_eui: string | null;
	is_triggered: boolean;
	trigger_count: number;
	last_triggered: string | null;
	device: { dev_eui: string; name: string | null; location_id: number | null } | null;
	criteria: {
		subject: string;
		operator: string;
		trigger_value: number;
		reset_value: number | null;
	}[];
};

export const load: PageServerLoad = async ({ locals }) => {
	const { session } = await locals.safeGetSession();

	if (!session) {
		throw redirect(303, '/auth');
	}

	const { supabase } = locals;

	const { data, error } = await supabase
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
			device:cw_devices (
				dev_eui,
				name,
				location_id
			),
			criteria:cw_rule_criteria (
				subject,
				operator,
				trigger_value,
				reset_value
			)
		`
		)
		.eq('profile_id', session.user.id)
		.order('created_at', { ascending: false });

	if (error) {
		console.error('Error fetching rules', error);
	}

	const rules =
		data?.map((row: RuleRow) => {
			const deviceData = Array.isArray(row.device) ? row.device[0] : row.device;
			const criteriaList = Array.isArray(row.criteria) ? row.criteria : [];
			const conditions = criteriaList
				.map((c) => `${c.subject} ${c.operator} ${c.trigger_value}`)
				.join(' • ');

			return {
				id: row.id,
				name: row.name,
				ruleGroupId: row.ruleGroupId,
				dev_eui: row.dev_eui,
				is_triggered: row.is_triggered,
				trigger_count: row.trigger_count,
				last_triggered: row.last_triggered,
				device_name: deviceData?.name ?? 'Unknown device',
				location_id: deviceData?.location_id ?? null,
				conditions
			};
		}) ?? [];

	return {
		session,
		rules
	};
};
