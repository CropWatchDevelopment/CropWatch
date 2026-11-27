import type { CwTone } from '@cropwatchdevelopment/cwui';
import { formatDateTime, getUiLocale } from '#lib/i18n/format.ts';
import { m } from '#lib/paraglide/messages.js';
import type {
	RuleNextStartDto,
	RuleRunState,
	RuleStatusDto,
	RuleTemplateDto
} from '#lib/rules/rule-template.types.ts';

/** What the Status column shows for one rule. */
export interface RuleStatusView {
	state: RuleRunState;
	tone: CwTone;
	/** One word: Running, Paused or Scheduled. */
	label: string;
	/** When it started or paused, who or what did it, and what is planned next. */
	tooltip: string;
}

/** A rule date with its time zone, so "9:00" cannot be read as someone else's 9:00. */
export function formatRuleInstant(value: string): string {
	return formatDateTime(value, {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
		hour: 'numeric',
		minute: '2-digit',
		timeZoneName: 'short'
	});
}

/** The status the API sent, or the bare running/paused of an API that predates it. */
export function ruleStatusOf(rule: Pick<RuleTemplateDto, 'isActive' | 'status'>): RuleStatusDto {
	return (
		rule.status ?? {
			state: rule.isActive ? 'running' : 'paused',
			since: null,
			reason: null,
			byUserName: null,
			byRule: null,
			autoPauseAt: null,
			thenStart: null,
			nextStart: null
		}
	);
}

function startedSentence(status: RuleStatusDto): string {
	const date = status.since ? formatRuleInstant(status.since) : '';
	if (!date) return m.rules_status_tip_running();

	const rule = status.byRule?.name;
	switch (status.reason) {
		case 'manual':
			return status.byUserName
				? m.rules_status_tip_started_by_user({ name: status.byUserName, date })
				: m.rules_status_tip_started({ date });
		case 'auto_start':
			return m.rules_status_tip_started_auto({ date });
		case 'chain':
			return rule
				? m.rules_status_tip_started_chain({ rule, date })
				: m.rules_status_tip_started_chain_unnamed({ date });
		case 'rule_action':
			return rule
				? m.rules_status_tip_started_by_rule({ rule, date })
				: m.rules_status_tip_started_by_rule_unnamed({ date });
		default:
			return m.rules_status_tip_running_since({ date });
	}
}

function pausedSentence(status: RuleStatusDto): string {
	const date = status.since ? formatRuleInstant(status.since) : '';
	if (!date) return m.rules_status_tip_paused();

	const rule = status.byRule?.name;
	switch (status.reason) {
		case 'manual':
			return status.byUserName
				? m.rules_status_tip_paused_by_user({ name: status.byUserName, date })
				: m.rules_status_tip_paused_on({ date });
		case 'auto_pause':
			return m.rules_status_tip_paused_auto({ date });
		case 'rule_action':
			return rule
				? m.rules_status_tip_paused_by_rule({ rule, date })
				: m.rules_status_tip_paused_by_rule_unnamed({ date });
		default:
			return m.rules_status_tip_paused_since({ date });
	}
}

/** A running rule's pause date and the rule that takes over, when it has them. */
function plannedPauseSentences(status: RuleStatusDto): string[] {
	if (!status.autoPauseAt) return [];
	const sentences = [m.rules_status_tip_pauses_on({ date: formatRuleInstant(status.autoPauseAt) })];
	if (status.thenStart) {
		sentences.push(
			status.thenStart.name
				? m.rules_status_tip_then_starts({ rule: status.thenStart.name })
				: m.rules_status_tip_then_starts_unnamed()
		);
	}
	return sentences;
}

function plannedStartSentence(next: RuleNextStartDto): string {
	const date = formatRuleInstant(next.at);
	if (next.source !== 'chain') return m.rules_status_tip_starts_on({ date });
	return next.byRule?.name
		? m.rules_status_tip_starts_chain({ rule: next.byRule.name, date })
		: m.rules_status_tip_starts_chain_unnamed({ date });
}

const joinSentences = (sentences: string[]) => sentences.join(getUiLocale() === 'ja' ? '' : ' ');

export function describeRuleStatus(status: RuleStatusDto): RuleStatusView {
	if (status.state === 'running') {
		return {
			state: 'running',
			tone: 'success',
			label: m.rules_status_running(),
			tooltip: joinSentences([startedSentence(status), ...plannedPauseSentences(status)])
		};
	}
	// "Scheduled" without a planned start cannot be shown as one.
	if (status.state === 'scheduled' && status.nextStart) {
		return {
			state: 'scheduled',
			tone: 'info',
			label: m.rules_status_scheduled(),
			tooltip: joinSentences([plannedStartSentence(status.nextStart), pausedSentence(status)])
		};
	}
	return {
		state: 'paused',
		tone: 'danger',
		label: m.rules_status_paused(),
		tooltip: pausedSentence(status)
	};
}
