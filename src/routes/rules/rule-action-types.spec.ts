import { describe, expect, it } from 'vitest';
import { m } from '#lib/paraglide/messages.js';
import {
	actionTypeLabel,
	allowedOnDateTimeRule,
	readTargetTemplateId,
	ruleActionKind,
	switchesAnotherRule,
	type RuleActionKind
} from './rule-action-types.ts';

describe('ruleActionKind', () => {
	it.each<[string | null | undefined, RuleActionKind]>([
		['RuleActivate', 'activate_rule'],
		[' ruledeactivate ', 'deactivate_rule'],
		['RULEDEACTIVATESELF', 'deactivate_self'],
		['LoRaWAN', 'relay'],
		['EMail', 'email'],
		['Push', 'push'],
		['LINE', 'other'],
		['', 'other'],
		[null, 'other'],
		[undefined, 'other']
	])('%j is %s', (name, kind) => {
		expect(ruleActionKind(name)).toBe(kind);
	});

	it('knows which kinds need a rule to point at', () => {
		expect(switchesAnotherRule('activate_rule')).toBe(true);
		expect(switchesAnotherRule('deactivate_rule')).toBe(true);
		for (const kind of ['deactivate_self', 'relay', 'email', 'push', 'other'] as const) {
			expect(switchesAnotherRule(kind)).toBe(false);
		}
	});

	it('knows what a Date/Time rule may run: rule switches and relays, no notifications', () => {
		for (const kind of ['activate_rule', 'deactivate_rule', 'deactivate_self', 'relay'] as const) {
			expect(allowedOnDateTimeRule(kind)).toBe(true);
		}
		for (const kind of ['email', 'push', 'other'] as const) {
			expect(allowedOnDateTimeRule(kind)).toBe(false);
		}
	});
});

describe('actionTypeLabel', () => {
	it('names each known type in the reader language', () => {
		expect(actionTypeLabel('EMail')).toBe(m.rules_action_type_email());
		expect(actionTypeLabel('Push')).toBe(m.rules_action_type_push());
		expect(actionTypeLabel('LoRaWAN')).toBe(m.rules_action_type_relay());
		expect(actionTypeLabel('RuleActivate')).toBe(m.rules_action_type_rule_activate());
		expect(actionTypeLabel('RuleDeactivate')).toBe(m.rules_action_type_rule_deactivate());
		expect(actionTypeLabel('RuleDeactivateSelf')).toBe(m.rules_action_type_rule_deactivate_self());
	});

	it('keeps the database name of a type it does not know', () => {
		expect(actionTypeLabel('LINE')).toBe('LINE');
		expect(actionTypeLabel(' sms ')).toBe('sms');
		expect(actionTypeLabel('')).toBe(m.common_not_available());
		expect(actionTypeLabel(null)).toBe(m.common_not_available());
	});
});

describe('readTargetTemplateId', () => {
	it('reads a positive integer only', () => {
		expect(readTargetTemplateId({ targetTemplateId: 12 })).toBe(12);
		for (const config of [
			{ targetTemplateId: '12' },
			{ targetTemplateId: 0 },
			{ targetTemplateId: -4 },
			{ targetTemplateId: 1.5 },
			{ recipient: '12' },
			[12],
			null,
			'12'
		]) {
			expect(readTargetTemplateId(config)).toBeNull();
		}
	});
});
