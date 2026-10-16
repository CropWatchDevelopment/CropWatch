<script lang="ts">
	import { CwDuration, CwTooltip } from '@cropwatchdevelopment/cwui';
	import { formatCwDuration } from '$lib/i18n/format';
	import { m } from '$lib/paraglide/messages.js';

	interface Props {
		/** When the data on screen was aggregated; the counter runs from here. */
		generatedAt: string;
		/** Young enough to call "Live". */
		fresh: boolean;
		/** When the next background refresh starts, given the time now. */
		nextUpdateAt: (now: number) => number | null;
		/** A background refresh is in flight. */
		updating: boolean;
		/** The smaller size used inside the phone hero card. */
		compact?: boolean;
		class?: string;
	}

	let {
		generatedAt,
		fresh,
		nextUpdateAt,
		updating,
		compact = false,
		class: className = ''
	}: Props = $props();

	// Ticks the tooltip's countdown; CwDuration ticks itself.
	let now = $state(Date.now());
	$effect(() => {
		const timer = setInterval(() => (now = Date.now()), 1000);
		return () => clearInterval(timer);
	});

	// The message around the counter, split where {duration} goes so the
	// counter lands in the right place in either language.
	const SLOT = '\u0000';
	const parts = $derived(
		(fresh ? m.overview_live_updated : m.overview_updated)({ duration: SLOT }).split(SLOT)
	);
	const next = $derived(nextUpdateAt(now));
	const tooltip = $derived(
		updating
			? m.overview_updating()
			: next === null
				? ''
				: m.overview_next_update({ duration: formatCwDuration(next - now) })
	);
</script>

<CwTooltip value={tooltip} position="bottom" class={className}>
	<!-- Focusable so keyboard users can reveal the countdown tooltip too. -->
	<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
	<span class="live" class:live--compact={compact} tabindex="0">
		<span class="live__dot" class:live__dot--stale={!fresh} aria-hidden="true"></span>
		<span>{parts[0]}<CwDuration from={generatedAt} />{parts[1] ?? ''}</span>
	</span>
</CwTooltip>

<style>
	.live {
		display: inline-flex;
		align-items: center;
		gap: var(--cw-space-2);
		font-size: var(--cw-text-sm);
		color: var(--cw-text-muted);
		border-radius: var(--cw-radius-sm);
		cursor: default;
	}

	.live:focus-visible {
		outline: var(--cw-focus-ring-width) solid var(--cw-focus-ring-color);
		outline-offset: var(--cw-focus-ring-offset);
	}

	.live__dot {
		width: 0.5rem;
		height: 0.5rem;
		border-radius: var(--cw-radius-full);
		background: var(--cw-status-online);
		box-shadow: 0 0 0 3px var(--cw-tone-success-bg-subtle);
		flex: none;
	}

	.live__dot--stale {
		background: var(--cw-text-muted);
		box-shadow: none;
	}

	.live--compact {
		gap: 0.375rem;
		font-size: var(--cw-text-xs);
	}

	.live--compact .live__dot {
		width: 0.375rem;
		height: 0.375rem;
		box-shadow: none;
	}
</style>
