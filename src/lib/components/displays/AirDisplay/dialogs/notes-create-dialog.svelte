<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { applyAction, deserialize } from '$app/forms';
	import type { ActionResult } from '@sveltejs/kit';
	import { apiErrorMessage } from '$lib/api/api-error';
	import {
		CwButton,
		CwDialog,
		CwInput,
		CwSwitch,
		CwTextArea,
		useCwToast
	} from '@cropwatchdevelopment/cwui';
	import type { AirRow } from '../interfaces/AirRow.interface';
	import type { Note } from '../interfaces/note.interface';
	import ADD_NOTE_ICON from '$lib/images/icons/note_add.svg';
	import { formatDateTime } from '$lib/i18n/format';
	import { m } from '$lib/paraglide/messages.js';
	import NO_ICON from '$lib/images/icons/no.svg';
	import SAVE_ICON from '$lib/images/icons/save.svg';

	type NotesCreateDialogProps = {
		row: AirRow;
		dev_eui: string;
		onSaved?: (note: Note) => void | Promise<void>;
	};

	const NOTE_TITLE_MAX_LENGTH = 500;
	const NOTE_BODY_MAX_LENGTH = 500;

	let { row, dev_eui, onSaved }: NotesCreateDialogProps = $props();
	const toast = useCwToast();
	let open = $state(false);
	let noteText = $state('');
	let noteTitle = $state('');
	let includeInReport = $state(true);
	let saving = $state(false);
	let formattedCreatedAt = $derived(formatDateTime(row.created_at));

	/** The message an action result carries: its data's, or an error result's own. */
	function getResultMessage(result: ActionResult): string | null {
		const source =
			result.type === 'success' || result.type === 'failure'
				? result.data
				: result.type === 'error'
					? result.error
					: null;
		if (!source || typeof source !== 'object') return null;
		const message = (source as Record<string, unknown>).message;
		return typeof message === 'string' && message.trim().length > 0 ? message.trim() : null;
	}

	function resetForm() {
		noteText = '';
		noteTitle = '';
		includeInReport = true;
	}

	function closeDialog() {
		open = false;
		resetForm();
	}

	function createOptimisticNote(title: string, note: string, reportIncluded: boolean): Note {
		return {
			id: globalThis.crypto?.randomUUID?.() ?? `note-${Date.now()}`,
			created_at: row.created_at,
			created_by: '',
			title,
			note,
			includeInReport: reportIncluded
		};
	}

	function handleEditorKeydown(event: KeyboardEvent) {
		// The table row listens for Space/Enter and cancels them, which breaks typing in the modal.
		if (event.key === ' ' || event.key === 'Enter') {
			event.stopPropagation();
		}
	}

	async function handleSaveNote() {
		const trimmedNote = noteText.trim();
		const trimmedTitle = noteTitle.trim();

		const formData = new FormData();
		formData.append('title', trimmedTitle);
		formData.append('note', trimmedNote);
		formData.append('include_in_report', includeInReport ? 'true' : 'false');
		formData.append('created_at', row.created_at);
		formData.append('dev_eui', dev_eui);

		saving = true;

		try {
			let result: ActionResult;
			try {
				const response = await fetch('?/saveDataNote', {
					method: 'POST',
					body: formData
				});
				result = deserialize(await response.text());
				// Follows a redirect; an error result shows the error page.
				await applyAction(result);
			} catch (error) {
				console.error('Failed to save air note:', error);
				toast.add({
					tone: 'danger',
					message: apiErrorMessage(error, m.devices_save_note_failed())
				});
				return;
			}

			if (result.type === 'redirect') return;

			const message = getResultMessage(result);
			if (result.type !== 'success') {
				toast.add({ tone: 'danger', message: message ?? m.devices_save_note_failed() });
				return;
			}

			toast.add({ tone: 'success', message: message ?? m.devices_save_note_success() });
			try {
				await onSaved?.(createOptimisticNote(trimmedTitle, trimmedNote, includeInReport));
			} catch (error) {
				// The note is saved: a failing follow-up (e.g. a refresh) does not undo that.
				console.error('Saved the air note, but its follow-up failed:', error);
			}
			closeDialog();
		} finally {
			saving = false;
		}
	}
</script>

<CwButton
	variant="info"
	size="sm"
	onclick={() => {
		resetForm();
		open = true;
	}}
>
	<Icon src={ADD_NOTE_ICON} alt={m.display_add_note()} />
</CwButton>

<CwDialog
	{open}
	onclose={closeDialog}
	title={m.display_add_note_title({ createdAt: formattedCreatedAt })}
>
	<div class="notes-create-dialog">
		<CwInput
			label={m.display_note_title_label()}
			value={noteTitle}
			oninput={(e) => (noteTitle = (e.target as HTMLInputElement).value)}
			placeholder={m.display_note_title_placeholder()}
			maxlength={NOTE_TITLE_MAX_LENGTH}
		></CwInput>

		<CwTextArea
			label={m.display_note_body_label()}
			required
			rows={6}
			showCount
			onkeydown={handleEditorKeydown}
			placeholder={m.display_enter_note_here()}
			bind:value={noteText}
			maxlength={NOTE_BODY_MAX_LENGTH}
		></CwTextArea>
		<CwSwitch label={m.display_include_in_report()} bind:checked={includeInReport} />
	</div>

	{#snippet actions()}
		<CwButton variant="secondary" disabled={saving} onclick={closeDialog}>
			<Icon src={NO_ICON} alt={m.action_cancel()} />
			{m.action_cancel()}
		</CwButton>
		<CwButton
			variant="primary"
			loading={saving}
			disabled={saving || noteText.trim().length === 0}
			onclick={() => handleSaveNote()}
		>
			<Icon src={SAVE_ICON} alt={m.action_save_changes()} />
			{m.display_save_note()}
		</CwButton>
	{/snippet}
</CwDialog>

<style>
	.notes-create-dialog {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
</style>
