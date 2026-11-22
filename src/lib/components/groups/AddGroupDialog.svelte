<script lang="ts">
	import { CwButton, CwDialog, CwInput } from '@cropwatchdevelopment/cwui';
	import { cwInputLabels } from '$lib/i18n/cwuiLabels';
	import { m } from '$lib/paraglide/messages.js';
	import { GROUP_NAME_MAX_LENGTH, type GroupsController } from './groups-controller.svelte';

	interface Props {
		controller: GroupsController;
		/** The picker's value: set to the new group once it is added. */
		value?: string;
	}

	let { controller, value = $bindable('') }: Props = $props();

	const uid = $props.id();
	let name = $state('');
	let trimmed = $derived(name.trim());
	let tooLong = $derived(trimmed.length > GROUP_NAME_MAX_LENGTH);
	let canSubmit = $derived(trimmed.length > 0 && !tooLong && !controller.busy);

	async function add() {
		if (!canSubmit) return;
		const added = await controller.create(trimmed);
		if (added === null) return;
		value = added;
		name = '';
		controller.addOpen = false;
	}
</script>

<!-- Rendered outside the page's <form>: inside it, Enter in the name field
	 would submit the page's form instead of adding the group. -->
<CwDialog
	bind:open={controller.addOpen}
	title={controller.kind === 'location'
		? m.groups_add_title_location()
		: m.groups_add_title_device()}
	closeLabel={m.action_close()}
	onclose={() => (name = '')}
>
	<form
		id="{uid}-form"
		class="add-group"
		onsubmit={(event) => {
			event.preventDefault();
			void add();
		}}
	>
		<CwInput
			labels={cwInputLabels()}
			id="{uid}-name"
			label={m.groups_name_label()}
			placeholder={m.groups_name_placeholder()}
			hint={m.groups_add_hint()}
			error={tooLong ? m.groups_name_too_long({ max: String(GROUP_NAME_MAX_LENGTH) }) : undefined}
			autocomplete="off"
			bind:value={name}
		/>
	</form>

	{#snippet actions()}
		<CwButton
			variant="ghost"
			onclick={() => {
				name = '';
				controller.addOpen = false;
			}}
		>
			{m.action_cancel()}
		</CwButton>
		<CwButton
			type="submit"
			form="{uid}-form"
			variant="primary"
			loading={controller.busy}
			disabled={!canSubmit}
		>
			{m.groups_add_submit()}
		</CwButton>
	{/snippet}
</CwDialog>

<style>
	.add-group {
		display: flex;
		flex-direction: column;
		gap: var(--cw-space-3);
		min-width: min(24rem, 100%);
	}
</style>
