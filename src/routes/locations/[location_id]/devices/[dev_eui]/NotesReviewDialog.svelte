<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import {
		CwButton,
		CwDialog,
		CwCalendarScroll,
		CwSwitch,
		CwSearchInput,
		CwDateTimeRangePicker,
		type CwCalendarScrollItem,
		type CwRangeDateValue
	} from '@cropwatchdevelopment/cwui';
	import NOTE_ICON from '$lib/images/icons/notes_history.svg';
	import { formatDateTime } from '$lib/i18n/format';
	import { m } from '$lib/paraglide/messages.js';
	import { ApiService } from '$lib/api/api.service';
	import type { Note } from '$lib/components/displays/AirDisplay/interfaces/note.interface';
	import { parseAirNotesResponse } from '$lib/components/displays/AirDisplay/utils/air-notes';

	interface Props {
		authToken: string | null;
		devEui: string;
		locationName: string;
		timeZone: string;
		disabled?: boolean;
	}

	interface DayPlan extends CwCalendarScrollItem {
		entries: Note[];
	}

	let { authToken, devEui, disabled = false }: Props = $props();

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

	function getCalendarRange(value: CwRangeDateValue): { start: Date; end: Date } {
		let start = new Date(value.start.getFullYear(), value.start.getMonth(), 1);
		let end = new Date(value.end.getFullYear(), value.end.getMonth() + 1, 0);

		if (start.getTime() > end.getTime()) {
			[start, end] = [end, start];
		}

		return { start, end };
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
			entry.created_by.toLowerCase().includes(query) ||
			formatDateTime(entry.created_at).toLowerCase().includes(query)
		);
	}

	function getNoteTitle(entry: Note): string {
		const trimmedTitle = entry.title.trim();
		return trimmedTitle.length > 0 ? trimmedTitle : m.display_note_untitled();
	}

	function getReportVisibilityLabel(entry: Note): string {
		return entry.includeInReport
			? m.display_note_report_included()
			: m.display_note_report_excluded();
	}

	function getNoteMeta(entry: Note): string {
		const timestamp = formatDateTime(entry.created_at, { hour: 'numeric', minute: '2-digit' });
		const author = entry.created_by.trim();
		return author ? `${timestamp} - ${author}` : timestamp;
	}

	async function loadNotesData(): Promise<void> {
		if (!authToken || !devEui) {
			notes = [];
			loadError = null;
			return;
		}

		const requestId = ++activeRequestId;
		loading = true;
		loadError = null;

		const api = new ApiService({
			fetchFn: fetch,
			authToken
		});

		try {
			const monthStarts = getMonthStarts(selectedMonth);
			const responses = await Promise.all(
				monthStarts.map((monthStart) =>
					api.getAllAirNotesForMonth({
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
		open = true;
		void loadNotesData();
	};
</script>

<CwButton onclick={openDialog} {disabled} variant="secondary" size="sm">
	<Icon src={NOTE_ICON} alt={m.display_view_notes()} />
	{m.display_view_notes()}
</CwButton>

<CwDialog bind:open title={m.display_view_notes()}>
	<div class="notes-review-dialog-content">
		<div class="mb-4 flex flex-row items-center gap-4">
			<CwSearchInput
				bind:value={search}
				placeholder={m.display_note_search_placeholder()}
				class="w-full"
			/>
			<CwDateTimeRangePicker
				class="w-full"
				mode="range"
				granularity="month"
				includeTime
				onchange={() => void loadNotesData()}
				bind:value={selectedMonth}
			/>
			<CwSwitch
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
		>
			{#snippet content(item)}
				{#if item}
					<div class="notes-review-dialog__day">
						{#each item.entries as entry (entry.id)}
							<article class="notes-review-dialog__note">
								<div class="w-full flex-row">
                                    <div>
									<div class="notes-review-dialog__note-header">
										<h3 class="notes-review-dialog__note-title">{getNoteTitle(entry)}</h3>
										<p class="notes-review-dialog__note-meta">{getNoteMeta(entry)}</p>
									</div>
									<p class="notes-review-dialog__note-report">
										{getReportVisibilityLabel(entry)}
									</p>
									<p class="notes-review-dialog__note-body">{entry.note}</p>
                                    </div>

									<CwButton disabled>Delete</CwButton>
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
			<!-- {#snippet actions(row)}
                <CwButton>delete</CwButton>
            {/snippet} -->
		</CwCalendarScroll>
	</div>
	{#snippet actions()}
		<CwButton onclick={() => (open = false)} variant="secondary">
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
		color: var(--cw-danger, #b91c1c);
	}
</style>
