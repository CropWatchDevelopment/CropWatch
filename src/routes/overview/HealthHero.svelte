<script lang="ts">
	import type { Snippet } from 'svelte';
	import { m } from '$lib/paraglide/messages.js';
	import type { HealthState } from './overview';

	interface Props {
		state: HealthState;
		title: string;
		/** Whole-number share of devices online. */
		percent: number;
		online: number;
		offline: number;
		activeAlerts: number;
		/** The live status line ("Live · updated 1m 05s ago"). */
		live: Snippet;
		class?: string;
	}

	let {
		state,
		title,
		percent,
		online,
		offline,
		activeAlerts,
		live,
		class: className = ''
	}: Props = $props();

	const RADIUS = 38;
	const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

	const chipLabel: Record<HealthState, () => string> = {
		ok: m.overview_health_chip_ok,
		attention: m.overview_health_chip_attention,
		empty: m.overview_health_chip_empty
	};
</script>

<section class={['hero', className]} aria-label={m.overview_health_label()}>
	<div class="hero__top">
		<div class="hero__ring">
			<svg
				width="92"
				height="92"
				viewBox="0 0 92 92"
				role="img"
				aria-label={m.overview_health_ring({ percent })}
			>
				<circle
					cx="46"
					cy="46"
					r={RADIUS}
					fill="none"
					stroke="var(--cw-chart-grid)"
					stroke-width="10"
				/>
				{#if percent > 0}
					<circle
						cx="46"
						cy="46"
						r={RADIUS}
						fill="none"
						stroke="var(--cw-status-online)"
						stroke-width="10"
						stroke-linecap="round"
						stroke-dasharray={`${((percent / 100) * CIRCUMFERENCE).toFixed(1)} ${CIRCUMFERENCE.toFixed(1)}`}
						transform="rotate(-90 46 46)"
					/>
				{/if}
			</svg>
			<div class="hero__center">
				<span class="hero__percent">{percent}%</span>
				<span class="hero__ring-label">{m.overview_breakdown_online_label()}</span>
			</div>
		</div>
		<div class="hero__text">
			<span class={`hero__chip hero__chip--${state}`}>
				<span class="hero__dot"></span>{chipLabel[state]()}
			</span>
			<div class="hero__title">{title}</div>
			<div class="hero__live">{@render live()}</div>
		</div>
	</div>
	<div class="hero__tiles">
		<div class="tile">
			<span class="tile__value tile__value--success">{online}</span>
			<span class="tile__label">{m.overview_tile_online()}</span>
		</div>
		<div class="tile">
			<span class="tile__value tile__value--danger">{offline}</span>
			<span class="tile__label">{m.overview_tile_offline()}</span>
		</div>
		<div class="tile">
			<span class="tile__value tile__value--warning">{activeAlerts}</span>
			<span class="tile__label">{m.overview_tile_active_alerts()}</span>
		</div>
	</div>
</section>

<style>
	.hero {
		background: var(--cw-bg-surface);
		border: 1px solid var(--cw-border-muted);
		border-radius: var(--cw-card-radius);
		box-shadow: var(--cw-shadow-md);
		padding: var(--cw-space-4);
		display: flex;
		flex-direction: column;
		gap: 0.875rem;
	}

	.hero__top {
		display: flex;
		align-items: center;
		gap: var(--cw-space-4);
	}

	.hero__ring {
		position: relative;
		width: 5.75rem;
		height: 5.75rem;
		flex: none;
	}

	.hero__center {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
	}

	.hero__percent {
		font-size: var(--cw-text-xl);
		font-weight: var(--cw-font-bold);
		line-height: 1.1;
		color: var(--cw-text-primary);
		font-variant-numeric: tabular-nums;
	}

	.hero__ring-label {
		font-size: 0.6875rem;
		color: var(--cw-text-muted);
	}

	.hero__text {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
		min-width: 0;
	}

	.hero__chip {
		align-self: flex-start;
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.1875rem 0.625rem;
		border-radius: var(--cw-radius-pill);
		font-size: var(--cw-text-xs);
		font-weight: var(--cw-font-semibold);
	}

	.hero__dot {
		width: 0.5rem;
		height: 0.5rem;
		border-radius: var(--cw-radius-full);
	}

	.hero__chip--attention {
		background: var(--cw-tone-warning-bg-subtle);
		color: var(--cw-tone-warning-text);
	}

	.hero__chip--attention .hero__dot {
		background: var(--cw-status-warning);
	}

	.hero__chip--ok {
		background: var(--cw-tone-success-bg-subtle);
		color: var(--cw-tone-success-text);
	}

	.hero__chip--ok .hero__dot {
		background: var(--cw-status-online);
	}

	.hero__chip--empty {
		background: var(--cw-tone-secondary-bg-subtle);
		color: var(--cw-tone-secondary-text);
	}

	.hero__chip--empty .hero__dot {
		background: var(--cw-text-muted);
	}

	.hero__title {
		font-size: 1.0625rem;
		font-weight: var(--cw-font-semibold);
		line-height: 1.3;
		color: var(--cw-text-primary);
	}

	.hero__live {
		display: flex;
	}

	.hero__tiles {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: var(--cw-space-2);
	}

	.tile {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
		padding: var(--cw-space-2) 0.625rem;
		border-radius: var(--cw-radius-lg);
		background: var(--cw-bg-surface-elevated);
		border: 1px solid var(--cw-border-muted);
	}

	.tile__value {
		font-size: var(--cw-text-lg);
		font-weight: var(--cw-font-bold);
		font-variant-numeric: tabular-nums;
	}

	.tile__value--success {
		color: var(--cw-tone-success-text);
	}

	.tile__value--danger {
		color: var(--cw-tone-danger-text);
	}

	.tile__value--warning {
		color: var(--cw-tone-warning-text);
	}

	.tile__label {
		font-size: 0.6875rem;
		color: var(--cw-text-muted);
	}
</style>
