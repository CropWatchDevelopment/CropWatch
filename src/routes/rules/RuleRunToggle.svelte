<script lang="ts">
	import { apiErrorMessage } from '#lib/api/api-error.ts';
	import Icon from '#lib/components/Icon.svelte';
	import PAUSE_ICON from '#lib/images/icons/pause.svg';
	import PLAY_ICON from '#lib/images/icons/play.svg';
	import { m } from '#lib/paraglide/messages.js';
	import type { RuleTemplateDto } from '#lib/rules/rule-template.types.ts';
	import { getServices } from '#lib/services/context.ts';
	import { CwButton, CwDialog, useCwToast } from '@cropwatchdevelopment/cwui';

	interface Props {
		templateId: number;
		ruleName: string;
		/** Running now: the button pauses. Otherwise it starts. */
		running: boolean;
		/** The rule as the API returned it after the change. */
		onChanged?: (rule: RuleTemplateDto) => void;
	}

	let { templateId, ruleName, running, onChanged }: Props = $props();

	const toast = useCwToast();
	const { rules } = getServices();
	let confirmOpen = $state(false);
	let busy = $state(false);

	async function setRunning(start: boolean) {
		if (busy) return;
		busy = true;

		try {
			const rule = start ? await rules.startRule(templateId) : await rules.pauseRule(templateId);
			confirmOpen = false;
			onChanged?.(rule);
			toast.add({
				tone: 'success',
				message: start
					? m.rules_started_success({ name: ruleName })
					: m.rules_paused_success({ name: ruleName }),
				duration: 4000,
				dismissible: true
			});
		} catch (error) {
			toast.add({
				tone: 'danger',
				message: apiErrorMessage(error, start ? m.rules_start_failed() : m.rules_pause_failed()),
				duration: 5000,
				dismissible: true
			});
		} finally {
			busy = false;
		}
	}
</script>

{#if running}
	<!-- Pausing stops alerts, so it asks first. -->
	<CwButton
		id={`rule-run-${templateId}-pause-button`}
		variant="secondary"
		size="sm"
		disabled={busy}
		onclick={() => (confirmOpen = true)}
	>
		<Icon src={PAUSE_ICON} alt={m.rules_action_pause_aria({ name: ruleName })} />
	</CwButton>
{:else}
	<CwButton
		id={`rule-run-${templateId}-start-button`}
		variant="secondary"
		size="sm"
		loading={busy}
		disabled={busy}
		onclick={() => setRunning(true)}
	>
		<Icon src={PLAY_ICON} alt={m.rules_action_start_aria({ name: ruleName })} />
	</CwButton>
{/if}

<CwDialog bind:open={confirmOpen} title={m.rules_pause_dialog_title()}>
	<p class="rule-run-toggle__text">{m.rules_pause_confirmation({ name: ruleName })}</p>

	{#snippet actions()}
		<div class="rule-run-toggle__actions">
			<CwButton
				id={`rule-run-${templateId}-cancel-button`}
				variant="secondary"
				size="md"
				disabled={busy}
				onclick={() => (confirmOpen = false)}
			>
				{m.action_cancel()}
			</CwButton>
			<CwButton
				id={`rule-run-${templateId}-confirm-pause-button`}
				variant="danger"
				size="md"
				loading={busy}
				disabled={busy}
				onclick={() => setRunning(false)}
			>
				{m.rules_action_pause()}
			</CwButton>
		</div>
	{/snippet}
</CwDialog>

<style>
	/* The dialog is rendered inside the table's actions cell, which does not wrap its text. */
	.rule-run-toggle__text {
		margin: 0;
		white-space: normal;
		text-align: start;
	}

	.rule-run-toggle__actions {
		display: flex;
		justify-content: flex-end;
		gap: var(--cw-space-1);
	}

	@media (max-width: 639px) {
		.rule-run-toggle__actions {
			flex-direction: column;
		}
	}
</style>
