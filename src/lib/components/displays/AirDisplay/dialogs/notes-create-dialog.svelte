<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { applyAction, deserialize } from '$app/forms';
	import type { ActionResult } from '@sveltejs/kit';
	import { CwButton, CwDialog, CwTextArea, useCwToast } from '@cropwatchdevelopment/cwui';
	import type { AirRow } from '../interfaces/AirRow.interface';
	import type { Note } from '../interfaces/note.interface';
	import ADD_NOTE_ICON from '$lib/images/icons/note_add.svg';
	import { formatDateTime } from '$lib/i18n/format';
	import { m } from '$lib/paraglide/messages.js';

	type NotesCreateDialogProps = {
		row: AirRow;
		dev_eui: string;
		onSaved?: (note: Note) => void | Promise<void>;
	};

	let { row, dev_eui, onSaved }: NotesCreateDialogProps = $props();
	const toast = useCwToast();
	let open = $state(false);
	let noteText = $state('');
	let saving = $state(false);

	function getResultMessage(result: ActionResult): string | null {
		if (result.type !== 'success' && result.type !== 'failure') return null;
		const data = result.data;
		if (!data || typeof data !== 'object') return null;
		const message = (data as Record<string, unknown>).message;
		return typeof message === 'string' && message.trim().length > 0 ? message.trim() : null;
	}

	function createOptimisticNote(note: string): Note {
		return {
			id: globalThis.crypto?.randomUUID?.() ?? `note-${Date.now()}`,
			created_at: new Date().toISOString(),
			note
		};
	}

	function handleEditorKeydown(event: KeyboardEvent) {
		// The table row listens for Space/Enter and cancels them, which breaks typing in the modal.
		if (event.key === ' ' || event.key === 'Enter') {
			event.stopPropagation();
		}
	}

	async function handleSaveNote() {
		if (saving) return false;

		const trimmedNote = noteText.trim();
		if (!trimmedNote) return false;

		const formData = new FormData();
		formData.append('note', trimmedNote);
		formData.append('created_at', row.created_at);
		formData.append('dev_eui', dev_eui);

		saving = true;

		try {
			const response = await fetch('?/saveDataNote', {
				method: 'POST',
				body: formData
			});
			const result = deserialize(await response.text());
			await applyAction(result);

			const message = getResultMessage(result);
			if (result.type === 'success') {
				toast.add({
					tone: 'success',
					message: message ?? m.devices_save_note_success()
				});
				await onSaved?.(createOptimisticNote(trimmedNote));
				open = false;
				noteText = '';
				return true;
			}

			toast.add({
				tone: 'danger',
				message: message ?? m.devices_save_note_failed()
			});
			return false;
		} catch (error) {
			console.error('Failed to save air note:', error);
			toast.add({
				tone: 'danger',
				message: error instanceof Error ? error.message : m.devices_save_note_failed()
			});
			return false;
		} finally {
			saving = false;
		}
	}
</script>

<CwButton variant="info" size="sm" onclick={() => (open = true)}>
	<Icon src={ADD_NOTE_ICON} alt={m.display_add_note()} />
</CwButton>

<CwDialog
	{open}
	onclose={() => (open = false)}
	title={m.display_add_note_title({ createdAt: formatDateTime(row.created_at) })}
>
	<p style="margin-bottom: 1rem;">
		{m.display_add_note_body({
			createdAt: formatDateTime(row.created_at),
			temperature: row.temperature_c.toFixed(1)
		})}
	</p>

	<CwTextArea
		required
		class="rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500"
		onkeydown={handleEditorKeydown}
		placeholder={m.display_enter_note_here()}
		style="width: 100%; height: 150px; padding: 0.5rem; font-size: 1rem;"
		bind:value={noteText}
	></CwTextArea>
	<p>{noteText.length}/300</p>

	{#snippet actions()}
		<CwButton
			variant="primary"
			loading={saving}
			disabled={saving || noteText.trim().length === 0}
			onclick={() => handleSaveNote()}
		>
			{m.display_save_note()}
		</CwButton>
		<CwButton variant="secondary" disabled={saving} onclick={() => (open = false)}
			>{m.action_cancel()}</CwButton
		>
	{/snippet}
</CwDialog>

<style>
	:global(.cw-textarea__field) {
		background-color: #1e1e1e;
		color: #ffffff;
		border: 1px solid #333333;
	}

	:global(.cw-textarea__field:focus) {
		border-color: #3b82f6;
		box-shadow: 0 0 0 1px #3b82f6;
	}
</style>
