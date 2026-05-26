<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import {
		CwButton,
		CwDialog,
		CwInput,
		CwRadio,
		CwSpinner,
		CwSwitch,
		CwTextArea,
		useCwToast
	} from '@cropwatchdevelopment/cwui';
	import { ApiService, ApiServiceError } from '$lib/api/api.service';
	import { readApiErrorMessage } from '$lib/api/api-error';
	import { getAppContext } from '$lib/appContext.svelte';
	import { formatDateTime } from '$lib/i18n/format';
	import { formatSensorValue, isDisplayableColumn, labelFor } from '$lib/sensor-labels';
	import { AppNotice } from '$lib/components/layout';
	import type { Note } from '../interfaces/note.interface';
	import ADD_NOTE_ICON from '$lib/images/icons/note_add.svg';
	import NO_ICON from '$lib/images/icons/no.svg';
	import SAVE_ICON from '$lib/images/icons/save.svg';
	import { m } from '$lib/paraglide/messages.js';

	type Props = {
		devEui: string;
		onSaved?: (note: Note) => void | Promise<void>;
	};

	const NOTE_TITLE_MAX_LENGTH = 500;
	const NOTE_BODY_MAX_LENGTH = 500;
	const TODAY_TAKE_LIMIT = 500;

	let { devEui, onSaved }: Props = $props();

	const app = getAppContext();
	const toast = useCwToast();

	let open = $state(false);
	let loading = $state(false);
	let loadError = $state<string | null>(null);
	let todayRows = $state<Array<Record<string, unknown>>>([]);
	let selectedCreatedAt = $state<string | null>(null);

	let noteTitle = $state('');
	let noteText = $state('');
	let includeInReport = $state(true);
	let saving = $state(false);

	function resetState() {
		noteTitle = '';
		noteText = '';
		includeInReport = true;
		selectedCreatedAt = null;
		todayRows = [];
		loadError = null;
	}

	function closeDialog() {
		open = false;
		resetState();
	}

	function handleEditorKeydown(event: KeyboardEvent) {
		// The card listens for Space/Enter and cancels them, which breaks typing in the modal.
		if (event.key === ' ' || event.key === 'Enter') {
			event.stopPropagation();
		}
	}

	function startOfTodayIso(): string {
		const start = new Date();
		start.setHours(0, 0, 0, 0);
		return start.toISOString();
	}

	function summarizeRow(row: Record<string, unknown>): string {
		return Object.entries(row)
			.filter(
				([col, value]) =>
					col !== 'created_at' &&
					isDisplayableColumn(col) &&
					value !== null &&
					value !== undefined
			)
			.slice(0, 4)
			.map(([col, value]) => {
				const def = labelFor(col);
				const formatted = formatSensorValue(value, def.format);
				const unit = def.unit ? ` ${def.unit}` : '';
				return `${def.label()}: ${formatted.display}${unit}`;
			})
			.join(' · ');
	}

	async function loadTodayData() {
		if (!app.accessToken) {
			loadError = m.devices_save_note_requires_login();
			return;
		}
		loading = true;
		loadError = null;
		try {
			const api = new ApiService({ authToken: app.accessToken });
			const result = await api.getDeviceDataWithinRange(devEui, {
				start: startOfTodayIso(),
				end: new Date().toISOString(),
				take: TODAY_TAKE_LIMIT
			});
			const rows = Array.isArray(result) ? result : result.data;
			todayRows = rows.filter(
				(r): r is Record<string, unknown> =>
					!!r && typeof (r as Record<string, unknown>).created_at === 'string'
			);
			selectedCreatedAt = (todayRows[0]?.created_at as string | undefined) ?? null;
		} catch (error) {
			console.error('Failed to load today data:', error);
			const payload = error instanceof ApiServiceError ? error.payload : error;
			loadError = readApiErrorMessage(payload, m.devices_save_note_failed());
		} finally {
			loading = false;
		}
	}

	function openDialog() {
		resetState();
		open = true;
		void loadTodayData();
	}

	async function handleSaveNote() {
		if (saving) return;
		const trimmedNote = noteText.trim();
		const trimmedTitle = noteTitle.trim();
		const createdAt = selectedCreatedAt;
		if (!trimmedNote || !createdAt || !app.accessToken) return;

		saving = true;
		try {
			const api = new ApiService({ authToken: app.accessToken });
			await api.createAirNote({
				note: trimmedNote,
				title: trimmedTitle,
				include_in_report: includeInReport,
				created_at: createdAt,
				dev_eui: devEui
			});
			toast.add({ tone: 'success', message: m.devices_save_note_success() });
			await onSaved?.({
				id: globalThis.crypto?.randomUUID?.() ?? `note-${Date.now()}`,
				created_at: createdAt,
				created_by: '',
				title: trimmedTitle,
				note: trimmedNote,
				includeInReport
			});
			closeDialog();
		} catch (error) {
			console.error('Failed to save air note:', error);
			const payload = error instanceof ApiServiceError ? error.payload : error;
			toast.add({
				tone: 'danger',
				message: readApiErrorMessage(payload, m.devices_save_note_failed())
			});
		} finally {
			saving = false;
		}
	}
</script>

<CwButton variant="info" size="sm" onclick={openDialog}>
	<Icon src={ADD_NOTE_ICON} alt={m.display_add_note()} />
</CwButton>

<CwDialog {open} onclose={closeDialog} title={m.display_add_note_today_title()}>
	<div class="today-note-dialog">
		<div class="today-note-dialog__field">
			<p class="today-note-dialog__label">{m.display_today_reading_label()}</p>

			{#if loading}
				<div class="today-note-dialog__loading">
					<CwSpinner size="sm" />
					<span>{m.display_loading_today_readings()}</span>
				</div>
			{:else if loadError}
				<AppNotice tone="danger">
					<p>{loadError}</p>
				</AppNotice>
			{:else if todayRows.length === 0}
				<AppNotice tone="neutral">
					<p>{m.display_no_readings_today()}</p>
				</AppNotice>
			{:else}
				<div class="today-note-dialog__radios" role="radiogroup">
					{#each todayRows as row (row.created_at as string)}
						{@const createdAt = row.created_at as string}
						<CwRadio
							bind:group={selectedCreatedAt}
							value={createdAt}
							label={formatDateTime(createdAt, { hour: 'numeric', minute: '2-digit' })}
							description={summarizeRow(row)}
						/>
					{/each}
				</div>
			{/if}
		</div>

		<CwInput
			label={m.display_note_title_label()}
			value={noteTitle}
			oninput={(e) => (noteTitle = (e.target as HTMLInputElement).value)}
			placeholder={m.display_note_title_placeholder()}
			maxlength={NOTE_TITLE_MAX_LENGTH}
		></CwInput>

		<div class="today-note-dialog__field">
			<p class="today-note-dialog__label">{m.display_note_body_label()}</p>
		</div>
		<CwTextArea
			required
			class="rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500"
			onkeydown={handleEditorKeydown}
			placeholder={m.display_enter_note_here()}
			style="width: 100%; height: 150px; padding: 0.5rem; font-size: 1rem;"
			bind:value={noteText}
			maxlength={NOTE_BODY_MAX_LENGTH}
		></CwTextArea>
		<p class="today-note-dialog__count">{noteText.length}/{NOTE_BODY_MAX_LENGTH}</p>
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
			disabled={saving || noteText.trim().length === 0 || !selectedCreatedAt}
			onclick={() => handleSaveNote()}
		>
			<Icon src={SAVE_ICON} alt={m.action_save_changes()} />
			{m.display_save_note()}
		</CwButton>
	{/snippet}
</CwDialog>

<style>
	.today-note-dialog {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.today-note-dialog__field {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.today-note-dialog__label,
	.today-note-dialog__count {
		margin: 0;
	}

	.today-note-dialog__label {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--cw-text-primary, #111827);
	}

	.today-note-dialog__count {
		font-size: 0.875rem;
		color: var(--cw-text-muted, #6b7280);
		text-align: right;
	}

	.today-note-dialog__loading {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		color: var(--cw-text-muted, #6b7280);
		font-size: 0.875rem;
	}

	.today-note-dialog__radios {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		max-height: 16rem;
		overflow-y: auto;
		padding: 0.25rem;
		border: 1px solid var(--cw-border-default, #333333);
		border-radius: 0.375rem;
	}

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
