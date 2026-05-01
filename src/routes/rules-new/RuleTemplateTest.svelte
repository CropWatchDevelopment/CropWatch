<script lang="ts">
	import { AppActionRow, AppFormStack, AppNotice } from '$lib/components/layout';
	import {
		evaluateRuleTemplateCriteria,
		type RuleTemplateTestResult
	} from '$lib/rules-new/rule-template-evaluator';
	import type { RuleTemplateCriterionInput } from '$lib/rules-new/rule-template.types';
	import { CwButton, CwCard, CwChip, CwTextArea } from '@cropwatchdevelopment/cwui';
	import { m } from '$lib/paraglide/messages.js';

	interface Props {
		criteria: RuleTemplateCriterionInput[];
	}

	let { criteria }: Props = $props();
	const initialCriteria = (() => criteria)();

	let payloadText = $state(
		JSON.stringify({ decodedPayload: buildSamplePayload(initialCriteria) }, null, 2)
	);
	let testError = $state('');
	let testResult = $state<RuleTemplateTestResult | null>(null);

	function handlePayloadInput() {
		testResult = null;
		testError = '';
	}

	function handleTestRule() {
		testResult = null;
		testError = '';

		if (criteria.length === 0) {
			testError = m.rules_new_test_missing_criteria();
			return;
		}

		let parsed: unknown;
		try {
			parsed = JSON.parse(payloadText);
		} catch {
			testError = m.rules_new_test_parse_failed();
			return;
		}

		const decodedPayload = readDecodedPayload(parsed);
		if (!decodedPayload) {
			testError = m.rules_new_test_payload_object_required();
			return;
		}

		testResult = evaluateRuleTemplateCriteria(criteria, decodedPayload);
	}

	function buildSamplePayload(
		criteriaToSample: RuleTemplateCriterionInput[]
	): Record<string, number> {
		return Object.fromEntries(
			criteriaToSample
				.filter((criterion) => criterion.subject.trim().length > 0)
				.map((criterion) => [criterion.subject, sampleValueForCriterion(criterion)])
		);
	}

	function sampleValueForCriterion(criterion: RuleTemplateCriterionInput): number {
		const triggerValue = Number.isFinite(criterion.triggerValue) ? criterion.triggerValue : 0;

		switch (criterion.operator.trim().toLowerCase()) {
			case '>':
			case 'gt':
			case '!=':
			case 'neq':
				return triggerValue + 1;
			case '<':
			case 'lt':
				return triggerValue - 1;
			default:
				return triggerValue;
		}
	}

	function readDecodedPayload(value: unknown): Record<string, unknown> | null {
		if (!isRecord(value)) return null;
		if (isRecord(value.decodedPayload)) return value.decodedPayload;
		return value;
	}

	function isRecord(value: unknown): value is Record<string, unknown> {
		return typeof value === 'object' && value !== null && !Array.isArray(value);
	}

	function formatActualValue(value: unknown): string {
		if (value === undefined) return m.common_not_available();
		if (typeof value === 'string') return value;
		return JSON.stringify(value);
	}

	function reasonLabel(reason: string | undefined): string {
		switch (reason) {
			case 'unsupported_operator':
				return m.rules_new_test_reason_unsupported_operator();
			case 'non_comparable_value':
				return m.rules_new_test_reason_non_comparable_value();
			case 'reset_not_reached':
				return m.rules_new_test_reason_reset_not_reached();
			default:
				return '';
		}
	}
</script>

<CwCard title={m.rules_new_test_rule()} subtitle={m.rules_new_test_rule_subtitle()}>
	<AppFormStack padded>
		<CwTextArea
			label={m.rules_new_test_payload()}
			rows={8}
			resize="vertical"
			bind:value={payloadText}
			oninput={handlePayloadInput}
		/>

		<AppActionRow>
			<CwButton variant="secondary" onclick={handleTestRule}>{m.rules_new_test_button()}</CwButton>
		</AppActionRow>

		{#if testError}
			<AppNotice tone="danger" ariaLive="polite">
				<p>{testError}</p>
			</AppNotice>
		{/if}

		{#if testResult}
			<AppNotice
				tone={testResult.matches ? 'success' : testResult.canReset ? 'info' : 'warning'}
				title={testResult.matches
					? m.rules_new_test_matches()
					: testResult.canReset
						? m.rules_new_test_can_reset()
						: m.rules_new_test_no_match()}
				ariaLive="polite"
			>
				<div class="rules-new-test__criteria">
					{#each testResult.criteria as criterion, index (criterion.subject + index)}
						<div class="rules-new-test__criterion">
							<div class="rules-new-test__criterion-copy">
								<p class="rules-new-test__criterion-title">
									{criterion.subject}
									{criterion.operator}
									{criterion.triggerValue}
								</p>
								<p>
									{m.rules_new_test_actual_value()}:
									{formatActualValue(criterion.actualValue)}
								</p>
								{#if criterion.reason || criterion.resetReason}
									<p>{reasonLabel(criterion.reason ?? criterion.resetReason)}</p>
								{/if}
							</div>
							<div class="rules-new-test__criterion-status">
								<CwChip
									label={criterion.matched
										? m.rules_new_test_trigger_passed()
										: m.rules_new_test_trigger_failed()}
									tone={criterion.matched ? 'success' : 'danger'}
									variant="soft"
									size="sm"
								/>
								<CwChip
									label={criterion.resetMatched
										? m.rules_new_test_reset_passed()
										: m.rules_new_test_reset_failed()}
									tone={criterion.resetMatched ? 'info' : 'warning'}
									variant="soft"
									size="sm"
								/>
							</div>
						</div>
					{/each}
				</div>
			</AppNotice>
		{/if}
	</AppFormStack>
</CwCard>

<style>
	.rules-new-test__criteria {
		display: grid;
		gap: var(--cw-space-2);
	}

	.rules-new-test__criterion {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		gap: var(--cw-space-3);
		align-items: start;
		padding-block: var(--cw-space-2);
		border-block-start: 1px solid var(--cw-border-muted);
	}

	.rules-new-test__criterion:first-child {
		border-block-start: 0;
		padding-block-start: 0;
	}

	.rules-new-test__criterion-copy {
		display: grid;
		gap: var(--cw-space-1);
		min-width: 0;
	}

	.rules-new-test__criterion-copy p {
		margin: 0;
		font-size: var(--cw-text-sm);
		color: var(--cw-text-secondary);
		overflow-wrap: anywhere;
	}

	.rules-new-test__criterion-copy .rules-new-test__criterion-title {
		font-weight: var(--cw-font-semibold);
		color: var(--cw-text-primary);
	}

	.rules-new-test__criterion-status {
		display: flex;
		flex-wrap: wrap;
		justify-content: flex-end;
		gap: var(--cw-space-1);
	}

	@media (max-width: 639px) {
		.rules-new-test__criterion {
			grid-template-columns: 1fr;
		}

		.rules-new-test__criterion-status {
			justify-content: flex-start;
		}
	}
</style>
