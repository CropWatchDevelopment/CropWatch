<script lang="ts">
	import type { Snippet } from 'svelte';

	// An elevated CwCard (same tokens) that can carry an id for in-page links
	// and restyle itself for the phone layout of the approved design.
	interface Props {
		title: string;
		subtitle?: string;
		/** The phone design drops most subtitles. */
		subtitleOnPhone?: boolean;
		/** Phone: no card around the section (the items are cards). */
		bareOnPhone?: boolean;
		/** Phone: put the actions on their own full-width row under the title. */
		stackOnPhone?: boolean;
		id?: string;
		class?: string;
		actions?: Snippet;
		children: Snippet;
	}

	let {
		title,
		subtitle,
		subtitleOnPhone = false,
		bareOnPhone = false,
		stackOnPhone = false,
		id,
		class: className = '',
		actions,
		children
	}: Props = $props();

	const headingId = $props.id();
</script>

<section
	{id}
	class={[
		'section',
		bareOnPhone && 'section--bare-phone',
		stackOnPhone && 'section--stack-phone',
		className
	]}
	aria-labelledby={headingId}
>
	<div class="section__header">
		<div class="section__titles">
			<h2 id={headingId} class="section__title">{title}</h2>
			{#if subtitle}
				<p class="section__subtitle" class:section__subtitle--phone={subtitleOnPhone}>
					{subtitle}
				</p>
			{/if}
		</div>
		{#if actions}
			<div class="section__actions">{@render actions()}</div>
		{/if}
	</div>
	{@render children()}
</section>

<style>
	.section {
		background: var(--cw-bg-surface);
		border: 1px solid var(--cw-border-muted);
		border-radius: var(--cw-card-radius);
		box-shadow: var(--cw-shadow-md);
		overflow: hidden;
		min-width: 0;
		scroll-margin-top: var(--cw-space-4);
	}

	.section__header {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--cw-space-3) var(--cw-space-4);
		padding: var(--cw-space-4) var(--cw-space-6) 0;
	}

	.section__titles {
		min-width: 0;
	}

	.section__title {
		margin: 0;
		font-size: var(--cw-text-lg);
		font-weight: var(--cw-font-semibold);
		line-height: var(--cw-leading-tight);
		color: var(--cw-text-primary);
	}

	.section__subtitle {
		margin: var(--cw-space-1) 0 0;
		font-size: var(--cw-text-sm);
		color: var(--cw-text-muted);
	}

	@container overview (width < 640px) {
		.section__header {
			align-items: baseline;
			padding: var(--cw-space-4) var(--cw-space-4) 0;
		}

		.section--stack-phone .section__header {
			flex-direction: column;
			flex-wrap: nowrap;
			align-items: stretch;
		}

		.section__subtitle {
			display: none;
		}

		.section__subtitle--phone {
			display: block;
			font-size: 0.8125rem;
		}

		.section__actions {
			min-width: 0;
		}

		.section--bare-phone {
			background: none;
			border: none;
			box-shadow: none;
			overflow: visible;
			border-radius: 0;
		}

		.section--bare-phone .section__header {
			padding: 0 0.125rem;
		}
	}
</style>
