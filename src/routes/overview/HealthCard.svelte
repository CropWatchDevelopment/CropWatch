<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import type { HealthState } from './overview';

	interface Props {
		state: HealthState;
		title: string;
		/** "4 devices offline", "2 alerts still active", … */
		parts: string[];
		class?: string;
	}

	let { state, title, parts, class: className = '' }: Props = $props();

	const chipLabel: Record<HealthState, () => string> = {
		ok: m.overview_health_chip_ok,
		attention: m.overview_health_chip_attention,
		empty: m.overview_health_chip_empty
	};
</script>

<section class={['health', className]} aria-label={m.overview_health_label()}>
	<span class={`health__chip health__chip--${state}`}>
		<span class="health__dot"></span>{chipLabel[state]()}
	</span>
	<div class="health__text">
		<div class="health__title">{title}</div>
		<div class="health__sub">{parts.join(' · ')}</div>
	</div>
	{#if state === 'attention'}
		<a class="health__link" href="#attention">{m.overview_health_see_attention()}</a>
	{/if}
</section>

<style>
	.health {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--cw-space-4);
		background: var(--cw-bg-surface);
		border: 1px solid var(--cw-border-muted);
		border-radius: var(--cw-card-radius);
		box-shadow: var(--cw-shadow-md);
		padding: var(--cw-space-4) var(--cw-space-6);
	}

	.health__chip {
		display: inline-flex;
		align-items: center;
		gap: var(--cw-space-2);
		padding: 0.375rem var(--cw-space-3);
		border-radius: var(--cw-radius-pill);
		font-size: 0.8125rem;
		font-weight: var(--cw-font-semibold);
		white-space: nowrap;
	}

	.health__dot {
		width: 0.625rem;
		height: 0.625rem;
		border-radius: var(--cw-radius-full);
	}

	.health__chip--attention {
		background: var(--cw-tone-warning-bg-subtle);
		color: var(--cw-tone-warning-text);
	}

	.health__chip--attention .health__dot {
		background: var(--cw-status-warning);
	}

	.health__chip--ok {
		background: var(--cw-tone-success-bg-subtle);
		color: var(--cw-tone-success-text);
	}

	.health__chip--ok .health__dot {
		background: var(--cw-status-online);
	}

	.health__chip--empty {
		background: var(--cw-tone-secondary-bg-subtle);
		color: var(--cw-tone-secondary-text);
	}

	.health__chip--empty .health__dot {
		background: var(--cw-text-muted);
	}

	.health__text {
		flex: 1 1 20rem;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.health__title {
		font-size: 1.0625rem;
		font-weight: var(--cw-font-semibold);
		color: var(--cw-text-primary);
	}

	.health__sub {
		font-size: var(--cw-text-sm);
		color: var(--cw-text-muted);
	}

	.health__link {
		display: inline-flex;
		align-items: center;
		min-height: 2.75rem;
		font-size: var(--cw-text-sm);
		font-weight: var(--cw-font-medium);
		color: var(--cw-accent-text);
		text-decoration: none;
	}

	.health__link:hover {
		text-decoration: underline;
	}
</style>
