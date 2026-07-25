<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import {
		CwButton,
		CwChip,
		CwDialog,
		CwInput,
		CwSwitch,
		CwTextArea
	} from '@cropwatchdevelopment/cwui';
	import { formatDateTime } from '$lib/i18n/format';
	import { m } from '$lib/paraglide/messages.js';
	import ADD_NOTE_ICON from '$lib/images/icons/note_add.svg';
	import type { DisplayNote, StagedOp } from './staged-notes';

	interface Props {
		rowCreatedAt: string;
		/** Server notes with any staged ops already overlaid. */
		notes: DisplayNote[];
		onStage: (op: StagedOp) => void;
		onUnstage: (key: string) => void;
	}

	const NOTE_TITLE_MAX_LENGTH = 500;
	const NOTE_BODY_MAX_LENGTH = 500;

	let { rowCreatedAt, notes, onStage, onUnstage }: Props = $props();

	let open = $state(false);
	// null = list view; 'new' = create form; otherwise the DisplayNote being edited.
	let editing = $state<DisplayNote | 'new' | null>(null);
	let noteTitle = $state('');
	let noteText = $state('');
	let includeInReport = $state(true);

	let formattedCreatedAt = $derived(formatDateTime(rowCreatedAt));
	// One staged create per data point keeps the model simple; edit it instead.
	let hasStagedCreate = $derived(notes.some((note) => note.staged === 'create'));

	function openCreateForm() {
		noteTitle = '';
		noteText = '';
		includeInReport = true;
		editing = 'new';
	}

	function openEditForm(note: DisplayNote) {
		noteTitle = note.title;
		noteText = note.note;
		includeInReport = note.includeInReport;
		editing = note;
	}

	function handleEditorKeydown(event: KeyboardEvent) {
		// The table row listens for Space/Enter and cancels them, which breaks typing in the modal.
		if (event.key === ' ' || event.key === 'Enter') {
			event.stopPropagation();
		}
	}

	function stageForm() {
		if (editing === null || noteText.trim().length === 0) return;
		if (editing === 'new') {
			onStage({
				kind: 'create',
				key: `new:${rowCreatedAt}`,
				rowCreatedAt,
				title: noteTitle.trim(),
				note: noteText.trim(),
				includeInReport
			});
		} else if (editing.staged === 'create') {
			// Re-staging an unsaved create just replaces it.
			onStage({
				kind: 'create',
				key: editing.stagedKey ?? `new:${rowCreatedAt}`,
				rowCreatedAt,
				title: noteTitle.trim(),
				note: noteText.trim(),
				includeInReport
			});
		} else {
			onStage({
				kind: 'update',
				key: `note:${editing.id}`,
				rowCreatedAt,
				noteId: Number(editing.id),
				title: noteTitle.trim(),
				note: noteText.trim(),
				includeInReport
			});
		}
		editing = null;
	}

	function stageDelete(note: DisplayNote) {
		if (note.staged === 'create') {
			// Removing an unsaved create simply drops it from staging.
			onUnstage(note.stagedKey ?? `new:${rowCreatedAt}`);
			return;
		}
		onStage({
			kind: 'delete',
			key: `note:${note.id}`,
			rowCreatedAt,
			noteId: Number(note.id),
			title: note.title,
			note: note.note,
			includeInReport: note.includeInReport
		});
	}

	function closeDialog() {
		editing = null;
		open = false;
	}
</script>

<CwButton variant="info" size="sm" onclick={() => (open = true)}>
	<Icon src={ADD_NOTE_ICON} alt={m.reports_new_edit_data_notes_column()} />
</CwButton>

<CwDialog
	{open}
	onclose={closeDialog}
	title={m.reports_new_edit_data_notes_dialog_title({ createdAt: formattedCreatedAt })}
>
	<div class="report-note-dialog">
		{#if editing !== null}
			<CwInput
				label={m.display_note_title_label()}
				value={noteTitle}
				oninput={(e) => (noteTitle = (e.target as HTMLInputElement).value)}
				placeholder={m.display_note_title_placeholder()}
				maxlength={NOTE_TITLE_MAX_LENGTH}
			></CwInput>
			<p class="report-note-dialog__label">{m.display_note_body_label()}</p>
			<CwTextArea
				required
				onkeydown={handleEditorKeydown}
				placeholder={m.display_enter_note_here()}
				bind:value={noteText}
				maxlength={NOTE_BODY_MAX_LENGTH}
			></CwTextArea>
			<p class="report-note-dialog__count">{noteText.length}/{NOTE_BODY_MAX_LENGTH}</p>
			<CwSwitch label={m.display_include_in_report()} bind:checked={includeInReport} />
		{:else if notes.length === 0}
			<p class="report-note-dialog__empty">{m.reports_new_edit_data_no_notes()}</p>
		{:else}
			<ul class="report-note-dialog__list">
				{#each notes as note (note.stagedKey ?? note.id)}
					<li
						class="report-note-dialog__item"
						class:report-note-dialog__item--deleted={note.staged === 'delete'}
					>
						<div class="report-note-dialog__meta">
							<span class="report-note-dialog__title">
								{note.title || m.reports_new_edit_data_notes_column()}
								{#if note.staged}
									<CwChip
										label={m.reports_new_edit_data_staged_badge()}
										tone="warning"
										variant="outline"
										size="sm"
									/>
								{/if}
							</span>
							<span class="report-note-dialog__body">{note.note}</span>
						</div>
						<div class="report-note-dialog__item-actions">
							{#if note.staged === 'delete'}
								<CwButton
									variant="secondary"
									size="sm"
									onclick={() => onUnstage(note.stagedKey ?? `note:${note.id}`)}
								>
									{m.reports_new_edit_data_note_restore()}
								</CwButton>
							{:else}
								<CwButton variant="secondary" size="sm" onclick={() => openEditForm(note)}>
									{m.reports_new_edit_data_note_edit()}
								</CwButton>
								<CwButton variant="danger" size="sm" onclick={() => stageDelete(note)}>
									{m.reports_new_edit_data_note_delete()}
								</CwButton>
							{/if}
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</div>

	{#snippet actions()}
		{#if editing !== null}
			<CwButton variant="secondary" onclick={() => (editing = null)}>
				{m.action_cancel()}
			</CwButton>
			<CwButton
				variant="primary"
				disabled={noteText.trim().length === 0}
				onclick={() => stageForm()}
			>
				{m.reports_new_edit_data_note_stage()}
			</CwButton>
		{:else}
			<CwButton variant="secondary" onclick={closeDialog}>
				{m.action_close()}
			</CwButton>
			{#if !hasStagedCreate}
				<CwButton variant="primary" onclick={() => openCreateForm()}>
					{m.reports_new_edit_data_note_add()}
				</CwButton>
			{/if}
		{/if}
	{/snippet}
</CwDialog>

<style>
	.report-note-dialog {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		min-width: min(28rem, 80vw);
	}

	.report-note-dialog__label,
	.report-note-dialog__count,
	.report-note-dialog__empty {
		margin: 0;
	}

	.report-note-dialog__label {
		font-size: 0.875rem;
		font-weight: 600;
	}

	.report-note-dialog__count {
		font-size: 0.875rem;
		color: var(--cw-color-text-muted, #6b7280);
		text-align: right;
	}

	.report-note-dialog__empty {
		color: var(--cw-color-text-muted, #6b7280);
	}

	.report-note-dialog__list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--cw-space-2);
		max-height: 50vh;
		overflow-y: auto;
	}

	.report-note-dialog__item {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--cw-space-3);
		padding: var(--cw-space-2);
		border: 1px solid var(--cw-color-border, #e5e7eb);
		border-radius: var(--cw-radius-md, 8px);
	}

	.report-note-dialog__item--deleted .report-note-dialog__meta {
		text-decoration: line-through;
		opacity: 0.6;
	}

	.report-note-dialog__meta {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}

	.report-note-dialog__title {
		font-weight: 600;
		display: flex;
		align-items: center;
		gap: var(--cw-space-2);
	}

	.report-note-dialog__body {
		white-space: pre-wrap;
		word-break: break-word;
	}

	.report-note-dialog__item-actions {
		display: flex;
		gap: var(--cw-space-1);
		flex-shrink: 0;
	}

	.report-note-dialog :global(.cw-textarea__field) {
		width: 100%;
		height: 150px;
		padding: 0.5rem;
		font-size: 1rem;
	}
</style>
