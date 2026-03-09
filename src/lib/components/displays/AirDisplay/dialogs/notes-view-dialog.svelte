<script lang="ts">
	import { CwButton, CwDialog } from '@cropwatchdevelopment/cwui';
	import type { AirRow } from '../interfaces/AirRow.interface';

	let { row }: { row: AirRow } = $props();
	let open = $state(false);

	function formatCreatedAt(value: string): string {
		const parsed = new Date(value);
		return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
	}
</script>

<CwButton variant="secondary" onclick={() => (open = true)}>View Notes</CwButton>

<CwDialog
	{open}
	onclose={() => (open = false)}
	title={`View Notes for ${formatCreatedAt(row.created_at)}`}
>
	{#each row.cw_air_annotations as note (`${note.created_at}-${note.note}`)}
		<p>{formatCreatedAt(note.created_at)} - {note.note}</p>
	{/each}
	{#snippet actions()}
		<CwButton variant="secondary" onclick={() => (open = false)}>Cancel</CwButton>
	{/snippet}
</CwDialog>
