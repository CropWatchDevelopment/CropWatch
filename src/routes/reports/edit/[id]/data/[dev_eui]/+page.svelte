<script lang="ts">
	import { beforeNavigate, goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import { SvelteMap } from 'svelte/reactivity';
	import { readApiErrorMessage } from '$lib/api/api-error';
	import { ApiService } from '$lib/api/api.service';
	import { getAppContext } from '$lib/appContext.svelte';
	import { AppActionRow, AppNotice, AppPage } from '$lib/components/layout';
	import { parseAirNotesResponse } from '$lib/components/displays/AirDisplay/utils/air-notes';
	import type { Note } from '$lib/components/displays/AirDisplay/interfaces/note.interface';
	import { cwDataTableLabels } from '$lib/i18n/cwuiLabels';
	import { m } from '$lib/paraglide/messages.js';
	import { formatSensorMeasurement } from '$lib/units';
	import { createClientTableLoader } from '$lib/utils/clientTableLoader';
	import {
		CwButton,
		CwCard,
		CwChip,
		CwDataTable,
		useCwToast,
		type CwColumnDef
	} from '@cropwatchdevelopment/cwui';
	import type { PageProps } from './$types';
	import ReportNoteDialog from './ReportNoteDialog.svelte';
	import { overlayStagedNotes, type StagedOp } from './staged-notes';

	let { data }: PageProps = $props();

	const app = getAppContext();
	const toast = useCwToast();

	const templateId = (() => data.template.id)();
	const devEui = (() => data.devEui)();
	// Report windows are computed in the report timezone. All CropWatch reports
	// run Asia/Tokyo (fixed +09:00, no DST), matching the generator's default.
	const REPORT_TIMEZONE = 'Asia/Tokyo';
	const periodStartIso = (() => `${data.start}T00:00:00.000+09:00`)();
	const periodEndIso = (() => `${data.end}T23:59:59.999+09:00`)();
	// Matches the generator's own fetch cap; a month of 10-minute data is ~4.5k rows.
	const MAX_PERIOD_ROWS = 5000;

	interface DataRow {
		id: string;
		created_at: string;
		temperature_c: number;
		humidity: number;
		co2: number | null;
		notes: Note[];
	}

	let loading = $state(true);
	let loadError = $state<string | null>(null);
	let rawRows = $state<DataRow[]>([]);
	let submitting = $state(false);
	let saveErrors = $state<string[]>([]);
	// key -> staged op; see staged-notes.ts for the key scheme.
	const stagedOps = new SvelteMap<string, StagedOp>();

	let stagedCount = $derived(stagedOps.size);
	let hasCo2 = $derived(rawRows.some((row) => row.co2 !== null));

	let columns = $derived.by<CwColumnDef<DataRow>[]>(() => {
		const defs: CwColumnDef<DataRow>[] = [
			{ key: 'created_at', header: m.display_timestamp(), sortable: true },
			{ key: 'temperature_c', header: m.rule_subject_temperature(), sortable: true },
			{ key: 'humidity', header: m.rule_subject_humidity(), sortable: true }
		];
		if (hasCo2) {
			defs.push({ key: 'co2', header: m.rule_subject_co2(), sortable: true });
		}
		defs.push({ key: 'notes', header: m.reports_new_edit_data_notes_column() });
		return defs;
	});

	onMount(() => {
		void loadPeriodData();
	});

	async function loadPeriodData() {
		loading = true;
		loadError = null;
		try {
			const api = new ApiService({ authToken: app.accessToken });
			const result = await api.getDeviceDataWithinRange(devEui, {
				start: periodStartIso,
				end: periodEndIso,
				take: MAX_PERIOD_ROWS,
				timezone: REPORT_TIMEZONE
			});
			const items = Array.isArray(result)
				? result
				: (((result as { data?: unknown }).data as Record<string, unknown>[] | undefined) ?? []);
			rawRows = (Array.isArray(items) ? items : []).map((row, index) => ({
				id: String(row.id ?? `${row.created_at ?? 'row'}-${index}`),
				created_at: String(row.created_at ?? ''),
				temperature_c: Number(row.temperature_c) || 0,
				humidity: Number(row.humidity) || 0,
				co2: row.co2 == null ? null : Number(row.co2) || 0,
				notes: parseAirNotesResponse(row.cw_air_annotations)
			}));
		} catch (error) {
			loadError = readApiErrorMessage(error, m.reports_new_edit_data_load_failed());
		} finally {
			loading = false;
		}
	}

	function stageOp(op: StagedOp) {
		stagedOps.set(op.key, op);
	}

	function unstageOp(key: string) {
		stagedOps.delete(key);
	}

	// Staged ops live only in memory until Save — losing them silently on a
	// refresh or navigation reads as "my note disappeared".
	beforeNavigate((navigation) => {
		if (stagedOps.size === 0 || submitting) return;
		if (!window.confirm(m.reports_new_edit_data_unsaved_warning())) {
			navigation.cancel();
		}
	});

	function handleBeforeUnload(event: BeforeUnloadEvent) {
		if (stagedOps.size === 0 || submitting) return;
		event.preventDefault();
	}

	// Chronological source rendered newest-first.
	let tableLoading = $state(false);
	const loadTableData = createClientTableLoader(() => rawRows, {
		reverse: true,
		onLoadingChange: (value) => (tableLoading = value)
	});
	// Re-query the table whenever data or staged ops change (staged badges live
	// in the notes column).
	let tableKey = $derived(`${rawRows.length}:${stagedOps.size}:${[...stagedOps.keys()].join(',')}`);

	async function handleSave() {
		if (submitting || stagedOps.size === 0) return;
		submitting = true;
		saveErrors = [];
		const api = new ApiService({ authToken: app.accessToken });
		const failures: string[] = [];
		// Captured before the loop drains stagedOps: reported to the queue so the
		// history dialog can show how many edits a pending regeneration covers.
		const editCount = stagedOps.size;

		for (const op of [...stagedOps.values()]) {
			try {
				if (op.kind === 'create') {
					await api.createAirNote({
						note: op.note,
						title: op.title,
						include_in_report: op.includeInReport,
						created_at: op.rowCreatedAt,
						dev_eui: devEui
					});
				} else if (op.kind === 'update' && op.noteId !== undefined) {
					await api.updateAirNote(op.noteId, {
						note: op.note,
						title: op.title,
						include_in_report: op.includeInReport
					});
				} else if (op.kind === 'delete' && op.noteId !== undefined) {
					await api.deleteAirNote(op.noteId);
				}
				stagedOps.delete(op.key);
			} catch (error) {
				failures.push(readApiErrorMessage(error, `${op.kind}: ${op.title || op.note}`));
			}
		}

		if (failures.length > 0) {
			// Succeeded ops are already unstaged; the failed ones stay staged so
			// the user can retry. Do NOT enqueue regeneration on a partial save.
			saveErrors = failures;
			submitting = false;
			return;
		}

		try {
			await api.requestReportRegeneration(templateId, {
				devEui,
				periodStart: periodStartIso,
				periodEnd: periodEndIso,
				sourceObjectName: data.file,
				editCount
			});
			toast.add({ tone: 'success', message: m.reports_new_edit_data_saved() });
			await goto(resolve('/reports'));
		} catch (error) {
			saveErrors = [readApiErrorMessage(error, m.reports_new_save_failed())];
		} finally {
			submitting = false;
		}
	}
</script>

<svelte:window onbeforeunload={handleBeforeUnload} />

<svelte:head>
	<title>{m.reports_new_edit_data_title()}</title>
</svelte:head>

<AppPage width="xl">
	<CwButton
		id="report-edit-data-back-button"
		variant="secondary"
		size="sm"
		onclick={() => goto(resolve('/reports'))}
	>
		&larr; {m.action_back()}
	</CwButton>

	<div class="report-edit-data__header">
		<h1>{m.reports_new_edit_data_title()}</h1>
		<CwChip
			label={m.reports_new_edit_data_subtitle({
				device: data.deviceName,
				start: data.start,
				end: data.end
			})}
			tone="info"
			variant="outline"
			size="sm"
		/>
	</div>

	<AppNotice tone="info">
		<p>{m.reports_new_edit_data_info()}</p>
	</AppNotice>

	{#if loadError}
		<AppNotice tone="danger">
			<p>{loadError}</p>
		</AppNotice>
	{:else if !loading && rawRows.length === 0}
		<AppNotice tone="neutral">
			<p>{m.reports_new_edit_data_no_data()}</p>
		</AppNotice>
	{:else}
		<CwCard title={data.template.name} elevated>
			{#if saveErrors.length > 0}
				<AppNotice tone="danger" ariaLive="polite">
					<p>{m.reports_new_edit_data_save_partial()}</p>
					<ul>
						{#each saveErrors as message (message)}
							<li>{message}</li>
						{/each}
					</ul>
				</AppNotice>
			{/if}

			{#key tableKey}
				<CwDataTable
					labels={cwDataTableLabels()}
					{columns}
					loadData={loadTableData}
					loading={loading || tableLoading}
					rowKey="id"
					rowActionsHeader={m.common_actions()}
				>
					{#snippet cell(row: DataRow, col: CwColumnDef<DataRow>, defaultValue: string)}
						{#if col.key === 'created_at'}
							{new Date(row.created_at).toLocaleString()}
						{:else if col.key === 'temperature_c'}
							{formatSensorMeasurement('temperature_c', row.temperature_c, app.preferences).display}
						{:else if col.key === 'humidity'}
							{formatSensorMeasurement('humidity', row.humidity, app.preferences).display}
						{:else if col.key === 'co2'}
							{row.co2 === null
								? '—'
								: formatSensorMeasurement('co2', row.co2, app.preferences).display}
						{:else if col.key === 'notes'}
							{@const displayNotes = overlayStagedNotes(row.created_at, row.notes, stagedOps)}
							{@const staged = displayNotes.filter((note) => note.staged).length}
							{#if displayNotes.length > 0}
								<span class="report-edit-data__note-count">
									{m.reports_new_edit_data_note_count({ count: displayNotes.length })}
									{#if staged > 0}
										<CwChip
											label={m.reports_new_edit_data_staged_badge()}
											tone="warning"
											variant="outline"
											size="sm"
										/>
									{/if}
								</span>
							{:else}
								—
							{/if}
						{:else}
							{defaultValue}
						{/if}
					{/snippet}
					{#snippet rowActions(row: DataRow)}
						<ReportNoteDialog
							rowCreatedAt={row.created_at}
							notes={overlayStagedNotes(row.created_at, row.notes, stagedOps)}
							onStage={stageOp}
							onUnstage={unstageOp}
						/>
					{/snippet}
				</CwDataTable>
			{/key}

			<AppActionRow>
				{#if stagedCount > 0}
					<span class="report-edit-data__staged">
						{m.reports_new_edit_data_staged_count({ count: stagedCount })}
					</span>
				{/if}
				<CwButton
					id="report-edit-data-cancel-button"
					type="button"
					variant="ghost"
					disabled={submitting}
					onclick={() => goto(resolve('/reports'))}
				>
					{m.action_cancel()}
				</CwButton>
				<CwButton
					id="report-edit-data-save-button"
					type="button"
					variant="primary"
					loading={submitting}
					disabled={stagedCount === 0 || submitting}
					onclick={() => handleSave()}
				>
					{m.action_save_changes()}
				</CwButton>
			</AppActionRow>
		</CwCard>
	{/if}
</AppPage>

<style>
	.report-edit-data__header {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: var(--cw-space-3);
	}

	.report-edit-data__header h1 {
		margin: 0;
		font-size: clamp(1.5rem, 1.2rem + 1vw, 2rem);
		font-weight: var(--cw-font-semibold);
	}

	.report-edit-data__note-count {
		display: inline-flex;
		align-items: center;
		gap: var(--cw-space-2);
	}

	.report-edit-data__staged {
		margin-right: auto;
		align-self: center;
		color: var(--cw-color-text-muted, #6b7280);
		font-size: 0.875rem;
	}
</style>
