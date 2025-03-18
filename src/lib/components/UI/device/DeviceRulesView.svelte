<script lang="ts">
	import DeleteRuleDialog from '$lib/components/dialogs/DeleteRuleDialog.svelte';
	import EditRuleDialog from '$lib/components/dialogs/EditRuleDialog.svelte';
	import ViewRuleDialog from '$lib/components/dialogs/ViewRuleDialog.svelte';
	import { nameToJapaneseName } from '$lib/utilities/nameToJapanese';
	import { mdiFunction, mdiPencil, mdiPlus } from '@mdi/js';
	import { format } from 'date-fns';
	import { Button, Icon, ListItem, Tooltip } from 'svelte-ux';

	let { rules, addRuleForm, subjects } = $props();
</script>

<h1 class="mb-1 flex w-full flex-row">
	<Icon data={mdiFunction} class="mr-2 items-center" />
	{nameToJapaneseName('Device Rules')}
	<span class="flex-grow"></span>
	<!-- <AddRuleDialog {addRuleForm} {subjects} /> -->
	<Tooltip title="+ Add New Rule" position="bottom">
		<Button icon={mdiPlus} variant="outline" href="settings/rules/new" />
	</Tooltip>
</h1>

<ul>
	{#each rules as rule}
		<ListItem
			title={rule.name}
			subheading={`Last Triggered: ${rule.last_triggered ? format(rule.last_triggered, 'yyyy/MM/dd @ HH:mm') : 'never'}`}
			avatar={{ class: 'bg-surface-content/50 text-surface-100/90' }}
		>
			<div slot="actions">
				<ViewRuleDialog {rule} />
				<Tooltip title="Edit Rule" position="bottom">
					<Button icon={mdiPencil} href={`settings/rules/${rule.id}`} color="warning" variant="outline" class="ml-5">
						<b class="hidden md:inline">Edit Rule</b>
					</Button>
				</Tooltip>
				<DeleteRuleDialog id={rule.id} />
			</div>
		</ListItem>
	{/each}
</ul>
