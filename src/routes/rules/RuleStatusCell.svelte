<script lang="ts">
	import { CwTooltip, type CwTooltipPosition } from '@cropwatchdevelopment/cwui';
	import Icon from '#lib/components/Icon.svelte';
	import CALENDAR_CLOCK_ICON from '#lib/images/icons/calendar_clock.svg';
	import PLAY_ICON from '#lib/images/icons/play.svg';
	import STOP_ICON from '#lib/images/icons/stop.svg';
	import type { RuleStatusDto } from '#lib/rules/rule-template.types.ts';
	import { describeRuleStatus } from './rule-status.ts';

	interface Props {
		status: RuleStatusDto;
		/**
		 * Where the tooltip opens. Beside the icon in a table row; below it when
		 * the table shows its rows as cards, where there is no room beside.
		 */
		tooltipPosition?: CwTooltipPosition;
	}

	let { status, tooltipPosition = 'right' }: Props = $props();

	const ICONS = { running: PLAY_ICON, paused: STOP_ICON, scheduled: CALENDAR_CLOCK_ICON };
	let view = $derived(describeRuleStatus(status));
</script>

<!-- Its own box, so the tooltip is placed against the icon and not against a stretched cell. -->
<span class="rule-status-cell">
	<CwTooltip value={view.tooltip} position={tooltipPosition} tone={view.tone}>
		<!-- Focusable so keyboard and touch users can open the tooltip too. -->
		<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
		<span
			class="rule-status rule-status--{view.state}"
			data-state={view.state}
			role="img"
			aria-label={view.label}
			tabindex="0"
		>
			<Icon src={ICONS[view.state]} />
		</span>
	</CwTooltip>
</span>

<style>
	.rule-status-cell {
		display: inline-flex;
		justify-self: start;
		/* Narrower than a phone's table card, so the bubble is never cut off by it. */
		--cw-tooltip-max-width: min(20rem, calc(100vw - 6rem));
	}

	.rule-status {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--cw-radius-md);
	}

	.rule-status:focus-visible {
		outline: 2px solid var(--cw-primary-500);
		outline-offset: 2px;
	}

	.rule-status--running {
		color: var(--cw-success-500);
	}

	.rule-status--paused {
		color: var(--cw-danger-500);
	}

	.rule-status--scheduled {
		color: var(--cw-info-500);
	}
</style>
