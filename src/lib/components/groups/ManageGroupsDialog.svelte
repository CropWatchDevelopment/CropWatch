<script lang="ts">
	import { tick } from 'svelte';
	import { CwButton, CwDialog, CwInput } from '@cropwatchdevelopment/cwui';
	import Icon from '#lib/components/Icon.svelte';
	import EDIT_ICON from '#lib/images/icons/edit.svg';
	import TRASH_ICON from '#lib/images/icons/trash.svg';
	import { cwInputLabels } from '#lib/i18n/cwuiLabels.ts';
	import { m } from '#lib/paraglide/messages.js';
	import type { GroupDto } from '#lib/api/api.dtos.ts';
	import { GROUP_NAME_MAX_LENGTH, type GroupsController } from './groups-controller.svelte';

	interface Props {
		controller: GroupsController;
		/**
		 * The picker's value. It follows a rename of the selected group and is
		 * cleared when the selected group is deleted (names are unique within
		 * the org's list).
		 */
		value?: string;
	}

	let { controller, value = $bindable('') }: Props = $props();

	const uid = $props.id();
	/** The row being renamed or asked to confirm its delete; one at a time. */
	let editingId = $state<number | null>(null);
	let confirmingId = $state<number | null>(null);
	let draft = $state('');
	let draftTrimmed = $derived(draft.trim());
	let draftTooLong = $derived(draftTrimmed.length > GROUP_NAME_MAX_LENGTH);

	/** Focus the element with this id once the row has re-rendered. */
	async function focusById(id: string) {
		await tick();
		document.getElementById(id)?.focus();
	}

	/** Leave the rename/confirm block; focus returns to the row's button that opened it. */
	function cancel(returnFocusTo?: string) {
		editingId = null;
		confirmingId = null;
		draft = '';
		if (returnFocusTo) void focusById(returnFocusTo);
	}

	function startRename(group: GroupDto) {
		confirmingId = null;
		editingId = group.id;
		draft = group.name;
		void focusById(`${uid}-rename-${group.id}`);
	}

	function startDelete(group: GroupDto) {
		editingId = null;
		confirmingId = group.id;
		void focusById(`${uid}-confirm-${group.id}`);
	}

	async function saveRename(group: GroupDto) {
		const from = group.name;
		if (draftTrimmed === from) {
			cancel(`${uid}-rename-button-${group.id}`);
			return;
		}
		const to = draftTrimmed;
		if (!(await controller.rename(group.id, to))) return;
		if (value === from) value = to;
		cancel(`${uid}-rename-button-${group.id}`);
	}

	async function confirmDelete(group: GroupDto) {
		// The deleted row's button goes away with it: focus moves to the next
		// row's Rename, else the previous row's, else the dialog's Close.
		const rows = controller.manageable;
		const index = rows.findIndex((row) => row.id === group.id);
		const neighbour = rows[index + 1] ?? rows[index - 1];
		if (!(await controller.remove(group.id))) return;
		if (value === group.name) value = '';
		cancel(neighbour ? `${uid}-rename-button-${neighbour.id}` : `${uid}-close`);
	}
</script>

<CwDialog
	bind:open={controller.manageOpen}
	title={controller.kind === 'location'
		? m.groups_manage_title_location()
		: m.groups_manage_title_device()}
	closeLabel={m.action_close()}
	onclose={() => cancel()}
>
	<div class="manage-groups">
		<p class="manage-groups__hint">{m.groups_manage_hint()}</p>

		{#if controller.manageable.length === 0}
			<p class="manage-groups__empty">{m.groups_manage_empty()}</p>
		{:else}
			<ul class="manage-groups__list">
				{#each controller.manageable as group (group.id)}
					<li class="manage-groups__row" data-group-id={group.id}>
						{#if editingId === group.id}
							<form
								class="manage-groups__rename"
								onsubmit={(event) => {
									event.preventDefault();
									if (draftTrimmed && !draftTooLong) void saveRename(group);
								}}
							>
								<CwInput
									labels={cwInputLabels()}
									id="{uid}-rename-{group.id}"
									label={m.groups_name_label()}
									autocomplete="off"
									error={draftTooLong
										? m.groups_name_too_long({ max: String(GROUP_NAME_MAX_LENGTH) })
										: undefined}
									bind:value={draft}
								/>
								<div class="manage-groups__buttons">
									<CwButton
										variant="ghost"
										size="sm"
										onclick={() => cancel(`${uid}-rename-button-${group.id}`)}
									>
										{m.action_cancel()}
									</CwButton>
									<CwButton
										type="submit"
										variant="primary"
										size="sm"
										loading={controller.busy}
										disabled={!draftTrimmed || draftTooLong}
									>
										{m.groups_save()}
									</CwButton>
								</div>
							</form>
						{:else if confirmingId === group.id}
							<div class="manage-groups__confirm" role="alert">
								<p>
									{controller.kind === 'location'
										? m.groups_delete_confirm_location({ name: group.name })
										: m.groups_delete_confirm_device({ name: group.name })}
								</p>
								<div class="manage-groups__buttons">
									<CwButton
										variant="ghost"
										size="sm"
										onclick={() => cancel(`${uid}-delete-button-${group.id}`)}
									>
										{m.action_cancel()}
									</CwButton>
									<CwButton
										id="{uid}-confirm-{group.id}"
										variant="danger"
										size="sm"
										loading={controller.busy}
										onclick={() => void confirmDelete(group)}
									>
										{m.action_delete()}
									</CwButton>
								</div>
							</div>
						{:else}
							<span class="manage-groups__name">{group.name}</span>
							<div class="manage-groups__buttons">
								<CwButton
									id="{uid}-rename-button-{group.id}"
									variant="ghost"
									size="sm"
									aria-label={m.groups_rename_aria({ name: group.name })}
									disabled={controller.busy}
									onclick={() => startRename(group)}
								>
									<Icon src={EDIT_ICON} />
									{m.groups_rename()}
								</CwButton>
								<CwButton
									id="{uid}-delete-button-{group.id}"
									variant="ghost"
									size="sm"
									aria-label={m.groups_delete_aria({ name: group.name })}
									disabled={controller.busy}
									onclick={() => startDelete(group)}
								>
									<Icon src={TRASH_ICON} />
									{m.action_delete()}
								</CwButton>
							</div>
						{/if}
					</li>
				{/each}
			</ul>
		{/if}
	</div>

	{#snippet actions()}
		<CwButton
			id="{uid}-close"
			variant="primary"
			onclick={() => {
				cancel();
				controller.manageOpen = false;
			}}
		>
			{m.action_close()}
		</CwButton>
	{/snippet}
</CwDialog>

<style>
	.manage-groups {
		display: flex;
		flex-direction: column;
		gap: var(--cw-space-3);
		min-width: min(28rem, 100%);
	}

	.manage-groups__hint,
	.manage-groups__empty {
		margin: 0;
		color: var(--cw-text-muted);
		font-size: var(--cw-text-sm);
	}

	.manage-groups__list {
		display: flex;
		flex-direction: column;
		margin: 0;
		padding: 0;
		list-style: none;
		border: 1px solid var(--cw-border-muted);
		border-radius: var(--cw-radius-lg);
	}

	.manage-groups__row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: var(--cw-space-2);
		padding: var(--cw-space-2) var(--cw-space-3);
	}

	.manage-groups__row + .manage-groups__row {
		border-top: 1px solid var(--cw-border-muted);
	}

	.manage-groups__name {
		min-width: 0;
		overflow-wrap: anywhere;
	}

	.manage-groups__rename,
	.manage-groups__confirm {
		display: flex;
		flex: 1 1 100%;
		flex-direction: column;
		gap: var(--cw-space-2);
	}

	.manage-groups__confirm p {
		margin: 0;
	}

	.manage-groups__buttons {
		display: flex;
		flex-wrap: wrap;
		justify-content: flex-end;
		gap: var(--cw-space-2);
	}
</style>
