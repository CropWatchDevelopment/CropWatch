<script lang="ts">
	import Icon from '#lib/components/Icon.svelte';
	import {
		CwButton,
		CwDialog,
		CwCalendarScroll,
		CwSwitch,
		CwSearchInput,
		CwDateTimeRangePicker,
		useCwToast,
		type CwCalendarScrollItem,
		type CwRangeDateValue
	} from '@cropwatchdevelopment/cwui';
	import { tick } from 'svelte';
	import { apiErrorMessage } from '#lib/api/api-error.ts';
	import {
		cwCalendarScrollLabels,
		cwDateTimeRangePickerLabels,
		cwSearchInputLabels
	} from '#lib/i18n/cwuiLabels.ts';
	import NOTE_ICON from '#lib/images/icons/notes_history.svg';
	import { formatDateTime, getIntlLocale } from '#lib/i18n/format.ts';
	import { m } from '#lib/paraglide/messages.js';
	import { getAppContext } from '#lib/appContext.svelte.ts';
	import { getServices } from '#lib/services/context.ts';
	import type { Note } from '#lib/components/displays/AirDisplay/interfaces/note.interface.ts';
	import {
		noteAuthor,
		parseAirNotesResponse
	} from '#lib/components/displays/AirDisplay/utils/air-notes.ts';

	interface Props {
		devEui: string;
		disabled?: boolean;
		/**
		 * The API lets the caller delete this device's notes (`can_write_notes`).
		 * Without it there is no Delete button: missing counts as no.
		 */
		canWriteNotes?: boolean;
		/** A note was deleted, so the page can drop it from its own copy of the readings. */
		onDeleted?: () => unknown;
	}

	interface DayPlan extends CwCalendarScrollItem {
		entries: Note[];
	}

	let { devEui, disabled = false, canWriteNotes = false, onDeleted }: Props = $props();

	const app = getAppContext();
	const { airNotes } = getServices();
	const toast = useCwToast();

	/** The note asking to confirm its delete; one at a time. */
	let confirmingId = $state<string | null>(null);
	let deletingId = $state<string | null>(null);

	let open = $state(false);
	let loading = $state(false);
	let loadError = $state<string | null>(null);
	let search = $state('');
	let showOnlyDatesWithNotes = $state(true);
	let selectedMonth = $state<CwRangeDateValue>(buildInitialMonthRange());
	let notes = $state<DayPlan[]>([]);
	let activeRequestId = 0;

	let calendarRange = $derived.by(() => getCalendarRange(selectedMonth));
	let filteredNotes = $derived.by(() => {
		const query = search.trim().toLowerCase();
		if (!query) {
			return notes;
		}

		return notes
			.map((day) => ({
				...day,
				entries: day.entries.filter((entry) => matchesSearch(entry, query))
			}))
			.filter((day) => day.entries.length > 0);
	});

	function buildInitialMonthRange(): CwRangeDateValue {
		const now = new Date();
		return {
			start: new Date(now.getFullYear(), now.getMonth(), 1),
			end: new Date(now.getFullYear(), now.getMonth() + 1, 0)
		};
	}

	// The picker's range never ends before it starts (it orders the two picks).
	function getCalendarRange(value: CwRangeDateValue): { start: Date; end: Date } {
		return {
			start: new Date(value.start.getFullYear(), value.start.getMonth(), 1),
			end: new Date(value.end.getFullYear(), value.end.getMonth() + 1, 0)
		};
	}

	function getMonthStarts(value: CwRangeDateValue): Date[] {
		const { start, end } = getCalendarRange(value);
		const months: Date[] = [];

		for (
			let cursor = new Date(start.getFullYear(), start.getMonth(), 1);
			cursor.getTime() <= end.getTime();
			cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
		) {
			months.push(new Date(cursor));
		}

		return months;
	}

	function toLocalDateKey(value: string | Date): string | null {
		const parsed = value instanceof Date ? value : new Date(value);
		if (Number.isNaN(parsed.getTime())) {
			return null;
		}

		return [
			parsed.getFullYear(),
			String(parsed.getMonth() + 1).padStart(2, '0'),
			String(parsed.getDate()).padStart(2, '0')
		].join('-');
	}

	function buildDayPlans(entries: Note[]): DayPlan[] {
		const plansByDate: Record<string, DayPlan> = {};

		for (const entry of entries) {
			const dayKey = toLocalDateKey(entry.created_at);
			if (!dayKey) {
				continue;
			}
			const existing = plansByDate[dayKey];

			if (existing) {
				existing.entries.push(entry);
				continue;
			}

			plansByDate[dayKey] = {
				date: dayKey,
				entries: [entry]
			};
		}

		return Object.values(plansByDate)
			.map((day) => ({
				...day,
				entries: [...day.entries].sort(
					(a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
				)
			}))
			.sort((a, b) => String(a.date).localeCompare(String(b.date)));
	}

	function matchesSearch(entry: Note, query: string): boolean {
		return (
			entry.title.toLowerCase().includes(query) ||
			entry.note.toLowerCase().includes(query) ||
			noteAuthor(entry).toLowerCase().includes(query) ||
			formatDateTime(entry.created_at).toLowerCase().includes(query)
		);
	}

	function getNoteMeta(entry: Note): string {
		const timestamp = formatDateTime(entry.created_at, { hour: 'numeric', minute: '2-digit' });
		const author = noteAuthor(entry);
		return author ? `${timestamp} - ${author}` : timestamp;
	}

	async function loadNotesData(): Promise<void> {
		// Only with a session: that token is what the services send.
		if (!app.accessToken || !devEui) {
			notes = [];
			loadError = null;
			return;
		}

		const requestId = ++activeRequestId;
		loading = true;
		loadError = null;

		try {
			const monthStarts = getMonthStarts(selectedMonth);
			const responses = await Promise.all(
				monthStarts.map((monthStart) =>
					airNotes.getAllAirNotesForMonth({
						dev_eui: devEui,
						date: monthStart
					})
				)
			);
			const nextNotes = buildDayPlans(
				responses.flatMap((response) => parseAirNotesResponse(response))
			);

			if (requestId !== activeRequestId) {
				return;
			}

			notes = nextNotes;
		} catch (error) {
			if (requestId !== activeRequestId) {
				return;
			}

			notes = [];
			loadError = m.display_note_load_failed();
			console.error('Error loading notes:', error);
		} finally {
			if (requestId === activeRequestId) {
				loading = false;
			}
		}
	}

	const openDialog = (): void => {
		confirmingId = null;
		open = true;
		void loadNotesData();
	};

	/** Focus the element with this id once the note has re-rendered. */
	async function focusById(id: string): Promise<void> {
		await tick();
		document.getElementById(id)?.focus();
	}

	function askToDelete(entry: Note): void {
		confirmingId = entry.id;
		void focusById(`device-notes-review-row-${entry.id}-delete-cancel-button`);
	}

	function cancelDelete(entry: Note): void {
		confirmingId = null;
		void focusById(`device-notes-review-row-${entry.id}-delete-button`);
	}

	async function deleteNote(entry: Note): Promise<void> {
		deletingId = entry.id;
		try {
			await airNotes.deleteAirNote(Number(entry.id));
		} catch (error) {
			console.error('Error deleting note:', error);
			toast.add({
				tone: 'danger',
				message: apiErrorMessage(error, m.display_note_delete_failed())
			});
			return;
		} finally {
			deletingId = null;
		}

		confirmingId = null;
		notes = notes
			.map((day) => ({ ...day, entries: day.entries.filter((other) => other.id !== entry.id) }))
			.filter((day) => day.entries.length > 0);
		toast.add({ tone: 'success', message: m.display_note_deleted() });
		onDeleted?.();
	}
</script>

<CwButton
	id="device-notes-review-open-button"
	onclick={openDialog}
	{disabled}
	variant="secondary"
	size="sm"
>
	<Icon src={NOTE_ICON} alt={m.display_view_notes()} />
	{m.display_view_notes()}
</CwButton>

<CwDialog bind:open title={m.display_view_notes()}>
	<div class="notes-review-dialog-content">
		<div class="mb-4 flex flex-row items-center gap-4">
			<CwSearchInput
				labels={cwSearchInputLabels()}
				id="device-notes-review-search"
				bind:value={search}
				placeholder={m.display_note_search_placeholder()}
				class="w-full"
			/>
			<CwDateTimeRangePicker
				locale={getIntlLocale()}
				class="w-full"
				mode="range"
				granularity="month"
				includeTime
				onchange={() => void loadNotesData()}
				bind:value={selectedMonth}
				labels={cwDateTimeRangePickerLabels()}
			/>
			<CwSwitch
				id="device-notes-review-show-notes-switch"
				class="w-full"
				label={m.display_note_show_only_dates_with_notes()}
				bind:checked={showOnlyDatesWithNotes}
				labelPosition="bottom"
			/>
		</div>

		{#if loadError}
			<p class="notes-review-dialog__error">{loadError}</p>
		{/if}

		<CwCalendarScroll
			items={filteredNotes}
			startDate={calendarRange.start}
			endDate={calendarRange.end}
			showAllDates={!showOnlyDatesWithNotes}
			labels={cwCalendarScrollLabels()}
		>
			{#snippet content(item)}
				{#if item}
					<div class="notes-review-dialog__day">
						{#each item.entries as entry (entry.id)}
							{@const noteTitle = entry.title.trim()}
							<article class="notes-review-dialog__note">
								<div class="w-full flex-row">
									<div>
										<div class="notes-review-dialog__note-header">
											<h3 class="notes-review-dialog__note-title">
												{noteTitle.length > 0 ? noteTitle : m.display_note_untitled()}
											</h3>
											<p class="notes-review-dialog__note-meta">{getNoteMeta(entry)}</p>
										</div>
										<p class="notes-review-dialog__note-report">
											{entry.includeInReport
												? m.display_note_report_included()
												: m.display_note_report_excluded()}
										</p>
										<p class="notes-review-dialog__note-body">{entry.note}</p>
									</div>

									{#if canWriteNotes}
										{#if confirmingId === entry.id}
											<div class="notes-review-dialog__confirm" role="alert">
												<p>{m.display_note_delete_confirm()}</p>
												<div class="notes-review-dialog__confirm-buttons">
													<CwButton
														id={`device-notes-review-row-${entry.id}-delete-cancel-button`}
														variant="ghost"
														size="sm"
														disabled={deletingId === entry.id}
														onclick={() => cancelDelete(entry)}
													>
														{m.action_cancel()}
													</CwButton>
													<CwButton
														id={`device-notes-review-row-${entry.id}-delete-confirm-button`}
														variant="danger"
														size="sm"
														loading={deletingId === entry.id}
														onclick={() => deleteNote(entry)}
													>
														{m.action_delete()}
													</CwButton>
												</div>
											</div>
										{:else}
											<CwButton
												id={`device-notes-review-row-${entry.id}-delete-button`}
												variant="secondary"
												size="sm"
												disabled={deletingId !== null}
												onclick={() => askToDelete(entry)}
											>
												{m.action_delete()}
											</CwButton>
										{/if}
									{/if}
								</div>
							</article>
						{/each}
					</div>
				{:else}
					<p class="notes-review-dialog__empty-copy">{m.display_note_no_notes_for_date()}</p>
				{/if}
			{/snippet}
			{#snippet emptyState()}
				{#if loading}
					<p class="notes-review-dialog__empty-copy">{m.display_note_loading()}</p>
				{:else if search.trim().length > 0}
					<p class="notes-review-dialog__empty-copy">
						{m.display_note_no_search_results()}
					</p>
				{:else}
					<p class="notes-review-dialog__empty-copy">
						{m.display_note_no_notes_for_month()}
					</p>
				{/if}
			{/snippet}
		</CwCalendarScroll>
	</div>
	{#snippet actions()}
		<CwButton
			id="device-notes-review-close-button"
			onclick={() => (open = false)}
			variant="secondary"
		>
			{m.action_close()}
		</CwButton>
	{/snippet}
</CwDialog>

<style>
	.notes-review-dialog-content {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.notes-review-dialog__day {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.notes-review-dialog__note {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		padding: 0.75rem;
		border: 1px solid var(--cw-border-default, #d1d5db);
		border-radius: 0.75rem;
		background-color: var(--cw-bg-surface-elevated, #ffffff);
	}

	.notes-review-dialog__note-header {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.5rem;
	}

	.notes-review-dialog__note-title,
	.notes-review-dialog__note-meta,
	.notes-review-dialog__note-report,
	.notes-review-dialog__note-body,
	.notes-review-dialog__error,
	.notes-review-dialog__empty-copy {
		margin: 0;
	}

	.notes-review-dialog__note-title {
		font-size: 1rem;
		font-weight: 700;
		color: var(--cw-text-primary, #111827);
	}

	.notes-review-dialog__note-meta,
	.notes-review-dialog__note-report {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--cw-text-muted, #4b5563);
	}

	.notes-review-dialog__note-body,
	.notes-review-dialog__empty-copy {
		font-size: 0.95rem;
		line-height: 1.5;
		color: var(--cw-text-primary, #111827);
		white-space: pre-wrap;
	}

	.notes-review-dialog__error {
		font-size: 0.875rem;
		line-height: 1.5;
		color: var(--cw-tone-danger-text);
	}

	.notes-review-dialog__confirm {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		margin-top: 0.5rem;
	}

	.notes-review-dialog__confirm p {
		margin: 0;
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--cw-text-primary, #111827);
	}

	.notes-review-dialog__confirm-buttons {
		display: flex;
		gap: 0.5rem;
	}
</style>
