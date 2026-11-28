import { m } from '#lib/paraglide/messages.js';

/**
 * What an action type does, by its name in the database (compared in lower
 * case, as the API and the alert service do).
 */
export type RuleActionKind =
	'activate_rule' | 'deactivate_rule' | 'deactivate_self' | 'relay' | 'email' | 'push' | 'other';

export function ruleActionKind(typeName: string | null | undefined): RuleActionKind {
	switch ((typeName ?? '').trim().toLowerCase()) {
		case 'ruleactivate':
			return 'activate_rule';
		case 'ruledeactivate':
			return 'deactivate_rule';
		case 'ruledeactivateself':
			return 'deactivate_self';
		case 'lorawan':
			return 'relay';
		case 'email':
			return 'email';
		case 'push':
			return 'push';
		default:
			return 'other';
	}
}

/** Starts or pauses ANOTHER rule: the action needs a rule to point at. */
export function switchesAnotherRule(kind: RuleActionKind): boolean {
	return kind === 'activate_rule' || kind === 'deactivate_rule';
}

/** A Date/Time rule switches rules and relays; it cannot notify (yet). */
export function allowedOnDateTimeRule(kind: RuleActionKind): boolean {
	return (
		kind === 'activate_rule' ||
		kind === 'deactivate_rule' ||
		kind === 'deactivate_self' ||
		kind === 'relay'
	);
}

/** The action type as people read it; an unknown type keeps its database name. */
export function actionTypeLabel(typeName: string | null | undefined): string {
	switch (ruleActionKind(typeName)) {
		case 'activate_rule':
			return m.rules_action_type_rule_activate();
		case 'deactivate_rule':
			return m.rules_action_type_rule_deactivate();
		case 'deactivate_self':
			return m.rules_action_type_rule_deactivate_self();
		case 'relay':
			return m.rules_action_type_relay();
		case 'email':
			return m.rules_action_type_email();
		case 'push':
			return m.rules_action_type_push();
		default:
			return typeName?.trim() || m.common_not_available();
	}
}

/** config.targetTemplateId as a positive integer, else null. */
export function readTargetTemplateId(config: unknown): number | null {
	if (!config || typeof config !== 'object' || Array.isArray(config)) return null;
	const raw = (config as Record<string, unknown>).targetTemplateId;
	return typeof raw === 'number' && Number.isSafeInteger(raw) && raw > 0 ? raw : null;
}
