import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { m } from '#lib/paraglide/messages.js';
import { getLocale, overwriteGetLocale } from '#lib/paraglide/runtime.js';
import type { RuleStatusDto } from '#lib/rules/rule-template.types.ts';
import { describeRuleStatus, formatRuleInstant, ruleStatusOf } from './rule-status.ts';

const SINCE = '2026-11-20T00:00:00.000Z';
const NEXT = '2026-12-01T00:00:00.000Z';
// Formatted inside the tests: the text depends on the locale in force there.
const since = () => formatRuleInstant(SINCE);
const next = () => formatRuleInstant(NEXT);

const status = (overrides: Partial<RuleStatusDto> = {}): RuleStatusDto => ({
	state: 'running',
	since: SINCE,
	reason: null,
	byUserName: null,
	byRule: null,
	autoPauseAt: null,
	thenStart: null,
	nextStart: null,
	...overrides
});

const originalGetLocale = getLocale;
beforeEach(() => overwriteGetLocale(() => 'en'));
afterEach(() => overwriteGetLocale(originalGetLocale));

describe('formatRuleInstant', () => {
	it('names the time zone the time is shown in', () => {
		const zone = new Intl.DateTimeFormat('en-US', { timeZoneName: 'short' })
			.formatToParts(new Date(SINCE))
			.find((part) => part.type === 'timeZoneName')?.value;

		expect(zone).toBeTruthy();
		expect(formatRuleInstant(SINCE)).toContain(zone);
		expect(formatRuleInstant(SINCE)).toContain('2026');
	});
});

describe('ruleStatusOf', () => {
	it('uses the status the API sent', () => {
		const sent = status({ state: 'scheduled' });
		expect(ruleStatusOf({ isActive: false, status: sent })).toBe(sent);
	});

	it('falls back to running or paused for an API that sends no status', () => {
		expect(ruleStatusOf({ isActive: true })).toMatchObject({ state: 'running', since: null });
		expect(ruleStatusOf({ isActive: false })).toMatchObject({ state: 'paused', nextStart: null });
	});
});

describe('describeRuleStatus', () => {
	it('a running rule is green and labelled Running', () => {
		expect(describeRuleStatus(status())).toEqual({
			state: 'running',
			tone: 'success',
			label: m.rules_status_running(),
			tooltip: m.rules_status_tip_running_since({ date: since() })
		});
	});

	it.each<[string, Partial<RuleStatusDto>, () => string]>([
		['without a date', { since: null }, () => m.rules_status_tip_running()],
		['with a date that cannot be read', { since: 'never' }, () => m.rules_status_tip_running()],
		[
			'started by a person',
			{ reason: 'manual', byUserName: 'Aki' },
			() => m.rules_status_tip_started_by_user({ name: 'Aki', date: since() })
		],
		[
			'started by someone the viewer may not see',
			{ reason: 'manual' },
			() => m.rules_status_tip_started({ date: since() })
		],
		[
			'started on its start date',
			{ reason: 'auto_start' },
			() => m.rules_status_tip_started_auto({ date: since() })
		],
		[
			'started when a named rule paused',
			{ reason: 'chain', byRule: { id: 2, name: 'Summer' } },
			() => m.rules_status_tip_started_chain({ rule: 'Summer', date: since() })
		],
		[
			'started when a hidden rule paused',
			{ reason: 'chain', byRule: { id: 2, name: null } },
			() => m.rules_status_tip_started_chain_unnamed({ date: since() })
		],
		[
			'started by a named rule',
			{ reason: 'rule_action', byRule: { id: 2, name: 'Night switch' } },
			() => m.rules_status_tip_started_by_rule({ rule: 'Night switch', date: since() })
		],
		[
			'started by a hidden rule',
			{ reason: 'rule_action' },
			() => m.rules_status_tip_started_by_rule_unnamed({ date: since() })
		],
		[
			'with a reason that belongs to pausing',
			{ reason: 'auto_pause' },
			() => m.rules_status_tip_running_since({ date: since() })
		]
	])('running, %s', (_name, overrides, expected) => {
		expect(describeRuleStatus(status(overrides)).tooltip).toBe(expected());
	});

	it('a running rule also says when it pauses and what starts then', () => {
		const base = status({ autoPauseAt: NEXT });

		expect(describeRuleStatus(base).tooltip).toBe(
			`${m.rules_status_tip_running_since({ date: since() })} ${m.rules_status_tip_pauses_on({ date: next() })}`
		);
		expect(describeRuleStatus({ ...base, thenStart: { id: 3, name: 'Winter' } }).tooltip).toContain(
			` ${m.rules_status_tip_then_starts({ rule: 'Winter' })}`
		);
		expect(describeRuleStatus({ ...base, thenStart: { id: 3, name: null } }).tooltip).toContain(
			` ${m.rules_status_tip_then_starts_unnamed()}`
		);
	});

	it('a paused rule is red and labelled Paused', () => {
		expect(describeRuleStatus(status({ state: 'paused' }))).toEqual({
			state: 'paused',
			tone: 'danger',
			label: m.rules_status_paused(),
			tooltip: m.rules_status_tip_paused_since({ date: since() })
		});
	});

	it.each<[string, Partial<RuleStatusDto>, () => string]>([
		['without a date', { since: null }, () => m.rules_status_tip_paused()],
		[
			'paused by a person',
			{ reason: 'manual', byUserName: 'Mei' },
			() => m.rules_status_tip_paused_by_user({ name: 'Mei', date: since() })
		],
		[
			'paused by someone the viewer may not see',
			{ reason: 'manual' },
			() => m.rules_status_tip_paused_on({ date: since() })
		],
		[
			'paused on its pause date',
			{ reason: 'auto_pause' },
			() => m.rules_status_tip_paused_auto({ date: since() })
		],
		[
			'paused by a named rule',
			{ reason: 'rule_action', byRule: { id: 2, name: 'Night switch' } },
			() => m.rules_status_tip_paused_by_rule({ rule: 'Night switch', date: since() })
		],
		[
			'paused by a hidden rule',
			{ reason: 'rule_action', byRule: { id: 2, name: null } },
			() => m.rules_status_tip_paused_by_rule_unnamed({ date: since() })
		],
		[
			'that keeps a pause date for later',
			{ autoPauseAt: NEXT, thenStart: { id: 3, name: 'Winter' } },
			() => m.rules_status_tip_paused_since({ date: since() })
		]
	])('paused, %s', (_name, overrides, expected) => {
		expect(describeRuleStatus(status({ state: 'paused', ...overrides })).tooltip).toBe(expected());
	});

	it('a scheduled rule is blue and says when it starts, then why it is paused', () => {
		const view = describeRuleStatus(
			status({
				state: 'scheduled',
				reason: 'manual',
				byUserName: 'Mei',
				nextStart: { at: NEXT, source: 'date', byRule: null }
			})
		);

		expect(view).toEqual({
			state: 'scheduled',
			tone: 'info',
			label: m.rules_status_scheduled(),
			tooltip: `${m.rules_status_tip_starts_on({ date: next() })} ${m.rules_status_tip_paused_by_user({ name: 'Mei', date: since() })}`
		});
	});

	it.each<[string, RuleStatusDto['nextStart'], () => string]>([
		[
			'a named rule',
			{ at: NEXT, source: 'chain', byRule: { id: 2, name: 'Summer' } },
			() => m.rules_status_tip_starts_chain({ rule: 'Summer', date: next() })
		],
		[
			'a hidden rule',
			{ at: NEXT, source: 'chain', byRule: { id: 2, name: null } },
			() => m.rules_status_tip_starts_chain_unnamed({ date: next() })
		]
	])('scheduled by %s', (_name, nextStart, expected) => {
		expect(describeRuleStatus(status({ state: 'scheduled', nextStart })).tooltip).toContain(
			expected()
		);
	});

	it('"scheduled" without a planned start is shown as paused', () => {
		expect(describeRuleStatus(status({ state: 'scheduled' }))).toMatchObject({
			state: 'paused',
			tone: 'danger'
		});
	});

	it('joins Japanese sentences without a space', () => {
		overwriteGetLocale(() => 'ja');
		const tooltip = describeRuleStatus(status({ autoPauseAt: NEXT })).tooltip;

		expect(tooltip).toBe(
			`${m.rules_status_tip_running_since({ date: formatRuleInstant(SINCE) })}${m.rules_status_tip_pauses_on({ date: formatRuleInstant(NEXT) })}`
		);
		expect(tooltip).toContain('稼働中');
	});
});
