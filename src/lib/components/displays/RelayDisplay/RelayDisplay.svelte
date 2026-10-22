<!--
  RelayDisplay.svelte — Display component for cw_relay_data.

  Renders relay toggle state cards and the relay's history: state changes the
  device reported and commands sent from CropWatch, with whether the device
  confirmed them (GET /relay/:dev_eui/history, loaded by the device page).
-->
<script lang="ts">
	import {
		CwButton,
		CwCard,
		CwChip,
		CwDataTable,
		CwInput,
		CwSwitch,
		type CwColumnDef,
		CwExpandPanel
	} from '@cropwatchdevelopment/cwui';
	import { cwDataTableLabels, cwInputLabels } from '$lib/i18n/cwuiLabels';
	import { createClientTableLoader } from '$lib/utils/clientTableLoader';
	import {
		hasConfirmingRelay,
		MAX_RELAY_PULSE_DURATION_SECONDS,
		MIN_RELAY_PULSE_DURATION_SECONDS
	} from '$lib/devices/relay-control';
	import type { RelayHistoryEntryDto } from '$lib/api/api.dtos';
	import {
		relayHistoryEventLabel,
		relayHistoryResult,
		relayStateLabel
	} from '$lib/devices/relay-labels';
	import { getRelayState, normalizeRelayTelemetryRow } from '$lib/devices/relay-telemetry';
	import type { PendingRelayState, RelayNumber, RelayTargetState } from '$lib/devices/relay-types';
	import { getAppContext } from '$lib/appContext.svelte';
	import { formatDateTime } from '$lib/i18n/format';
	import type { DeviceDisplayProps } from '$lib/interfaces/deviceDisplay';
	import { m } from '$lib/paraglide/messages.js';
	import { canManage } from '$lib/constants/permissions';

	let {
		latestData,
		loading,
		permissionLevel,
		pendingRelayStates = {},
		queueRelayCommand,
		relayHistory = []
	}: Pick<
		DeviceDisplayProps,
		| 'latestData'
		| 'loading'
		| 'pendingRelayStates'
		| 'permissionLevel'
		| 'queueRelayCommand'
		| 'relayHistory'
	> = $props();

	// The controls only work while signed in (`app.accessToken` is the session token).
	const app = getAppContext();

	// ---- Columns ---------------------------------------------------------------

	const DEFAULT_TIMED_ON_DURATION_SECONDS = '60';

	const columns: CwColumnDef<RelayHistoryEntryDto>[] = [
		{ key: 'at', header: m.display_timestamp(), sortable: true, width: '13.5rem' },
		{ key: 'event', header: m.devices_relay_history_column_event() },
		{ key: 'relay_1', header: m.display_relay_one(), width: '8rem' },
		{ key: 'relay_2', header: m.display_relay_two(), width: '8rem' },
		{ key: 'result', header: m.devices_relay_history_column_result(), width: '9rem' }
	];

	// A command and the device's answer are ~4 s apart, so show seconds.
	const HISTORY_TIME_FORMAT: Intl.DateTimeFormatOptions = {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
		hour: 'numeric',
		minute: '2-digit',
		second: '2-digit'
	};

	// ---- Derived state ---------------------------------------------------------

	let latestRelayRow = $derived(normalizeRelayTelemetryRow(latestData));
	let latestRelay1 = $derived(getRelayState(latestRelayRow, 1));
	let latestRelay2 = $derived(getRelayState(latestRelayRow, 2));
	let displayRelay1 = $derived(getDisplayedRelayState(1));
	let displayRelay2 = $derived(getDisplayedRelayState(2));
	let relayOnePendingState = $derived(getPendingRelayState(1));
	let relayTwoPendingState = $derived(getPendingRelayState(2));
	let lastUpdate = $derived(latestRelayRow?.created_at ?? '');
	let relayOperationsLocked = $derived(hasLockedRelayOperation());
	let controlNotice = $derived.by(() => {
		if (!canManage(permissionLevel)) {
			return m.devices_relay_controls_requires_permission();
		}
		return '';
	});
	let submittingRelayCommands = $state<Partial<Record<RelayNumber, RelayTargetState>>>({});
	let submittingTimedRelayCommands = $state<Partial<Record<RelayNumber, boolean>>>({});
	let timedOnDurationSeconds = $state(DEFAULT_TIMED_ON_DURATION_SECONDS);
	let timedOnDurationError = $derived(getTimedOnDurationError());
	// CwDataTable only reloads on its own query changes: remount it when an
	// entry appears or a command settles.
	let historyKey = $derived(
		relayHistory
			.map((entry) => `${entry.id}:${entry.kind === 'command' ? entry.outcome : ''}`)
			.join('|')
	);

	// ---- Table loader ----------------------------------------------------------

	let tableLoading = $state(false);

	function getPendingRelayState(relay: RelayNumber): PendingRelayState | null {
		return pendingRelayStates[relay] ?? null;
	}

	function getRelayStateLabel(value: boolean | null): string {
		if (value === null) {
			return m.display_unknown();
		}

		return relayStateLabel(value);
	}

	/**
	 * The relay state a history row shows: what a state change reported, or
	 * what the device reported for the relay a command targeted (a status
	 * request shows both).
	 */
	function historyRelayValue(entry: RelayHistoryEntryDto, relay: RelayNumber): boolean | null {
		if (entry.kind === 'command' && entry.relay !== null && entry.relay !== relay) {
			return null;
		}

		return relay === 1 ? entry.relay_1 : entry.relay_2;
	}

	function getRelayStateTone(value: boolean | null): 'danger' | 'secondary' | 'success' {
		if (value === null) {
			return 'secondary';
		}

		return value ? 'success' : 'danger';
	}

	function isRelaySubmitting(relay: RelayNumber, targetState: RelayTargetState): boolean {
		return submittingRelayCommands[relay] === targetState;
	}

	function isTimedRelaySubmitting(relay: RelayNumber): boolean {
		return submittingTimedRelayCommands[relay] === true;
	}

	function isRelaySubmittingAny(relay: RelayNumber): boolean {
		return Boolean(submittingRelayCommands[relay]) || isTimedRelaySubmitting(relay);
	}

	function hasLockedRelayOperation(): boolean {
		// Only while a command is actively being confirmed: once that window
		// passes, the user can act again (e.g. switch it back) without waiting
		// for the device's next scheduled report.
		return (
			hasConfirmingRelay(pendingRelayStates) ||
			Object.keys(submittingRelayCommands).length > 0 ||
			Object.keys(submittingTimedRelayCommands).length > 0
		);
	}

	function getDisplayedRelayState(relay: RelayNumber): boolean | null {
		const optimisticTargetState = getOptimisticRelayTargetState(relay);
		if (optimisticTargetState) {
			return optimisticTargetState === 'on';
		}

		return relay === 1 ? latestRelay1 : latestRelay2;
	}

	function getOptimisticRelayTargetState(relay: RelayNumber): RelayTargetState | null {
		const pendingState = getPendingRelayState(relay);
		if (pendingState) {
			return pendingState.requestedState;
		}

		const submittingState = submittingRelayCommands[relay];
		if (submittingState) {
			return submittingState;
		}

		if (isTimedRelaySubmitting(relay)) {
			return 'on';
		}

		return null;
	}

	function isRelayTargetSelected(relay: RelayNumber, targetState: RelayTargetState): boolean {
		const displayState = getDisplayedRelayState(relay);
		if (displayState === null) {
			return false;
		}

		return targetState === 'on' ? displayState : !displayState;
	}

	function parseTimedOnDurationSeconds(): number | null {
		const value = timedOnDurationSeconds.trim();
		if (!/^\d+$/.test(value)) {
			return null;
		}

		const parsed = Number.parseInt(value, 10);
		if (parsed < MIN_RELAY_PULSE_DURATION_SECONDS || parsed > MAX_RELAY_PULSE_DURATION_SECONDS) {
			return null;
		}

		return parsed;
	}

	function getTimedOnDurationError(): string {
		if (timedOnDurationSeconds.trim() === '') {
			return m.devices_relay_pulse_duration_error({
				maxSeconds: String(MAX_RELAY_PULSE_DURATION_SECONDS),
				minSeconds: String(MIN_RELAY_PULSE_DURATION_SECONDS)
			});
		}

		return parseTimedOnDurationSeconds() === null
			? m.devices_relay_pulse_duration_error({
					maxSeconds: String(MAX_RELAY_PULSE_DURATION_SECONDS),
					minSeconds: String(MIN_RELAY_PULSE_DURATION_SECONDS)
				})
			: '';
	}

	function isRelayActionDisabled(relay: RelayNumber, targetState: RelayTargetState): boolean {
		if (
			relayOperationsLocked ||
			isRelaySubmittingAny(relay) ||
			!app.accessToken ||
			!canManage(permissionLevel) ||
			!queueRelayCommand
		) {
			return true;
		}

		const currentState = getDisplayedRelayState(relay);
		if (currentState === null) {
			return false;
		}

		return targetState === 'on' ? currentState : !currentState;
	}

	function isTimedOnActionDisabled(relay: RelayNumber): boolean {
		if (
			relayOperationsLocked ||
			isRelaySubmittingAny(relay) ||
			!app.accessToken ||
			!canManage(permissionLevel) ||
			!queueRelayCommand ||
			parseTimedOnDurationSeconds() === null
		) {
			return true;
		}

		const currentState = getDisplayedRelayState(relay);
		return currentState === true;
	}

	// The buttons calling these are disabled whenever their action is
	// (isRelayActionDisabled / isTimedOnActionDisabled), so they don't re-check it.
	async function handleRelayCommand(
		relay: RelayNumber,
		targetState: RelayTargetState
	): Promise<void> {
		submittingRelayCommands = {
			...submittingRelayCommands,
			[relay]: targetState
		};

		try {
			await queueRelayCommand?.(relay, targetState);
		} finally {
			const nextSubmittingRelayCommands = { ...submittingRelayCommands };
			delete nextSubmittingRelayCommands[relay];
			submittingRelayCommands = nextSubmittingRelayCommands;
		}
	}

	async function handleTimedOnCommand(relay: RelayNumber): Promise<void> {
		// Kept although the button is disabled without a valid duration: a command
		// without one would switch the relay on indefinitely instead of pulsing it.
		const durationSeconds = parseTimedOnDurationSeconds();
		if (durationSeconds === null) return;

		submittingTimedRelayCommands = {
			...submittingTimedRelayCommands,
			[relay]: true
		};

		try {
			await queueRelayCommand?.(relay, 'on', durationSeconds);
		} finally {
			const nextSubmittingTimedRelayCommands = { ...submittingTimedRelayCommands };
			delete nextSubmittingTimedRelayCommands[relay];
			submittingTimedRelayCommands = nextSubmittingTimedRelayCommands;
		}
	}

	// `at` is an ISO UTC timestamp, so the default string sort is chronological.
	// The history table has no search box, so its rows need no search text.
	const loadHistory = createClientTableLoader<RelayHistoryEntryDto>(() => relayHistory, {
		onLoadingChange: (value) => (tableLoading = value)
	});
</script>

{#snippet pendingFeedback(pending: PendingRelayState)}
	<div class="relay-feedback">
		{#if pending.phase === 'confirming'}
			<CwChip label={m.devices_relay_confirmation_pending()} tone="warning" variant="soft" />
			<p class="relay-feedback__copy">{m.devices_relay_waiting_for_confirmation()}</p>
			{#if pending.statusRequested}
				<p class="relay-feedback__copy">{m.devices_relay_status_requested()}</p>
			{/if}
		{:else}
			<CwChip label={m.devices_relay_not_confirmed()} tone="warning" variant="soft" />
			<p class="relay-feedback__copy">{m.devices_relay_awaiting_report()}</p>
		{/if}
	</div>
{/snippet}

<div class="relay-display">
	<!-- Current relay status -->
	<div class="relay-grid">
		<CwCard title={m.display_relay_one()} subtitle={m.display_current_state()} elevated>
			<div class="relay-state">
				<CwSwitch checked={displayRelay1 === true} disabled />
				<CwChip
					label={getRelayStateLabel(displayRelay1)}
					tone={getRelayStateTone(displayRelay1)}
					variant="soft"
				/>
			</div>
			{#if relayOnePendingState}
				{@render pendingFeedback(relayOnePendingState)}
			{:else if latestRelay1 === null}
				<p class="relay-feedback__copy">{m.devices_relay_state_unknown()}</p>
			{/if}
			<div class="relay-actions">
				<CwButton
					size="sm"
					variant={isRelayTargetSelected(1, 'on') ? 'primary' : 'secondary'}
					aria-pressed={isRelayTargetSelected(1, 'on')}
					disabled={isRelayActionDisabled(1, 'on')}
					loading={isRelaySubmitting(1, 'on')}
					onclick={() => handleRelayCommand(1, 'on')}
				>
					{m.devices_relay_turn_on()}
				</CwButton>
				<CwButton
					size="sm"
					variant={isRelayTargetSelected(1, 'off') ? 'primary' : 'secondary'}
					aria-pressed={isRelayTargetSelected(1, 'off')}
					disabled={isRelayActionDisabled(1, 'off')}
					loading={isRelaySubmitting(1, 'off')}
					onclick={() => handleRelayCommand(1, 'off')}
				>
					{m.devices_relay_turn_off()}
				</CwButton>
			</div>
		</CwCard>

		<CwCard title={m.display_relay_two()} subtitle={m.display_current_state()} elevated>
			<div class="relay-state">
				<CwSwitch checked={displayRelay2 === true} disabled />
				<CwChip
					label={getRelayStateLabel(displayRelay2)}
					tone={getRelayStateTone(displayRelay2)}
					variant="soft"
				/>
			</div>
			{#if relayTwoPendingState}
				{@render pendingFeedback(relayTwoPendingState)}
			{:else if latestRelay2 === null}
				<p class="relay-feedback__copy">{m.devices_relay_state_unknown()}</p>
			{/if}
			<div class="relay-actions">
				<CwButton
					size="sm"
					variant={isRelayTargetSelected(2, 'on') ? 'primary' : 'secondary'}
					aria-pressed={isRelayTargetSelected(2, 'on')}
					disabled={isRelayActionDisabled(2, 'on')}
					loading={isRelaySubmitting(2, 'on')}
					onclick={() => handleRelayCommand(2, 'on')}
				>
					{m.devices_relay_turn_on()}
				</CwButton>
				<CwButton
					size="sm"
					variant={isRelayTargetSelected(2, 'off') ? 'primary' : 'secondary'}
					aria-pressed={isRelayTargetSelected(2, 'off')}
					disabled={isRelayActionDisabled(2, 'off')}
					loading={isRelaySubmitting(2, 'off')}
					onclick={() => handleRelayCommand(2, 'off')}
				>
					{m.devices_relay_turn_off()}
				</CwButton>
			</div>
		</CwCard>
	</div>

	<CwExpandPanel title={m.devices_relay_pulse_panel_title()}>
		<div class="relay-timed-on">
			<p class="relay-timed-on__copy">{m.devices_relay_pulse_description()}</p>
			<div class="relay-timed-on__controls">
				<CwInput
					labels={cwInputLabels()}
					label={m.devices_relay_pulse_duration_label()}
					type="numeric"
					bind:value={timedOnDurationSeconds}
					min={MIN_RELAY_PULSE_DURATION_SECONDS}
					max={MAX_RELAY_PULSE_DURATION_SECONDS}
					step={1}
					error={timedOnDurationError || undefined}
					disabled={!app.accessToken || !canManage(permissionLevel)}
				/>
				<div class="relay-timed-on__actions">
					<CwButton
						size="lg"
						variant="secondary"
						disabled={isTimedOnActionDisabled(1)}
						loading={isTimedRelaySubmitting(1)}
						onclick={() => handleTimedOnCommand(1)}
					>
						{m.devices_relay_pulse_action({ relay: m.display_relay_one() })}
					</CwButton>
					<CwButton
						size="lg"
						variant="secondary"
						disabled={isTimedOnActionDisabled(2)}
						loading={isTimedRelaySubmitting(2)}
						onclick={() => handleTimedOnCommand(2)}
					>
						{m.devices_relay_pulse_action({ relay: m.display_relay_two() })}
					</CwButton>
				</div>
			</div>
		</div>
	</CwExpandPanel>

	{#if lastUpdate}
		<p class="last-update">{m.display_last_updated()}: {formatDateTime(lastUpdate)}</p>
	{/if}

	{#if controlNotice}
		<p class="relay-note">{controlNotice}</p>
	{/if}

	{#if !loading}
		<CwCard
			title={m.display_relay_history()}
			subtitle={m.devices_relay_history_subtitle()}
			elevated
		>
			{#if relayHistory.length > 0}
				{#key historyKey}
					<CwDataTable
						labels={cwDataTableLabels()}
						{columns}
						loadData={loadHistory}
						loading={tableLoading}
						rowKey="id"
					>
						{#snippet cell(entry: RelayHistoryEntryDto, col: CwColumnDef<RelayHistoryEntryDto>)}
							{#if col.key === 'at'}
								{formatDateTime(entry.at, HISTORY_TIME_FORMAT)}
							{:else if col.key === 'event'}
								<span class="relay-history__event">{relayHistoryEventLabel(entry)}</span>
								{#if entry.kind === 'command' && entry.requested_by}
									<span class="relay-history__by">
										{m.devices_relay_history_requested_by({ name: entry.requested_by })}
									</span>
								{/if}
							{:else if col.key === 'relay_1' || col.key === 'relay_2'}
								{@const relay = col.key === 'relay_1' ? 1 : 2}
								{@const value = historyRelayValue(entry, relay)}
								{#if value === null}
									<span class="relay-history__none">—</span>
								{:else}
									<CwChip
										label={getRelayStateLabel(value)}
										tone={getRelayStateTone(value)}
										variant={entry.kind === 'state_change' && entry.changed_relays.includes(relay)
											? 'soft'
											: 'outline'}
									/>
								{/if}
							{:else if col.key === 'result'}
								{#if entry.kind === 'command'}
									{@const result = relayHistoryResult(entry.outcome)}
									<CwChip label={result.label} tone={result.tone} variant="soft" />
								{/if}
							{/if}
						{/snippet}
					</CwDataTable>
				{/key}
			{:else}
				<p class="relay-history__empty">{m.devices_relay_history_empty()}</p>
			{/if}
		</CwCard>
	{/if}
</div>

<style>
	.relay-display {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	.relay-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
		gap: 1rem;
	}
	.relay-state {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0.5rem 0;
	}
	.relay-actions {
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
		margin-top: 0.5rem;
	}
	.relay-feedback {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-bottom: 0.5rem;
	}
	.relay-feedback__copy {
		margin: 0;
		color: var(--cw-text-secondary);
		font-size: 0.9rem;
	}
	.relay-history__event {
		display: block;
	}
	.relay-history__by {
		display: block;
		color: var(--cw-text-muted);
		font-size: 0.8rem;
	}
	.relay-history__none {
		color: var(--cw-text-muted);
	}
	.relay-history__empty {
		margin: 0;
		color: var(--cw-text-secondary);
		font-size: 0.9rem;
	}
	.last-update {
		font-size: 0.85rem;
		color: var(--cw-text-muted);
		text-align: right;
	}
	.relay-note {
		margin: 0;
		padding: 0.75rem 1rem;
		border: 1px solid var(--cw-border-muted);
		border-radius: 0.75rem;
		background-color: var(--cw-bg-subtle);
		color: var(--cw-text-secondary);
		font-size: 0.9rem;
	}
	.relay-timed-on {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}
	.relay-timed-on__copy {
		margin: 0;
		color: var(--cw-text-secondary);
		font-size: 0.9rem;
	}
	.relay-timed-on__controls {
		display: grid;
		grid-template-columns: minmax(0, 14rem) minmax(0, 1fr);
		gap: 1rem;
		align-items: end;
	}
	.relay-timed-on__actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
	}
	@media (max-width: 640px) {
		.relay-timed-on__controls {
			grid-template-columns: 1fr;
		}
	}
</style>
