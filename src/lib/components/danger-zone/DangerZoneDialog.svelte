<!--
  Confirmation dialog for a danger-zone delete: what will be removed, what is
  being deleted, a typed confirmation and an "I understand" box. The owner
  decides when `canConfirm` is true and what `onConfirm` submits.
-->
<script lang="ts">
	import { AppNotice } from '$lib/components/layout';
	import { m } from '$lib/paraglide/messages.js';
	import { CwButton, CwCheckbox, CwDialog, CwInput } from '@cropwatchdevelopment/cwui';

	interface IdentityRow {
		label: string;
		value: string;
		/** Monospace, for identifiers such as a DevEUI. */
		mono?: boolean;
	}

	interface Props {
		open: boolean;
		/** Element ids are `${idPrefix}-confirm-input` etc., matching DangerZoneCard. */
		idPrefix: string;
		title: string;
		/** Lead-in for `removes`, e.g. "Deleting this device permanently removes:". */
		intro: string;
		removes: string[];
		note?: string | null;
		identity: IdentityRow[];
		confirmLabel: string;
		confirmValue: string;
		confirmError?: string | null;
		acknowledgeLabel: string;
		acknowledged: boolean;
		confirmButtonLabel: string;
		canConfirm: boolean;
		busy?: boolean;
		progress?: string | null;
		onConfirm: () => void;
	}

	let {
		open = $bindable(),
		idPrefix,
		title,
		intro,
		removes,
		note = null,
		identity,
		confirmLabel,
		confirmValue = $bindable(),
		confirmError = null,
		acknowledgeLabel,
		acknowledged = $bindable(),
		confirmButtonLabel,
		canConfirm,
		busy = false,
		progress = null,
		onConfirm
	}: Props = $props();
</script>

<CwDialog bind:open {title} hideClose={busy} closeOnBackdrop={!busy} closeOnEscape={!busy}>
	<div class="danger-zone-dialog">
		<AppNotice tone="danger" title={m.danger_zone_irreversible()}>
			<p>{intro}</p>
			<ul class="danger-zone-dialog__list">
				{#each removes as item (item)}
					<li>{item}</li>
				{/each}
			</ul>
		</AppNotice>

		{#if note}
			<p class="danger-zone-dialog__copy">{note}</p>
		{/if}

		<dl class="danger-zone-dialog__identity">
			{#each identity as row (row.label)}
				<dt>{row.label}</dt>
				<dd>
					{#if row.mono}
						<code>{row.value}</code>
					{:else}
						{row.value}
					{/if}
				</dd>
			{/each}
		</dl>

		<CwInput
			id="{idPrefix}-confirm-input"
			label={confirmLabel}
			autocomplete="off"
			disabled={busy}
			error={confirmError ?? undefined}
			bind:value={confirmValue}
		/>
		<CwCheckbox
			id="{idPrefix}-acknowledge-checkbox"
			label={acknowledgeLabel}
			disabled={busy}
			bind:checked={acknowledged}
		/>

		{#if busy && progress}
			<p class="danger-zone-dialog__copy" role="status">{progress}</p>
		{/if}
	</div>
	{#snippet actions()}
		<CwButton
			id="{idPrefix}-dismiss-button"
			variant="ghost"
			onclick={() => (open = false)}
			disabled={busy}
		>
			{m.action_cancel()}
		</CwButton>
		<CwButton
			id="{idPrefix}-confirm-button"
			variant="danger"
			onclick={onConfirm}
			loading={busy}
			disabled={!canConfirm || busy}
		>
			{confirmButtonLabel}
		</CwButton>
	{/snippet}
</CwDialog>

<style>
	.danger-zone-dialog {
		display: flex;
		flex-direction: column;
		gap: var(--cw-space-4);
	}

	.danger-zone-dialog__copy {
		margin: 0;
		font-size: var(--cw-text-sm);
		color: var(--cw-text-secondary);
	}

	.danger-zone-dialog__list {
		margin: var(--cw-space-2) 0 0;
		padding-left: var(--cw-space-5);
		list-style: disc;
	}

	.danger-zone-dialog__identity {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: var(--cw-space-1) var(--cw-space-3);
		margin: 0;
		font-size: var(--cw-text-sm);
	}

	.danger-zone-dialog__identity dt {
		color: var(--cw-text-secondary);
	}

	.danger-zone-dialog__identity dd {
		margin: 0;
		color: var(--cw-text-primary);
		overflow-wrap: anywhere;
	}

	.danger-zone-dialog__identity code {
		font-family: var(--cw-font-mono);
	}
</style>
