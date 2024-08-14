<script lang="ts">
	import type { Tables } from "$lib/types/supabaseSchema";
	import { mdiEye, mdiPencil, mdiTrashCan } from "@mdi/js";
	import { Button, ListItem, Tooltip } from "svelte-ux";

    export let rules: Tables<'cw_rules'>[] = [];
</script>

<ul>
	{#each rules as rule}
		<ListItem title={rule.name} subheading="Subheading">
			<div slot="actions" class="flex flex-row gap-4">
				<Tooltip title="View rule">
					<Button icon={mdiEye} variant="fill" color="info" /></Tooltip
				>
				<Tooltip title="Edit rule">
					<Button icon={mdiPencil} variant="fill" color="warning" /></Tooltip
				>
				<Tooltip title="Delete rule">
					<Button icon={mdiTrashCan} variant="fill" color="danger" /></Tooltip
				>
			</div>
		</ListItem>
	{/each}
    {#if rules.length === 0}
        <ListItem title="There are no rules configured yet..." />
    {/if}
</ul>
