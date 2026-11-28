<script lang="ts">
	import { CwDropdown, type CwSelectAction } from '@cropwatchdevelopment/cwui';
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
		/** Id of the dropdown trigger. */
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

	// Without the organization neither a new group nor the list can be placed.
	let actions = $derived<CwSelectAction[]>(
		controller.canAdd
			? [
					{
						label: m.groups_add(),
						icon: addIcon,
						disabled,
						onclick: () => (controller.addOpen = true)
					},
					...(controller.manageable.length > 0
						? [
								{
									label: m.groups_manage(),
									icon: manageIcon,
									disabled,
									onclick: () => (controller.manageOpen = true)
								}
							]
						: [])
				]
			: []
	);
</script>

<!-- Inside the dropdown box, left of its arrow. The app's icons follow the text colour. -->
{#snippet addIcon()}
	<Icon src={ADD_ICON} class="h-5 w-5" />
{/snippet}

{#snippet manageIcon()}
	<Icon src={EDIT_ICON} class="h-5 w-5" />
{/snippet}

<CwDropdown
	labels={cwDropdownLabels()}
	{id}
	{name}
	{label}
	{options}
	{disabled}
	{actions}
	error={error || undefined}
	bind:value
/>
