<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { CwButton, CwDialog } from '@cropwatchdevelopment/cwui';
	import type { AirRow } from '../interfaces/AirRow.interface';
	import type { Note } from '../interfaces/note.interface';
	import EYE_ICON from '$lib/images/icons/eye.svg';
	import { formatDateTime } from '$lib/i18n/format';
	import { m } from '$lib/paraglide/messages.js';

	let { row }: { row: AirRow } = $props();
	let open = $state(false);

	function getNoteTitle(note: Note): string {
		const trimmedTitle = note.title.trim();
		return trimmedTitle.length > 0 ? trimmedTitle : m.display_note_untitled();
	}

	function getReportVisibilityLabel(note: Note): string {
		return note.includeInReport
			? m.display_note_report_included()
			: m.display_note_report_excluded();
	}

	function getNoteMeta(note: Note): string {
		const timestamp = formatDateTime(note.created_at);
		const author = note.created_by.trim();
		return author ? `${timestamp} - ${author}` : timestamp;
	}
</script>

<CwButton variant="secondary" size="sm" onclick={() => (open = true)}>
	<Icon src={EYE_ICON} alt={m.display_view_notes()} />
</CwButton>

<CwDialog
	{open}
	onclose={() => (open = false)}
	title={m.display_view_notes_title({ createdAt: formatDateTime(row.created_at) })}
>
	<div class="notes-view-dialog">
		{#each row.cw_air_annotations ?? [] as note (note.id)}
			<article class="notes-view-dialog__note">
				<div class="notes-view-dialog__header">
					<h3 class="notes-view-dialog__title">{getNoteTitle(note)}</h3>
					<p class="notes-view-dialog__meta">{getNoteMeta(note)}</p>
				</div>
				<p class="notes-view-dialog__report-status">{getReportVisibilityLabel(note)}</p>
				<p class="notes-view-dialog__body">{note.note}</p>
			</article>
		{/each}
	</div>
	{#snippet actions()}
		<CwButton variant="secondary" onclick={() => (open = false)}>{m.action_close()}</CwButton>
	{/snippet}
</CwDialog>

<style>
	.notes-view-dialog {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.notes-view-dialog__note {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		padding: 0.75rem;
		border: 1px solid var(--cw-border-default, #d1d5db);
		border-radius: 0.75rem;
		background-color: var(--cw-bg-surface-elevated, #ffffff);
	}

	.notes-view-dialog__header {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.5rem;
	}

	.notes-view-dialog__title,
	.notes-view-dialog__meta,
	.notes-view-dialog__report-status,
	.notes-view-dialog__body {
		margin: 0;
	}

	.notes-view-dialog__title {
		font-size: 1rem;
		font-weight: 700;
		color: var(--cw-text-primary, #111827);
	}

	.notes-view-dialog__meta,
	.notes-view-dialog__report-status {
		font-size: 0.875rem;
		color: var(--cw-text-muted, #6b7280);
	}

	.notes-view-dialog__body {
		font-size: 0.95rem;
		line-height: 1.5;
		color: var(--cw-text-primary, #111827);
		white-space: pre-wrap;
	}
</style>
