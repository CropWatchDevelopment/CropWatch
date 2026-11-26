<script lang="ts">
	import { CwButton, CwDropdown } from '@cropwatchdevelopment/cwui';
	import Icon from '#lib/components/Icon.svelte';
	import ADD_ICON from '#lib/images/icons/add.svg';
	import EDIT_ICON from '#lib/images/icons/edit.svg';
	import { cwDropdownLabels } from '#lib/i18n/cwuiLabels.ts';
	import { m } from '#lib/paraglide/messages.js';
	import type { GroupsController } from './groups-controller.svelte';

	interface Props {
		controller: GroupsController;
		/** The selected group's name; '' = no group. */
		value?: string;
		/** Form field name: set it inside a form so the action receives the name. */
		name?: string;
		/** Id of the dropdown trigger; the buttons derive theirs from it. */
		id: string;
		label?: string;
		error?: string;
		disabled?: boolean;
	}

	let {
		controller,
		value = $bindable(''),
		name,
		id,
		label = m.common_group(),
		error,
		disabled = false
	}: Props = $props();

	// A saved group the list does not hold (e.g. the list failed to load) stays
	// selectable, so opening and saving the form never drops it.
	let options = $derived([
		{ label: m.groups_none(), value: '' },
		...(value && !controller.names.includes(value) ? [{ label: value, value }] : []),
		...controller.names.map((groupName) => ({ label: groupName, value: groupName }))
	]);
</script>

<div class="group-picker">
	<CwDropdown
		labels={cwDropdownLabels()}
		{id}
		{name}
		{label}
		{options}
		{disabled}
		error={error || undefined}
		bind:value
	/>
	<!-- Without the organization neither a new group nor the list can be placed. -->
	{#if controller.canAdd}
		<div class="group-picker__actions">
			<CwButton
				id="{id}-add"
				variant="secondary"
				size="sm"
				{disabled}
				onclick={() => (controller.addOpen = true)}
			>
				<Icon src={ADD_ICON} />
				{m.groups_add()}
			</CwButton>
			{#if controller.manageable.length > 0}
				<CwButton
					id="{id}-manage"
					variant="ghost"
					size="sm"
					{disabled}
					onclick={() => (controller.manageOpen = true)}
				>
					<Icon src={EDIT_ICON} />
					{m.groups_manage()}
				</CwButton>
			{/if}
		</div>
	{/if}
</div>

<style>
	.group-picker {
		display: flex;
		flex-direction: column;
		gap: var(--cw-space-2);
		min-width: 0;
	}

	.group-picker__actions {
		display: flex;
		flex-wrap: wrap;
		gap: var(--cw-space-2);
	}
</style>
