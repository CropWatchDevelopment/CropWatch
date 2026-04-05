<!--
  RelayDisplay.svelte — Display component for cw_relay_data.

  Renders relay toggle state cards and a history log of state changes.
  Unlike sensor displays, relays have boolean state columns (relay_1, relay_2)
  rather than continuous numeric time series.
-->
<script lang="ts">
	import {
		CwButton,
		CwCard,
		CwChip,
		CwDuration,
		CwDataTable,
		CwInput,
		CwSwitch,
		type CwColumnDef,
		type CwTableQuery,
		type CwTableResult,
		CwExpandPanel
	} from '@cropwatchdevelopment/cwui';
	import {
		MAX_RELAY_PULSE_DURATION_SECONDS,
		MIN_RELAY_PULSE_DURATION_SECONDS
	} from '$lib/devices/relay-control';
	import {
		getRelayState,
		normalizeRelayTelemetryRow,
		normalizeRelayTelemetryRows
	} from '$lib/devices/relay-telemetry';
	import type {
		PendingRelayState,
		PendingRelayStates,
		RelayNumber,
		RelayTargetState,
		RelayTelemetryRow
	} from '$lib/devices/relay-types';
	import { formatDateTime } from '$lib/i18n/format';
	import type { DeviceDisplayProps } from '$lib/interfaces/deviceDisplay';
	import { m } from '$lib/paraglide/messages.js';

	let {
		latestData,
		historicalData,
		loading,
		authToken,
		permissionLevel,
		pendingRelayStates = {},
		queueRelayCommand
	}: Pick<
		DeviceDisplayProps,
		| 'latestData'
		| 'historicalData'
		| 'authToken'
		| 'loading'
		| 'pendingRelayStates'
		| 'permissionLevel'
		| 'queueRelayCommand'
	> = $props();

	// ---- Columns ---------------------------------------------------------------

	const DEFAULT_TIMED_ON_DURATION_SECONDS = '60';

	const columns: CwColumnDef<RelayTelemetryRow>[] = [
		{ key: 'created_at', header: m.display_timestamp(), sortable: true, width: '13.5rem' },
		{ key: 'relay_1', header: m.display_relay_one(), sortable: true, width: '8rem' },
		{ key: 'relay_2', header: m.display_relay_two(), sortable: true, width: '8rem' }
	];

	// ---- Derived state ---------------------------------------------------------

	let rows = $derived(normalizeRelayTelemetryRows(historicalData));
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
		if (permissionLevel > 2) {
			return m.devices_relay_controls_requires_permission();
		}
		return '';
	});
	let submittingRelayCommands = $state<Partial<Record<RelayNumber, RelayTargetState>>>({});
	let submittingTimedRelayCommands = $state<Partial<Record<RelayNumber, boolean>>>({});
	let timedOnDurationSeconds = $state(DEFAULT_TIMED_ON_DURATION_SECONDS);
	let timedOnDurationError = $derived(getTimedOnDurationError());

	// ---- Table loader ----------------------------------------------------------

	let tableLoading = $state(false);

	function getPendingRelayState(relay: RelayNumber): PendingRelayState | null {
		return pendingRelayStates[relay] ?? null;
	}

	function getRelayStateLabel(value: boolean | null): string {
		if (value === null) {
			return m.display_unknown();
		}

		return value ? m.display_on() : m.display_off();
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
		return (
			Object.keys(pendingRelayStates).length > 0 ||
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
			!authToken ||
			permissionLevel > 2 ||
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
			!authToken ||
			permissionLevel > 2 ||
			!queueRelayCommand ||
			parseTimedOnDurationSeconds() === null
		) {
			return true;
		}

		const currentState = getDisplayedRelayState(relay);
		return currentState === true;
	}

	async function handleRelayCommand(
		relay: RelayNumber,
		targetState: RelayTargetState
	): Promise<void> {
		if (isRelayActionDisabled(relay, targetState) || !queueRelayCommand) {
			return;
		}

		submittingRelayCommands = {
			...submittingRelayCommands,
			[relay]: targetState
		};

		try {
			await queueRelayCommand(relay, targetState);
		} finally {
			const nextSubmittingRelayCommands = { ...submittingRelayCommands };
			delete nextSubmittingRelayCommands[relay];
			submittingRelayCommands = nextSubmittingRelayCommands;
		}
	}

	async function handleTimedOnCommand(relay: RelayNumber): Promise<void> {
		const durationSeconds = parseTimedOnDurationSeconds();
		if (durationSeconds === null || isTimedOnActionDisabled(relay) || !queueRelayCommand) {
			return;
		}

		submittingTimedRelayCommands = {
			...submittingTimedRelayCommands,
			[relay]: true
		};

		try {
			await queueRelayCommand(relay, 'on', durationSeconds);
		} finally {
			const nextSubmittingTimedRelayCommands = { ...submittingTimedRelayCommands };
			delete nextSubmittingTimedRelayCommands[relay];
			submittingTimedRelayCommands = nextSubmittingTimedRelayCommands;
		}
	}

	async function loadTableData(query: CwTableQuery): Promise<CwTableResult<RelayTelemetryRow>> {
		tableLoading = true;
		try {
			let filtered = [...rows];

			if (query.sort) {
				const dir = query.sort.direction === 'asc' ? 1 : -1;
				filtered.sort((a, b) => {
					if (query.sort!.column === 'created_at') {
						return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * dir;
					}

					if (query.sort!.column === 'relay_1') {
						return ((a.relay_1 === true ? 1 : 0) - (b.relay_1 === true ? 1 : 0)) * dir;
					}

					if (query.sort!.column === 'relay_2') {
						return ((a.relay_2 === true ? 1 : 0) - (b.relay_2 === true ? 1 : 0)) * dir;
					}

					return String(a[query.sort!.column] ?? '').localeCompare(
						String(b[query.sort!.column] ?? '')
					);
				});
			}

			const start = Math.max(0, (query.page - 1) * query.pageSize);
			return { rows: filtered.slice(start, start + query.pageSize), total: filtered.length };
		} finally {
			tableLoading = false;
		}
	}
</script>

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
				<div class="relay-feedback">
					<CwChip label={m.devices_relay_confirmation_pending()} tone="warning" variant="soft" />
					<p class="relay-feedback__copy">{m.devices_relay_waiting_for_confirmation()}</p>
					{#if relayOnePendingState.verifyAt}
						<p class="relay-feedback__countdown">
							{m.devices_relay_confirmation_checking_again_in()}
							<span class="relay-feedback__duration">
								<CwDuration from={relayOnePendingState.verifyAt} countDown={true} />
							</span>
						</p>
					{/if}
				</div>
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
				<div class="relay-feedback">
					<CwChip label={m.devices_relay_confirmation_pending()} tone="warning" variant="soft" />
					<p class="relay-feedback__copy">{m.devices_relay_waiting_for_confirmation()}</p>
					{#if relayTwoPendingState.verifyAt}
						<p class="relay-feedback__countdown">
							{m.devices_relay_confirmation_checking_again_in()}
							<span class="relay-feedback__duration">
								<CwDuration from={relayTwoPendingState.verifyAt} countDown={true} />
							</span>
						</p>
					{/if}
				</div>
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
					label={m.devices_relay_pulse_duration_label()}
					type="numeric"
					bind:value={timedOnDurationSeconds}
					min={MIN_RELAY_PULSE_DURATION_SECONDS}
					max={MAX_RELAY_PULSE_DURATION_SECONDS}
					step={1}
					error={timedOnDurationError || undefined}
					disabled={!authToken || permissionLevel > 2}
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

	{#if !loading && rows.length > 0}
		<CwCard title={m.display_relay_history()} subtitle={m.display_state_change_log()} elevated>
			<CwDataTable {columns} loadData={loadTableData} loading={tableLoading} rowKey="id">
				{#snippet cell(
					row: RelayTelemetryRow,
					col: CwColumnDef<RelayTelemetryRow>,
					defaultValue: string
				)}
					{#if col.key === 'created_at'}
						{formatDateTime(row.created_at)}
					{:else if col.key === 'relay_1' || col.key === 'relay_2'}
						<CwChip
							label={getRelayStateLabel(col.key === 'relay_1' ? row.relay_1 : row.relay_2)}
							tone={getRelayStateTone(col.key === 'relay_1' ? row.relay_1 : row.relay_2)}
							variant="outline"
						/>
					{:else}
						{defaultValue}
					{/if}
				{/snippet}
			</CwDataTable>
		</CwCard>
	{:else if !loading}
		<CwCard title={m.display_no_data()} elevated>
			<p>{m.display_no_relay_history()}</p>
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
		color: var(--cw-text-muted, #475467);
		font-size: 0.9rem;
	}
	.relay-feedback__countdown {
		margin: 0;
		color: var(--cw-text-secondary, #344054);
		font-size: 0.85rem;
	}
	.relay-feedback__duration {
		display: inline-block;
		margin-left: 0.35rem;
		font-variant-numeric: tabular-nums;
	}
	.last-update {
		font-size: 0.85rem;
		color: var(--cw-text-muted);
		text-align: right;
	}
	.relay-note {
		margin: 0;
		padding: 0.75rem 1rem;
		border: 1px solid var(--cw-border, #d0d5dd);
		border-radius: 0.75rem;
		background-color: var(--cw-surface-muted, #f8fafc);
		color: var(--cw-text-muted, #475467);
		font-size: 0.9rem;
	}
	.relay-timed-on {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}
	.relay-timed-on__copy {
		margin: 0;
		color: var(--cw-text-muted, #475467);
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
