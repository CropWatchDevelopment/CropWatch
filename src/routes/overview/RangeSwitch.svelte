<script lang="ts">
	import type { OverviewRange } from '$lib/api/api.dtos';
	import { m } from '$lib/paraglide/messages.js';
	import { OVERVIEW_RANGES } from './overview';

	interface Props {
		value: OverviewRange;
		onselect: (range: OverviewRange) => void;
		/** Phone: three equal columns across the page. */
		full?: boolean;
		class?: string;
	}

	let { value, onselect, full = false, class: className = '' }: Props = $props();

	const labels: Record<OverviewRange, () => string> = {
		'24h': m.overview_range_24h,
		'7d': m.overview_range_7d,
		'30d': m.overview_range_30d
	};
</script>

<div
	class={['range', full && 'range--full', className]}
	role="group"
	aria-label={m.overview_range_label()}
>
	{#each OVERVIEW_RANGES as option (option)}
		<button
			type="button"
			class="range__option"
			aria-pressed={value === option}
			onclick={() => onselect(option)}
		>
			{labels[option]()}
		</button>
	{/each}
</div>

<style>
	.range {
		display: flex;
		gap: var(--cw-space-1);
		padding: var(--cw-space-1);
		border-radius: 0.625rem;
		background: var(--cw-bg-muted);
		border: 1px solid var(--cw-border-muted);
	}

	.range--full {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
	}

	.range__option {
		min-height: 2.25rem;
		padding: 0 0.875rem;
		border-radius: 0.4375rem;
		font: inherit;
		font-size: 0.8125rem;
		font-weight: var(--cw-font-medium);
		cursor: pointer;
		border: 1px solid transparent;
		background: transparent;
		color: var(--cw-text-secondary);
		white-space: nowrap;
	}

	.range--full .range__option {
		min-height: 2.5rem;
		padding: 0 var(--cw-space-2);
	}

	.range__option[aria-pressed='true'] {
		border-color: var(--cw-button-primary-border);
		background: var(--cw-button-primary-bg);
		color: var(--cw-button-primary-text);
		box-shadow: var(--cw-button-primary-shadow);
	}

	.range__option:focus-visible {
		outline: var(--cw-focus-ring-width) solid var(--cw-focus-ring-color);
		outline-offset: var(--cw-focus-ring-offset);
	}
</style>
