<script lang="ts">
	import type { OverviewDto } from '$lib/api/api.dtos';
	import { formatRelative } from '$lib/i18n/format';
	import { m } from '$lib/paraglide/messages.js';
	import OverviewSection from './OverviewSection.svelte';

	interface Props {
		notes: OverviewDto['notes'];
		locale: string;
		now: number;
		class?: string;
	}

	let { notes, locale, now, class: className = '' }: Props = $props();
</script>

<OverviewSection title={m.overview_notes_title()} bareOnPhone class={className}>
	{#if notes.length === 0}
		<p class="notes-empty">{m.overview_notes_empty()}</p>
	{:else}
		<ul class="notes">
			{#each notes as note (note.id)}
				{@const place = note.locationName ?? note.deviceName}
				{@const author = note.author ?? (note.authorIsStaff ? m.common_staff_author() : null)}
				<li class="note">
					<p class="note__text">
						<strong class="note__title">{note.title}</strong>{#if note.note}<span class="note__body"
								>{note.note}</span
							>{/if}
					</p>
					<div class="note__meta">
						{#if place}<span class="note__chip">{place}</span>{/if}
						<span class="note__by">
							{[author, formatRelative(note.createdAt, now, locale)].filter(Boolean).join(' · ')}
						</span>
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</OverviewSection>

<style>
	.notes {
		list-style: none;
		margin: 0;
		padding: var(--cw-space-3) var(--cw-space-6) var(--cw-space-5);
		display: flex;
		flex-direction: column;
		gap: var(--cw-space-2);
	}

	.notes-empty {
		margin: 0;
		padding: var(--cw-space-3) var(--cw-space-6) var(--cw-space-5);
		font-size: var(--cw-text-sm);
		color: var(--cw-text-muted);
	}

	.note {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
		padding: 0.625rem var(--cw-space-3);
		border-radius: var(--cw-radius-lg);
		background: var(--cw-bg-surface-elevated);
		border: 1px solid var(--cw-border-muted);
	}

	.note__text {
		margin: 0;
		font-size: var(--cw-text-sm);
		line-height: 1.45;
		color: var(--cw-text-secondary);
		overflow-wrap: anywhere;
	}

	.note__title {
		font-weight: var(--cw-font-semibold);
		color: var(--cw-text-primary);
	}

	.note__body {
		margin-left: 0.25em;
	}

	.note__meta {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.375rem;
		font-size: var(--cw-text-xs);
		color: var(--cw-text-muted);
	}

	.note__chip {
		padding: 0.125rem var(--cw-space-2);
		border-radius: var(--cw-radius-pill);
		background: var(--cw-tone-secondary-bg-subtle);
		color: var(--cw-tone-secondary-text);
		font-weight: var(--cw-font-medium);
	}

	/* Phone: a sideways carousel of note cards. */
	@container overview (width < 640px) {
		.notes {
			flex-direction: row;
			gap: var(--cw-space-2);
			overflow-x: auto;
			scroll-snap-type: x mandatory;
			/* Snap to the gutter, not the screen edge. */
			scroll-padding-inline: var(--cw-space-4);
			scrollbar-width: none;
			margin: 0.625rem calc(-1 * var(--cw-space-4)) 0;
			padding: 0 var(--cw-space-4) 0.375rem;
		}

		.notes::-webkit-scrollbar {
			display: none;
		}

		.notes-empty {
			padding: 0.625rem 0.125rem 0;
		}

		.note {
			flex: 0 0 17rem;
			scroll-snap-align: start;
			gap: 0.625rem;
			padding: 0.875rem;
			border-radius: var(--cw-card-radius);
			background: var(--cw-bg-surface);
			border-color: var(--cw-border-default);
			box-shadow: var(--cw-shadow-sm);
		}

		.note__meta {
			display: contents;
		}

		.note__chip {
			order: -1;
			align-self: flex-start;
			font-size: var(--cw-text-xs);
		}

		.note__by {
			margin-top: auto;
			font-size: var(--cw-text-xs);
			color: var(--cw-text-muted);
		}
	}
</style>
